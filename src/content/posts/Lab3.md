---
title: Lab3
published: 2026-01-19
pinned: false
description: ucore-lab3实验
image: ""
tags:
  - 操作系统
category: 操作系统
draft: false
---

# 重要数据结构

- 用于模拟用户进程的虚拟内存空间`vma`，`mm`用以管理一个进程的所有`vma`
- `mm_struct`
```c
struct mm_struct {
    list_entry_t mmap_list;        // 双向链表头，链接所有属于一个进程的vma
    struct vma_struct *mmap_cache; // 当前使用的vma，支持访问的局部性
    pde_t *pgdir;                  // 指向对应的页表
    int map_count;                 // vma数量
    void *sm_priv;                 // 用于链接记录访问情况的链表头（用于置换算法）
};
```
- `vma_struct`
```c
// vma虚拟内存空间（连续的虚拟内存空间）
struct vma_struct {
    struct mm_struct *vm_mm; // 虚拟内存空间所属的进程
    uintptr_t vm_start;      // 开始地址  
    uintptr_t vm_end;        // 结束地址
    uint32_t vm_flags;       // 访问权限
    list_entry_t list_link;  // 双向链表（从小到大排列）
};
```
- `vm_flags`相关宏
```c
// 可读
#define VM_READ                 0x00000001
// 可写
#define VM_WRITE                0x00000002
// 可执行
#define VM_EXEC                 0x00000004
```

- 段页式存储管理：一个进程的虚拟地址空间被分为若干个`vma`段，它们由`mm_struct`进行统一管理。对于`vma`中的虚拟地址，通过二级页表进行映射，映射到物理地址。
- 与理论的不同之处：
	- 理论上分段是根据程序逻辑分成，代码段，数据段，堆栈段，等等，而ucore是分成若干个 `vma` 段，而同一个进程的若干个`vma`，由`mm_struct`统一管理。
	- 理论上分成的不同段由段寄存器储存段表，通过段选择子记录的段基址进行地址转化，找到该段对应的页表；而ucore在 bootasm.S 中设置：代码段：基址 0x0, 界限 0xFFFFFFFF数据段：基址 0x0, 界限 0xFFFFFFFF，由于段基址都是 0，实际上： 逻辑地址 = 线性地址 = 虚拟地址，直接通过二级页表映射到物理地址


- 修改后的 `page`
```c
struct Page {
    int ref;                        // 被引用的数量
    uint32_t flags;                 // 表示该页框的状态(是否空闲)，最后两位01，10
    unsigned int property;          // 连续的空闲块数量
    list_entry_t page_link;         // 空闲块链表域
    
    list_entry_t pra_page_link;     // 页面置换算法所需（链表项）
    uintptr_t pra_vaddr;            // 页面置换算法所需（访问此虚拟地址发生缺页）
}
```

- 其中新增了
	- ` list_entry_t pra_page_link`：将Page串起来，建立用于页面置换算法维护的链表数据结构
	- `uintptr_t pra_vaddr`：记录了对应的虚拟地址（访问此虚拟地址发生了缺页）

# 页目录项页(PDE)和页表目录项(PTE)

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

- 其中，访问位，修改位，等记录页是否访问过，是否修改过的状态可以为页面置换算法提供信息支持。

# 未映射的页表表项与被换出页的页表表项区分


- 当页面从来没有映射过，则页表项32位全是0
- 如果是被淘汰的页面，则其前24位（对应`swap`区的`offset`）不是0，存在位为0.
- 被淘汰后的页面PTE组成：
	- `offset:24 bits`，`reserved: 7bits`，`pre:0 (1 bit)`
	- 前24位对应交换区的索引位置，最后一位存在位为0

# 缺页中断的产生和处理

## 缺页中断的产生原因

- 目标页面不存在。
- 目标页面不在内存中。
- 访问权限不符合。
## 处理

尝试缺页异常后，CPU将发生异常的线性地址装入寄存器CR2中，将错误码发送给中断服务例程，进行相应处理

```c
trap_dispatch(struct trapframe *tf) {
    char c;
    int ret;
    switch (tf->tf_trapno) {
    case T_PGFLT:  //page fault
        if ((ret = pgfault_handler(tf)) != 0) {
            print_trapframe(tf);
            panic("handle pgfault failed. %e\n", ret);
        }
        break;
    ...
}
```
调用`pgfault_handler`函数处理缺页中断
```c
static int
pgfault_handler(struct trapframe *tf) {
    extern struct mm_struct *check_mm_struct;
    print_pgfault(tf);
    if (check_mm_struct != NULL) {
	    // 处理缺页中断(mm_struct信息，错误码，错误地址)
        return do_pgfault(check_mm_struct, tf->tf_err, rcr2());
    }
    panic("unhandled page fault.\n");
}
```
- 处理缺页中断的函数
```c
int
do_pgfault(struct mm_struct *mm, uint32_t error_code, uintptr_t addr) {
    int ret = -E_INVAL;
    // 找到错误地址所在vma
    struct vma_struct *vma = find_vma(mm, addr);
    pgfault_num++;
	// 检查错误地址是否合法
    if (vma == NULL || vma->vm_start > addr) {
        cprintf("not valid addr %x, and  can not find it in vma\n", addr);
        goto failed;
    }
	// 处理访问权限引起的中断
    switch (error_code & 3) {
    default:
    case 2: 
	    // 程序尝试向一个虚拟地址写入，但该地址对应的页面不在内存中。
	    // vma必须具有可写权限
        if (!(vma->vm_flags & VM_WRITE)) {
            cprintf("do_pgfault failed: error code flag = write AND not present, but the addr's vma cannot write\n");
            goto failed;
        }
        break;
    case 1: 
	    // 程序尝试读取一个虚拟地址，但页面表显示页面已在内存中，异常
        cprintf("do_pgfault failed: error code flag = read AND present\n");
        goto failed;
    case 0: 
	    // 程序尝试读取或执行一个虚拟地址，但该地址对应的页面不在内存中。
	    // vma必须可读可执行
        if (!(vma->vm_flags & (VM_READ | VM_EXEC))) {
            cprintf("do_pgfault failed: error code flag = read AND not present, but the addr's vma cannot read or exec\n");
            goto failed;
        }
    }
    // 设置权限
    uint32_t perm = PTE_U;
    if (vma->vm_flags & VM_WRITE) {
        perm |= PTE_W;
    }
    addr = ROUNDDOWN(addr, PGSIZE);
    ret = -E_NO_MEM;
    pte_t *ptep=NULL;
    // 获取页表项，如果不存在则创建对应页表项（参数：1）
    if ((ptep = get_pte(mm->pgdir, addr, 1)) == NULL) {
        cprintf("get_pte in do_pgfault failed\n");
        goto failed;
    }
    // 如果页表项为空，说明是从未进入内存的情况
    if (*ptep == 0) { 
        if (pgdir_alloc_page(mm->pgdir, addr, perm) == NULL) {
            cprintf("pgdir_alloc_page in do_pgfault failed\n");
            goto failed;
        }
    }
    else { 
    //页面表项非空，页面被换出到磁盘
        if(swap_init_ok) {
            struct Page *page=NULL;
            // 从交换区换入页面
            if ((ret = swap_in(mm, addr, &page)) != 0) {
                cprintf("swap_in in do_pgfault failed\n");
                goto failed;
            }    
            // 重新建立映射
            page_insert(mm->pgdir, page, addr, perm);
            // 标记为可交换
            swap_map_swappable(mm, addr, page, 1);
            // 记录虚拟地址
            page->pra_vaddr = addr;
        }
        else {
            cprintf("no swap_init_ok but ptep is %x, failed\n",*ptep);
            goto failed;
        }
   }
   ret = 0;
failed:
    return ret;
}
```

- 与理论的不同之处在于
	- 理论上的缺页处理直接在页表上完成，是直接以页框为基本单位，而ucore则多出了`vma`，`mm`的数据结构对地址进行抽象。
	- ucore设置了专门的交换区域进行页面交换，将淘汰的页面数据存储在交换区中等待下次换入。


# 交换区设计

## 交换区目录结构

```
/* *
 * swap_entry_t
 * --------------------------------------------
 * |         offset        |   reserved   | 0 |
 * --------------------------------------------
 *           24 bits            7 bits    1 bit
 * */
```

## 交换管理类

```c
struct swap_manager
{
     const char *name;
     /* 管理器全局初始化 */
     int (*init)            (void);
     /* 初始化进程内存结构 */
     int (*init_mm)         (struct mm_struct *mm);
     /* 时钟中断处理 */
     int (*tick_event)      (struct mm_struct *mm);
     // 标记页面可交换
     int (*map_swappable)   (struct mm_struct *mm, uintptr_t addr, struct Page *page, int swap_in);
     // 标记页面不可交换
     int (*set_unswappable) (struct mm_struct *mm, uintptr_t addr);
     // 选择要淘汰的页面进行交换
     int (*swap_out_victim) (struct mm_struct *mm, struct Page **ptr_page, int in_tick);
     // 测试检查
     int (*check_swap)(void);    
};
```
## 换入

```c
int
swap_in(struct mm_struct *mm, uintptr_t addr, struct Page **ptr_result)
{
	 // 分配一个页面 
     struct Page *result = alloc_page();
     assert(result!=NULL);
     // 获取引发缺页的虚拟地址的页表项
     pte_t *ptep = get_pte(mm->pgdir, addr, 0);
     // 从交换区读取要换入的页面数据到新分配的物理页面
     int r;
     if ((r = swapfs_read((*ptep), result)) != 0)
     {
        assert(r!=0);
     }
     cprintf("swap_in: load disk swap entry %d with swap_page in vadr 0x%x\n", (*ptep)>>8, addr);
     *ptr_result=result;
     return 0;
}
```

## 换出

```c
int
swap_out(struct mm_struct *mm, int n, int in_tick)
{
     int i;
     // 循环尝试换出n个页面
     for (i = 0; i != n; ++ i)
     {
          uintptr_t v;
          struct Page *page;
          // 使用页面置换算法得到被淘汰的页面
          int r = sm->swap_out_victim(mm, &page, in_tick);
          if (r != 0) {
			  cprintf("i %d, swap_out: call swap_out_victim failed\n",i);
			  break;
          }          
          // 获取虚拟地址
          v=page->pra_vaddr;
          // 获取页表项
          pte_t *ptep = get_pte(mm->pgdir, v, 0);
          assert((*ptep & PTE_P) != 0);
          // 将换出的页面写入交换区
          if (swapfs_write( (page->pra_vaddr/PGSIZE+1)<<8, page) != 0) {
				cprintf("SWAP: failed to save\n");
				sm->map_swappable(mm, v, page, 0);
				continue;
          }
          else {
				cprintf("swap_out: i %d, store page in vaddr 0x%x to disk swap entry %d\n", i, v, page->pra_vaddr/PGSIZE+1);
				*ptep = (page->pra_vaddr/PGSIZE+1)<<8;
				// 释放该页面
				free_page(page);
          }
          // 是tlb中的页面失效
          tlb_invalidate(mm->pgdir, v);
     }
     return i;
}
```


# 第二次页面置换算法实现

```c
#include <defs.h>
#include <x86.h>
#include <stdio.h>
#include <string.h>
#include <swap.h>
#include <swap_next.h>
#include <list.h>

list_entry_t pra_list_head;

static int
_next_init_mm(struct mm_struct *mm)
{
     list_init(&pra_list_head);
     mm->sm_priv = &pra_list_head;
     return 0;
}

static int
_next_map_swappable(struct mm_struct *mm, uintptr_t addr, struct Page *page, int swap_in)
{
    list_entry_t *head=(list_entry_t*) mm->sm_priv;
    list_entry_t *entry=&(page->pra_page_link);

    assert(entry != NULL && head != NULL);

    // 新进入的页面放在头部
    list_add(head, entry);
    return 0;
}


static int
_next_swap_out_victim(struct mm_struct *mm, struct Page ** ptr_page, int in_tick)
{
     list_entry_t *head=(list_entry_t*) mm->sm_priv;
     assert(head != NULL);
     assert(in_tick==0);

     // 找到链表尾部的页面，即最早进入的页面
     list_entry_t *le = head->prev;
     assert(head!=le);
     struct Page *p = le2page(le, pra_page_link);
     // 获取页表项
     pte_t *ptep = get_pte(mm->pgdir,p->pra_vaddr,0);
     // 找到最早的没有访问的页面
     while((*ptep & PTE_A)!=0) {
         list_entry_t *lep = le->prev;
         *ptep &= ~PTE_A; // 清除访问位
         list_del(le); // 删除链表中的表项
         list_add(head, le); // 添加到链表头部

         le = lep;
         p = le2page(le,pra_page_link);
         ptep = get_pte(mm->pgdir,p->pra_vaddr,0);
     }

     // 检查访问位
     assert((*ptep & PTE_A)== 0);
     // 最近未访问淘汰
     list_del(le);
     assert(p !=NULL);
     *ptr_page = p;
     return 0;
}

static int
_next_check_swap(void) {
    cprintf("write Virt Page c in next_check_swap\n");
    *(unsigned char *)0x3000 = 0x0c;
    assert(pgfault_num==4);
    cprintf("write Virt Page a in next_check_swap\n");
    *(unsigned char *)0x1000 = 0x0a;
    assert(pgfault_num==4);
    cprintf("write Virt Page d in next_check_swap\n");
    *(unsigned char *)0x4000 = 0x0d;
    assert(pgfault_num==4);
    cprintf("write Virt Page b in next_check_swap\n");
    *(unsigned char *)0x2000 = 0x0b;
    assert(pgfault_num==4);
    cprintf("write Virt Page e in next_check_swap\n");
    *(unsigned char *)0x5000 = 0x0e;
    assert(pgfault_num==5);
    cprintf("write Virt Page b in next_check_swap\n");
    *(unsigned char *)0x2000 = 0x0b;
    assert(pgfault_num==5);
    cprintf("write Virt Page a in next_check_swap\n");
    *(unsigned char *)0x1000 = 0x0a;
    assert(pgfault_num==6);
    cprintf("write Virt Page b in next_check_swap\n");
    *(unsigned char *)0x2000 = 0x0b;
    assert(pgfault_num==7);
    cprintf("write Virt Page c in next_check_swap\n");
    *(unsigned char *)0x3000 = 0x0c;
    assert(pgfault_num==8);
    cprintf("write Virt Page d in next_check_swap\n");
    *(unsigned char *)0x4000 = 0x0d;
    assert(pgfault_num==9);
    return 0;
}


static int
_next_init(void)
{
    return 0;
}

static int
_next_set_unswappable(struct mm_struct *mm, uintptr_t addr)
{
    return 0;
}

static int
_next_tick_event(struct mm_struct *mm)
{ return 0; }


struct swap_manager swap_manager_next =
{
     .name            = "next swap manager",
     .init            = &_next_init,
     .init_mm         = &_next_init_mm,
     .tick_event      = &_next_tick_event,
     .map_swappable   = &_next_map_swappable,
     .set_unswappable = &_next_set_unswappable,
     .swap_out_victim = &_next_swap_out_victim,
     .check_swap      = &_next_check_swap,
}
```