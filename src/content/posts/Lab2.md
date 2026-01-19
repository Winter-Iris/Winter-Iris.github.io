---
title: Lab2
published: 2026-01-19
pinned: false
description: ucore-lab2实验
image: ""
tags:
  - 操作系统
category: 操作系统
draft: false
---


# 物理地址空间

- 与空闲内存管理有关的数据区域存储在ucore内核结束之后。
- 内存管理之后的区域为空闲内存空间。
![7rLI8DwcgMQCB6O.png](https://s2.loli.net/2025/10/31/7rLI8DwcgMQCB6O.png)

# 逻辑地址空间

- 用户的可寻址地址范围为`0x00000000~0xffffffff`,分为用户程序地址空间`0x00000000~0xbffffffff`(3GB)和内核地址空间`0xc00000000~0xffffffff`(1GB)
- 内核物理地址空间为：`KERBASE=0xC0000000~KERBASE+KERMEMSIZE`
- 启动分页机制以前， `pa = la - KERBASE`（内核态）
- `pa`为物理地址，`la`为线性地址（逻辑地址）。

# 内存布局探测

- 在进行内存分配之前，**需要知道物理内存各内存块的信息**，通过内存布局探测完成。
- 在ucore操作系统**启动BIOS后，进入保护模式之前**，需要进行内存布局探测，调用`e820h`中断获取内存信息，它会将信息储存在一个映射结果并返回，保存在地址`0x8000`处。
- BIOS通过**系统内存映射描述符**来表示物理内存布局。其由3部分组成（共20字节）：
```
Offset Size      Description
00h    8Bytes    基地址
08h    8Bytes    大小
10h    4Bytes    类型
```
- 返回的映射结构如下
```c
struct e820map {
    int nr_map;   // 内存块数量=系统内存映射描述符表项数
    // 系统内存映射描述符表
    struct {
        uint64_t addr;  // 基地址
        uint64_t size;  // 大小
        uint32_t type;  // 类型
    } __attribute__((packed)) map[E820MAX]; 
};
```

## 调用`e820h`中断探测内存布局的过程

- 初始化
```ass
probe_memory:
    movl $0, 0x8000   # 将表项数设置为0
    xorl %ebx, %ebx   # 将ebx寄存器设置为0
    movw $0x8004, %di # 设置第一个表项需要存放的地址位置
```
    
- 探测
```
start_probe:
    movl $0xE820, %eax   # 设置E820中断号
    movl $20, %ecx       # 设置一个地址内存描述符的大小20字节
    movl $SMAP, %edx     # 设置edx为SMAP，用于E820中断调用
    int $0x15            # 发起0x15中断
    jnc cont             # 检查CF位是否为0
    
    # CF位不为0，错误处理：
    movw $12345, 0x8000  # 错误的表项数
    # 结束探测
    jmp finish_probe
    
# CF位为0，进行下一个地址内存描述符的探测
cont:
    addw $20, %di     # 设置下一个表项存放的地址位置（加一个表项的大小）
    incl 0x8000       # 将表项数递增加1
    cmpl $0, %ebx     # 比较ebx是否为0，如果为0探测结束，否则继续探测
    jnz start_probe   # 回到start_probe标签处
finish_probe:

    # Switch from real to protected mode, using a bootstrap GDT
    ......
```

- `ebx`寄存器的作用：若`ebx`寄存器为0，则说明已经处理完最后一个条项；若不为0，则说明还有条项需要探测。
- `CF`位的作用：用作**操作成功与否的标志**，若`CF` 为0则说明调用成功，否则说明调用失败。

# 空闲内存管理

- ucore维护空闲内存块的数据结构：
```c
typedef struct {
    list_entry_t free_list;         // the list header
    unsigned int nr_free;           // # of free pages in this free list
} free_area_t;

struct list_entry {
    struct list_entry *prev, *next;
};
```
- 可见ucore使用一个带头节点的**双向循环链表**来维护空闲内存块。
- 与使用链表的内存管理方案类似。

 - 不同之处在于：
	 - ucore使用的是双向循环链表，而课上方案是单向链表
	 - ucore使用了分页机制，将循环链表的指针域作为其内存块`page`结构的一部分，还维护了当前页框的状态，正在使用此页框的进程数，连续的空闲块数量等属性。从`page`所属的页框号可以完成到物理地址的转化，由于页框大小固定，可以通过`property`属性计算块大小，而不必单独维护这两个(物理地址和块大小)属性。
	 - ucore是对分页后的空闲内存块进行单独管理，**每一空闲块的大小固定为页面大小**。单链表方案则是每一个节点**可能是进程可能是空闲块**按地址排序管理，每一节点的**大小不是固定**的

# `Page`结构（块描述符）

```c
struct Page {
    int ref;                  // 有页表项引用了此页          
    uint32_t flags;           // 表示该页框的状态(是否空闲)，最后两位01，10
    unsigned int property;    // 以此页框开始的连续的空闲页框数量
    list_entry_t page_link;   // 双向循环链表指针域
};
```

- `flag`：用于确定该页框的状态，第0位为是否空闲的标志，第一位为`property`属性是否有效的标志
```c
#define PG_reserved                 0       
#define PG_property                 1       
```
- 当`flag`的`PG_reserved`位（第0位）为1表示该块被预留，非空闲，不可用；
- 反之，为0时表示该块没有被预留，是空闲块，可用。
- `property`字段的作用：如果该页面是连续空闲页的第一页，表示此页框开始的连续的空闲页框数量
- 当`flag`的`PG_property`位（第1位）为1表示`property`属性有效，反之无效。
- 总结：看`flag`的最后两位判断页状态，`01`非空闲不可用，`10`空闲可用
- 可以通过ucore定义的宏函数进行管理

```c
// 设置该位
#define SetPageProperty(page)       set_bit(PG_property, &((page)->flags))
// 清空该位
#define ClearPageProperty(page)     clear_bit(PG_property, &((page)->flags))
// 判断该位是否为1
#define PageProperty(page)          test_bit(PG_property, &((page)->flags))
```

# 内存管理初始化流程

1. **初始化物理内存管理器**
	- `init_pmm_manager()`
	- **`pmm_manager`，（`pmm_manager`用于管理内存块）。
	- `pmm_manager`类结构
```c
struct pmm_manager {
	// 名字
    const char *name;                
    // 初始化函数                 
    void (*init)(void);                              
    // 初始化内存映射表
    void (*init_memmap)(struct Page *base, size_t n); 
    // 分配物理块
    struct Page *(*alloc_pages)(size_t n);      
    // 释放物理块      
    void (*free_pages)(struct Page *base, size_t n);  
    // 获取空闲块数
    size_t (*nr_free_pages)(void);             
    // 测试       
    void (*check)(void);                              
};
```

2. **初始化物理内存块描述符表，建立空闲块链表**
	- `page_init():`
	-  **检测并初始化物理内存**：根据物理内存探测的结果获取内存每一块的情况信息，建立内存块的块描述符表，建立空闲块链表。
	- 将内存地址空间`0~maxpa`分成若干块，建立每一块的`page`信息存储在`pages`表中，初始化每一块为已分配状态，然后再建立空闲块链表。
3.  **创建页目录表(PDT)**
	- 分配一个物理页作为页目录表（PDT）
4.  **建立映射关系**：
	- 将物理内存`0~KMEMSIZE`映射到虚拟地址`KERNBASE~KERNBASE+KMEMSIZE`
5.  **启用分页机制**
6.  **重新初始化GDT**

- 初始化后就可以通过`get_page()`函数，将逻辑地址转化为物理地址。

# 宏定义

- 逻辑地址`la`结构
```
31                22 21              12 11               0
+-------------------+------------------+------------------+
|   页目录索引(10位)  |   页表索引(10位)  |   页内偏移(12位)  |
+-------------------+------------------+------------------+
```
- PTE（页表项）结构
```
// PTE的位域含义：
31-12位: 物理页框地址的高20位
11-9位:  保留位
8位:     G (Global) - 全局页面
7位:     PAT (Page Attribute Table) - 页属性
6位:     D (Dirty) - 脏页标志
5位:     A (Accessed) - 已访问
4位:     PCD (Cache Disable) - 缓存禁用
3位:     PWT (Write Through) - 透写
2位:     U/S (User/Supervisor) - 用户/管理员权限
1位:     R/W (Read/Write) - 读写权限
0位:     P (Present) - 存在位
```
- PDE（页目录项）结构
```
PDE的位域含义：
31-12位: 页表物理地址的高20位
11-9位:  保留位
8位:     G (Global) - 全局页面
7位:     PS (Page Size) - 页大小(0=4KB)
6位:     保留
5位:     A (Accessed) - 已访问
4位:     PCD (Cache Disable) - 缓存禁用
3位:     PWT (Write Through) - 透写
2位:     U/S (User/Supervisor) - 用户/管理员权限
1位:     R/W (Read/Write) - 读写权限
0位:     P (Present) - 存在位
```

##  `mmu.h`

```c
// 定义页目录索引和页表索引在逻辑地址的偏移量
#define PTXSHIFT        12                    
#define PDXSHIFT        22

// 页表项的存在位，可写位，用户位
#define PTE_P           0x001                   // Present
#define PTE_W           0x002                   // Writeable
#define PTE_U           0x004                   // User

// 获取逻辑地址la的页目录索引PDX
#define PDX(la) ((((uintptr_t)(la)) >> PDXSHIFT) & 0x3FF)

// 获取逻辑地址la的页表索引PTX
#define PTX(la) ((((uintptr_t)(la)) >> PTXSHIFT) & 0x3FF)

// 获取逻辑地址la的页号部分（高二十位）
#define PPN(la) (((uintptr_t)(la)) >> PTXSHIFT)

// 获取逻辑地址的页内偏移
#define PGOFF(la) (((uintptr_t)(la)) & 0xFFF)

// 从页表项中提取物理地址部分
#define PTE_ADDR(pte)   ((uintptr_t)(pte) & ~0xFFF) 
// & ~0xFFF，保留物理地址的高20位，清除所有标志位

// 从页目录项中提取物理地址部分
#define PDE_ADDR(pde)   PTE_ADDR(pde)
```
##  `pmm.h
`
- **将内核虚拟地址(kernel virtual address)转换为物理地址**
```c
#define PADDR(kva) ({                                                   \
	uintptr_t __m_kva = (uintptr_t)(kva);                       \
	if (__m_kva < KERNBASE) {                                   \
		panic("PADDR called with invalid kva %08lx", __m_kva);  \
	}                                                           \
	__m_kva - KERNBASE;                                         \
})
```
- **将物理地址转化为内核虚拟地址**
```c
#define KADDR(pa) ({                                                    \
	uintptr_t __m_pa = (pa);                                    \
	size_t __m_ppn = PPN(__m_pa);                               \
	if (__m_ppn >= npage) {                                     \
		panic("KADDR called with invalid pa %08lx", __m_pa);    \
	}                                                           \
	(void *) (__m_pa + KERNBASE);                               \
})
```
- 一些静态函数
```c
// 将块描述符转为对应的页号（减去数组首地址）
static inline ppn_t
page2ppn(struct Page *page) {
    return page - pages;
}

// 块描述符转物理地址
// 先转成块号然后右移对应的偏移量（块号对应物理地址中的高20位）
static inline uintptr_t
page2pa(struct Page *page) {
    return page2ppn(page) << PGSHIFT;
}

// 物理地址转块描述符
static inline struct Page *
pa2page(uintptr_t pa) {
	// 先转成块号查看是否越界
    if (PPN(pa) >= npage) {
        panic("pa2page called with invalid pa");
    }
    // 返回在块描述符表里该PPN对应的项地址
    return &pages[PPN(pa)];
}

// 块描述符转内核虚拟地址
static inline void *
page2kva(struct Page *page) {
    return KADDR(page2pa(page));
}

// 内核虚拟地址转块描述符
static inline struct Page *
kva2page(void *kva) {
    return pa2page(PADDR(kva));
}

// 页表项转块描述符
static inline struct Page *
pte2page(pte_t pte) {
	// 检查是否存在
    if (!(pte & PTE_P)) {
        panic("pte2page called with invalid pte");
    }
    
    return pa2page(PTE_ADDR(pte));
}

  // 页目录项转块描述符
static inline struct Page *
pde2page(pde_t pde) {
    return pa2page(PDE_ADDR(pde));

}
```


## `memlayout.h`

- 与`Page`的属性设置相关
```c
// 设置块的预留位1
#define SetPageReserved(page)       set_bit(PG_reserved, &((page)->flags))

// 清空块的预留位
#define ClearPageReserved(page)     clear_bit(PG_reserved, &((page)->flags))

// 判断块的预留位是否为1
#define PageReserved(page)          test_bit(PG_reserved, &((page)->flags))

// 设置块的property有效位，功能同上
#define SetPageProperty(page)       set_bit(PG_property, &((page)->flags))
#define ClearPageProperty(page)     clear_bit(PG_property, &((page)->flags))
#define PageProperty(page)          test_bit(PG_property, &((page)->flags))
```
- 将空闲块链表转化为对应的块描述符
```c
#define le2page(le, member)                 \
    to_struct((le), struct Page, member)
```
- **已知结构体中某个成员的指针，求出整个结构体的起始地址**。
```c   
// -- 通过结构体成员指针反推整个结构体起始地址 --

// 通过成员指针求出整个结构体的指针。（减去成员在结构体中的偏移量）
#define to_struct(ptr, type, member)                               \
    ((type *)((char *)(ptr) - offsetof(type, member)))
    
// 获取type类型的成员member在type的地址空间内的偏移量
#define offsetof(type, member)                                      \
    ((size_t)(&((type *)0)->member))
```

# 内存管理初始化具体函数结构

##  `page_init`函数结构：建立块描述符表

```c
// 初始化物理块描述符
static void
page_init(void) {
	// 获取0x8000处的内存探测结果映射表
    struct e820map *memmap = (struct e820map *)(0x8000 + KERNBASE);
    
    // -- 获取最大地址（获取内存实际大小）--
    uint64_t maxpa = 0;

    cprintf("e820map:\n");
    int i;
    // 对物理内存描述符表的每一项进行遍历
    for (i = 0; i < memmap->nr_map; i ++) {
    // 获取起始地址和结束地址
        uint64_t begin = memmap->map[i].addr, end = begin + memmap->map[i].size;
        cprintf("  memory: %08llx, [%08llx, %08llx], type = %d.\n",
                memmap->map[i].size, begin, end - 1, memmap->map[i].type);
    // 检测类型是否为未分配的区域
        if (memmap->map[i].type == E820_ARM) {
	        // 更新内存大小的上界（舍去超过内核区域的部分）
            if (maxpa < end && begin < KMEMSIZE) {
                maxpa = end;
            }
        }
    }
    // 舍去超过内核区域的部分
    if (maxpa > KMEMSIZE) {
        maxpa = KMEMSIZE;
    }
	
	// 此时获取到的可寻址物理地址空间为0~maxpa
	// 获取ucore程序的结束地址，接下去是pmm管理区
    extern char end[];
	
	// -- 将物理地址空间分页 --
	
	// 计算要分的页数量
    npage = maxpa / PGSIZE;
    // 将end地址按页面大小向上对齐，获取第一个页框的指针
    pages = (struct Page *)ROUNDUP((void *)end, PGSIZE);
	
	// 设置每一个页框的预留位1，即已分配（分配pmm区）
    for (i = 0; i < npage; i ++) {
        SetPageReserved(pages + i);
    }
	
	// -- 建立空闲块链表 --
	
	// 计算空闲内存区的起始地址（pmm区之后），将逻辑地址转化为物理地址（PADDR）
    uintptr_t freemem = PADDR((uintptr_t)pages + sizeof(struct Page) * npage);

	// 借用内存探测结果遍历表
    for (i = 0; i < memmap->nr_map; i ++) {
	    // 获取区域的起始地址和结束地址
        uint64_t begin = memmap->map[i].addr, end = begin + memmap->map[i].size;
        if (memmap->map[i].type == E820_ARM) {
	         // 如果是空闲块
            if (begin < freemem) {
	            // 开始地址在空闲内存区之前，设置begin
                begin = freemem;
            }
            if (end > KMEMSIZE) {
	            // 结束部分高于内核大小，设置end
                end = KMEMSIZE;
            }
            if (begin < end) {
	            // 将起始地址按页面大小向上对齐
                begin = ROUNDUP(begin, PGSIZE);
                // 将结束部分地址按页面大小向下对齐
                end = ROUNDDOWN(end, PGSIZE);
                if (begin < end) {
	                // 把起始地址开始的一组n个空闲块进行初始化
                    init_memmap(pa2page(begin), (end - begin) / PGSIZE);
                }
            }
        }
    }
}
```


## `default_init_memmap`函数结构

- 将一个由`n`个页框组成的空闲物理地址空间进行初始化，**即更新块描述符状态为空闲，初始化，加入空闲块链表**。
```c
// 把n个连续的空闲块（起始地址为base）进行初始化
static void
default_init_memmap(struct Page *base, size_t n) {
	// 确保n>0
    assert(n > 0);
    struct Page *p = base;
    // 遍历每一个空闲块的物理块描述符
    for (; p != base + n; p ++) {
	    // 确保为已分配状态（开始时的初始化全部设置为已分配）
        assert(PageReserved(p));
        // 设置为空闲，可分配状态
        p->flags = 0;
        // 设置property有效
        SetPageProperty(p);
        // 设置property为0
        p->property = 0;
        // 设置引用数为0
        set_page_ref(p, 0);
        // 往空闲区链表最后加入此块
        list_add_before(&free_list, &(p->page_link));
    }
    // 空闲区链表空闲块数量+n
    nr_free += n;
    // 设置起始块的property为n（有连续n个空闲块）
    base->property = n;
}
```

## `default_alloc_pages`函数结构

- **页面分配算法**（**首次适应**）

```c
static struct Page *
default_alloc_pages(size_t n) {
	// 确保n>0
    assert(n > 0);
    // 是否有足够的空闲块，没有则分配失败
    if (n > nr_free) {
        return NULL;
    }
    list_entry_t *le, *len;
    le = &free_list; // 指向表头
	// 遍历空闲块链表每一项
    while((le=list_next(le)) != &free_list) {
		// 当前指向的链表表项的块描述符
      struct Page *p = le2page(le, page_link);
      // 当连续的空闲块足够大时分配空闲块
      if(p->property >= n){
        int i;
        // 连续分配n个空闲页框
        for(i=0;i<n;i++){
          // 当前链表项的下一项
          len = list_next(le);
          // 当前链表项的块描述符
          struct Page *pp = le2page(le, page_link);
          // 设置当前页面状态为预留，已分配
          SetPageReserved(pp);
          // 清除Property有效位
          ClearPageProperty(pp);
          // 从空闲块链表中删除该项
          list_del(le);
          // 获取下一项链表项
          le = len;
        }
        // 如果有剩余空闲块
        if(p->property>n){
	        // 更新该剩余空闲块头的property属性
          (le2page(le,page_link))->property = p->property - n;
        }
        // 更新分配块头的属性
        ClearPageProperty(p);
        SetPageReserved(p);
        // 更新链表数
        nr_free -= n;
        // 返回分配块头
        return p;
      }
    }
    // 没有连续的n个空闲块，返回空。
    return NULL;
}
```

##  `default_free_pages`函数结构：

- **页面回收算法**。**错误部分**：只回收了空闲块的首块，后面的块状态未更新。
```c
static void
default_free_pages(struct Page *base, size_t n) {
    assert(n > 0);
    assert(PageReserved(base));
    
    list_entry_t *le = &free_list;
    struct Page * p;
    // 遍历空闲块链表
    while((le=list_next(le)) != &free_list) {
      p = le2page(le, page_link);
      // 找到第一个p>base链表项对应的块
      if(p>base){
        break;
      }
    }
    //list_add_before(le, base->page_link);
    // 插入每一个空闲块到刚刚找到的那一项之前
    for(p=base;p<base+n;p++){
      list_add_before(le, &(p->page_link));
    }
    // 只设置了base的状态，而没有设置其他空闲块的状态
    // 设置base状态
    base->flags = 0;  // 设置为空闲
    set_page_ref(base, 0); // 设置ref为0
    ClearPageReserved(base); // 设置property属性
    SetPageProperty(base);
    base->property = n; 
    
    // 获取当前块的下邻
    p = le2page(le,page_link) ; 
    // 如果下邻也空闲，合并空闲块
    if( base+n == p ){
      base->property += p->property;
      p->property = 0;
    }
    
    
    // 获取当前块的上邻
    le = list_prev(&(base->page_link));
    p = le2page(le, page_link);
    // 如果上邻空闲则合并
    if(le!=&free_list && p==base-1){
	    // 找到上邻空闲块的起始头
      while(le!=&free_list){
        if(p->property){
          p->property += base->property;
          base->property = 0;
          break;
        }
        le = list_prev(le);
        p = le2page(le,page_link);
      }
    }
    // 更新空闲块数
    nr_free += n;
    return ;
}
```
- 修复错误部分
```c
struct Page * pp;
for(pp = base;pp<base+n;pp++) {
  pp->flags = 0;
  set_page_ref(pp,0);
  ClearPageProperty(pp);
  SetPageProperty(pp);
  pp->property = (pp == base? n : 0);
}
```

## 初始化物理内存总入口

```c
void
pmm_init(void) {
    // 初始化物理内存管理器
    init_pmm_manager();
    // 初始化空闲块链表
    page_init();
    // 检测分配算法的正确性
    check_alloc_page();
    // 创建二级页表
    // 申请目录页表（返回逻辑地址）
    boot_pgdir = boot_alloc_page();
    // 初始化目录
    memset(boot_pgdir, 0, PGSIZE);
    // 目录页表的逻辑地址转成物理地址，存储到cr3页目录表寄存器中
    boot_cr3 = PADDR(boot_pgdir);
	// 检查页目录正确性
    check_pgdir();
	
    static_assert(KERNBASE % PTSIZE == 0 && KERNTOP % PTSIZE == 0);

    // 建立映射关系
    boot_pgdir[PDX(VPT)] = PADDR(boot_pgdir) | PTE_P | PTE_W;

    // 通过页目录表建立地址映射关系
    // 将KERBASE~KERBASE+KMEMSIZE的逻辑地址空间映射到0~KMEMSIZE的物理地址空间
    boot_map_segment(boot_pgdir, KERNBASE, KMEMSIZE, 0, PTE_W);

    // 临时映射：（每个页目录项控制4MB的地址空间）（对启用分页机制有用）
    // 虚拟地址 0x00000000 ~ 0x003FFFFF  →  物理地址 0x00000000 ~ 0x003FFFFF
    // 虚拟地址 0xC0000000 ~ 0xC03FFFFF  →  物理地址 0x00000000 ~ 0x003FFFFF
    boot_pgdir[0] = boot_pgdir[PDX(KERNBASE)];
	
	// 启用分页机制
    enable_paging();
	// 初始化GDT
    gdt_init();
    // 清空0~4M的临时映射
    boot_pgdir[0] = 0;

	// 建立完毕，检查
    check_boot_pgdir();
    print_pgdir();
}
```

##  `get_pte`函数结构

- 根据线性地址获取页表表项的函数：
- 输入：
	- 页目录`pgdir`
	- 线性地址`la`
	- 若对应的页表项不存在是否创建对应页表项`create`
- 返回：
	- 对应的页目录描述符地址
```c
pte_t *
get_pte(pde_t *pgdir, uintptr_t la, bool create) {
	// 获取页目录描述符
	// PDX(la):获取la的高十位，即页目录号
    pde_t *pdep = &pgdir[PDX(la)];
    // 查看存在位，对应的页表是否存在内存中
    if (!(*pdep & PTE_P)) {
	    // 不在内存中，则申请分配
        struct Page *page;
        if (!create || (page = alloc_page()) == NULL) {
            return NULL;
        }
        // 设置ref为1
        set_page_ref(page, 1);
        // 获取申请的物理地址
        uintptr_t pa = page2pa(page);
        // 对这个块初始化，即清零。
        memset(KADDR(pa), 0, PGSIZE);
        // 设置这个页表项（物理地址，低三位设置为111）
        // 设置：存在，可读写，用户可访问
        *pdep = pa | PTE_U | PTE_W | PTE_P;
    }
    // 返回页表表项的起始地址
    // PDE_ADDR(*pdep) 取出这个页目录项中的物理地址即页表索引
    // KADDR(PDE_ADDR(*pdep)) 获取页表索引的内核虚拟地址
    // &((pte_t *)KADDR(PDE_ADDR(*pdep))) 获取对应的页表初始地址
    //在对应的页表中根据la中的页表索引取出对应的页表项。
    // &((pte_t *)KADDR(PDE_ADDR(*pdep)))[PTX(la)] 
    return &((pte_t *)KADDR(PDE_ADDR(*pdep)))[PTX(la)];
}
```

##  `get_page` 

- 获取逻辑地址`la` 对应的物理块描述符（物理页面/页框）
- 输入：
	- 页目录`pgdir`
	- 线性地址`la`
	- 用于储存得到的页表项的指针`ptep_store`
- 返回：
	- 对应的块描述符`Page`
```c
struct Page *
get_page(pde_t *pgdir, uintptr_t la, pte_t **ptep_store) {
	// 首先获取la对应的页表项
    pte_t *ptep = get_pte(pgdir, la, 0);
    // 将找到的页表项指针储存
    if (ptep_store != NULL) {
        *ptep_store = ptep;
    }
    // 如果该块存在于内存中，返回对应的块描述符
    if (ptep != NULL && *ptep & PTE_P) {
        return pa2page(*ptep);
    }
    // 否则获取失败
    return NULL;
}
```

##  `boot_map_segment` 函数结构

- 建立分页映射
```c
// 在页目录表pgdir，将 la~la+size 映射到 pa~pa+size
static void
boot_map_segment(pde_t *pgdir, uintptr_t la, size_t size, uintptr_t pa, uint32_t perm) {
	// 确保la与pa的页内偏移相同，为了实现实现线性映射，即满足la = pa + offset
    assert(PGOFF(la) == PGOFF(pa));
    // 计算一共需要映射多少页
    size_t n = ROUNDUP(size + PGOFF(la), PGSIZE) / PGSIZE;
    // 将la，pa按页面大小向下对齐
    la = ROUNDDOWN(la, PGSIZE);
    pa = ROUNDDOWN(pa, PGSIZE);
    // 建立每一页的映射关系
    for (; n > 0; n --, la += PGSIZE, pa += PGSIZE) {
	    // 获取la对应的页表项（1表示若不存在则创建）
        pte_t *ptep = get_pte(pgdir, la, 1);
        assert(ptep != NULL);
        // 设置页表项：物理地址，存在，页面权限perm
        *ptep = pa | PTE_P | perm;
    }
}
```

# 可能的物理块管理优化方案

- 建立类似于快表的物理块缓冲区。
- 将常用大小的页面块（如1页，2页，4页，等）存储在缓冲区里，获取时直接从缓冲区获取，不必再扫描空闲块链表。

## 设计方案

- 请求分配内存时：
	- 先检查分配内存的大小是否存在于缓冲区索引中。
	- 若存在对应的缓冲区且非空，取出一个返回。$O(1)$
	- 如果不存在对应的缓冲区，则使用页面分配算法找到合适的区域。
- 释放内存时：
	- 先检查释放内存的大小是否存在于缓冲区索引中。
	- 若存在且未满，将该内存块释放后放入对应的缓冲区中。这样后续的相同大小分配就能直接从缓存获取。
	- 否则就使用页面回收算法将其释放。

# 下次适应分配算法的实现

```c
static list_entry_t *rem = &free_list;

static struct Page *
next_fit_alloc_pages(size_t n) {
    assert(n > 0);
    if (n > nr_free) {
        return NULL;
    }
	if(list_empty(&free_list)) return NULL;
	// 如果rem指向链表头，则取第一项真正的节点。
	if(rem == &free_list) rem = list_next(rem);

    list_entry_t *le = rem, *len;
    struct Page *p = NULL;

    // 搜索合适的空闲块
    while (1) {
        p = le2page(le, page_link);
        if (p->property >= n) {
            break;
        }
        le = list_next(le);
        if (le == rem) {  // 搜索完一圈
            return NULL;
        }
    }

    // 分配页面
    int i;
    for (i = 0; i < n; i++) {
        len = list_next(le);
        struct Page *pp = le2page(le, page_link);
        SetPageReserved(pp);
        ClearPageProperty(pp);
        list_del(le);
        le = len;
    }

    // 处理剩余块
    if (p->property > n) {
        struct Page *remaining = le2page(le, page_link);
        remaining->property = p->property - n;
        SetPageProperty(remaining);
        ClearPageReserved(remaining);
    }

    // 更新 rem
    rem = le;
    if (rem == &free_list) {
        rem = list_next(rem);
    }

    nr_free -= n;
    return p;
}
```

- 注意重置空闲块链表时要重置rem指针为链表头！（`basic_check`未实现，测试会不通过）

# 最佳适应分配算法的实现


```c
static struct Page *
best_fit_alloc_pages(size_t n) {
    assert(n>0);
    if(nr_free < n) {
        return NULL;
    }
    // 记录要分配的链表项指针和该块的大小
    list_entry_t *le = &free_list,*to_alloc = NULL,*len;
    size_t minsize = 0x3f3f3f3f;
    while((le = list_next(le)) != &free_list) {
        struct Page* p =le2page(le,page_link);
        // 不够大则跳过
        if(p->property < n) continue;
        // 如果该块比要分配的块大小还要小，则更新要分配的块
        if(p->property < minsize) {
            minsize = p->property;
            to_alloc = le;
        } 
    }
    struct Page * pg = le2page(to_alloc,page_link);
    // 如果块无效，分配失败
    if(to_alloc == NULL || pg->property < n) 
        return NULL;
    // 分配块
    le = to_alloc;
    int i;
    for(i=0;i<n;i++) {
        len = list_next(le);
        struct Page * pp = le2page(le,page_link);
        SetPageReserved(pp);
        ClearPageProperty(pp);
        list_del(le);
        le = len;
    }
    // 剩余空闲块
    if(pg->property>n) {
        le2page(le,page_link)->property = pg->property - n;
    }
    nr_free -= n;
    return pg;
}
```
