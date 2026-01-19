---
title: Lab5
published: 2026-01-19
pinned: false
description: ucore-lab5实验
image: ""
tags:
  - 操作系统
category: 操作系统
draft: false
---

# 内核线程与用户进程

- 内核线程只运行在内核态，**用户进程会在在用户态和内核态交替运行**
- 所有内核线程共用内核内存空间，不需为每个内核线程维护单独的内存空间；**用户进程需要维护各自的用户内存空间**

# 系统调用的实现

- 用户态时，将需要使用的系统调用编号放入`EAX`寄存器，系统调用最多支持5个参数，分别放在`EDX、ECX、EBX、EDI、ESI`这5个寄存器中，然后使用`INT 0x80`指令进入内核态。
```c
// 参数：中断号+参数
static inline int
syscall(int num, ...) {
    va_list ap;           // 可变参数函数的参数列表指针
    va_start(ap, num);    // 让ap指向num
    uint32_t a[MAX_ARGS]; // 建立参数列表
    int i, ret;
    for (i = 0; i < MAX_ARGS; i ++) {
        a[i] = va_arg(ap, uint32_t); // 获取下一个参数
    }
    va_end(ap); // 清理参数列表
	
	// int 0x80中断进行系统调用
    asm volatile (
        "int %1;"
        : "=a" (ret)
        : "i" (T_SYSCALL),
          "a" (num),
          "d" (a[0]),
          "c" (a[1]),
          "b" (a[2]),
          "D" (a[3]),
          "S" (a[4])
        : "cc", "memory");
    return ret;
}
```

- 然后根据中断号，确定是系统调用中断，进入对应的中断处理程序
```c
static void
trap_dispatch(struct trapframe *tf) {
	// ...
    case T_SYSCALL:
        syscall(); // 处理系统调用
        break;
    case IRQ_OFFSET + IRQ_TIMER:
    // ...
}
```
- 处理系统调用：
```c
void
syscall(void) {
    struct trapframe *tf = current->tf;
    uint32_t arg[5];
    // 获取系统调用号
    int num = tf->tf_regs.reg_eax;
    // 获取参数
    if (num >= 0 && num < NUM_SYSCALLS) {
        if (syscalls[num] != NULL) {
            arg[0] = tf->tf_regs.reg_edx;
            arg[1] = tf->tf_regs.reg_ecx;
            arg[2] = tf->tf_regs.reg_ebx;
            arg[3] = tf->tf_regs.reg_edi;
            arg[4] = tf->tf_regs.reg_esi;
            // 查表调用号相应的系统调用函数。并存储返回值。
            tf->tf_regs.reg_eax = syscalls[num](arg);
            return ;
        }
    }
    print_trapframe(tf);
    panic("undefined syscall %d, pid = %d, name = %s.\n",
            num, current->pid, current->name);
}
```
- 系统调用表
```c
static int (*syscalls[])(uint32_t arg[]) = {
    [SYS_exit]              sys_exit,
    [SYS_fork]              sys_fork,
    [SYS_wait]              sys_wait,
    [SYS_exec]              sys_exec,
    [SYS_yield]             sys_yield,
    [SYS_kill]              sys_kill,
    [SYS_getpid]            sys_getpid,
    [SYS_putc]              sys_putc,
    [SYS_pgdir]             sys_pgdir,
    [SYS_gettime]           sys_gettime,
    [SYS_lab6_set_priority] sys_lab6_set_priority,
};
```

# 用户进程的创建、调度以及执行的过程。

在proc_init中，建立了一个0号线程`idleporc`和一号线程`initproc`，
```c
void
proc_init(void) {
	// 初始化进程链表
    int i;
    list_init(&proc_list);
    for (i = 0; i < HASH_LIST_SIZE; i ++) {
        list_init(hash_list + i);
    }
    //建立idle线程，0号线程
    if ((idleproc = alloc_proc()) == NULL) {
        panic("cannot alloc idleproc.\n");
    }
    idleproc->pid = 0;
    idleproc->state = PROC_RUNNABLE;
    idleproc->kstack = (uintptr_t)bootstack;
    idleproc->need_resched = 1;
    set_proc_name(idleproc, "idle");
    nr_process ++;
    current = idleproc;

	// 建立1号线程，0号线程的子线程
    int pid = kernel_thread(init_main, NULL, 0);
    if (pid <= 0) {
        panic("create init_main failed.\n");
    }
    initproc = find_proc(pid);
    set_proc_name(initproc, "init");
    assert(idleproc != NULL && idleproc->pid == 0);
    assert(initproc != NULL && initproc->pid == 1);
}
```
在一号线程中，执行工作`init_main`，
```c
static int
init_main(void *arg) {
	// 记录当前系统状态：当前空闲物理页数量，内核已分配的内存大小
    size_t nr_free_pages_store = nr_free_pages();
    size_t kernel_allocated_store = kallocated();

	// 通过init线程来建立用户进程（子进程）
    int pid = kernel_thread(user_main, NULL, 0);
    if (pid <= 0) {
        panic("create user_main failed.\n");
    }

	// 等待所有子进程结束
    while (do_wait(0, NULL) == 0) {
        schedule(); // 如果没有子进程结束，主动让出CPU，让其他进程运行
    }

	// 所有子进程都退出，状态检查
    cprintf("all user-mode processes have quit.\n");
    assert(initproc->cptr == NULL && initproc->yptr == NULL && initproc->optr == NULL);
    assert(nr_process == 2);
    
    assert(list_next(&proc_list) == &(initproc->list_link));
    assert(list_prev(&proc_list) == &(initproc->list_link));
    // 内存一致性检查
    assert(nr_free_pages_store == nr_free_pages());
    assert(kernel_allocated_store == kallocated());
    cprintf("init check memory pass.\n");
    return 0;
}
```
在`init_main`中创建用户进程（`initproc`的子进程）,用户线程执行`user_main`
在`user_main`中，加载用户应用程序
```c
static int user_main(void *arg) {
#ifdef TEST
    KERNEL_EXECVE2(TEST, TESTSTART, TESTSIZE);
#else
    KERNEL_EXECVE(hello); // 加载名为 "hello" 的用户程序
#endif
    panic("user_main execve failed.\n");
}
```

```c
// 从内核加载并执行用户程序
#define __KERNEL_EXECVE(name, binary, size) ({                          \
            cprintf("kernel_execve: pid = %d, name = \"%s\".\n",        \
                    current->pid, name);                                \
            kernel_execve(name, binary, (size_t)(size));                \
        })

#define KERNEL_EXECVE(x) ({                                             \
            extern unsigned char _binary_obj___user_##x##_out_start[],  \
                _binary_obj___user_##x##_out_size[];                    \
            __KERNEL_EXECVE(#x, _binary_obj___user_##x##_out_start,     \
                            _binary_obj___user_##x##_out_size);         \
        })
```

```c
// 通过中断进行加载应用程序
static int
kernel_execve(const char *name, unsigned char *binary, size_t size) {
    int ret, len = strlen(name);
    asm volatile (
        "int %1;"
        : "=a" (ret)
        : "i" (T_SYSCALL), "0" (SYS_exec), "d" (name), "c" (len), "b" (binary), "D" (size)
        : "memory");
    return ret;
}
```

```c
// 操作系统接收到相应中断号的中断时，执行该函数
// 是 do_execve系统调用的内核处理函数
static int
sys_exec(uint32_t arg[]) {
    const char *name = (const char *)arg[0];
    size_t len = (size_t)arg[1];
    unsigned char *binary = (unsigned char *)arg[2];
    size_t size = (size_t)arg[3];
    return do_execve(name, len, binary, size);
}
```

 在`do_execve`函数中，为进程的运行环境进行设置和初始化
```c
int
do_execve(const char *name, size_t len, unsigned char *binary, size_t size) {
    struct mm_struct *mm = current->mm;
    // 检查用户空间指针的有效性
    if (!user_mem_check(mm, (uintptr_t)name, len, 0)) {
        return -E_INVAL;
    }
    
    // 程序名长度限制处理
    if (len > PROC_NAME_LEN) {
        len = PROC_NAME_LEN;
    }

    char local_name[PROC_NAME_LEN + 1];
    memset(local_name, 0, sizeof(local_name));
    memcpy(local_name, name, len);

    if (mm != NULL) {
       // 释放当前进程的内存空间
        lcr3(boot_cr3);
        if (mm_count_dec(mm) == 0) {
            exit_mmap(mm);
            put_pgdir(mm);
            mm_destroy(mm);
        }
        current->mm = NULL;
    }
    // 加载新程序
    int ret;
    if ((ret = load_icode(binary, size)) != 0) {
        goto execve_exit;
    }
    set_proc_name(current, local_name);
    return 0;

execve_exit:
    do_exit(ret);
    panic("already exit: %e.\n", ret);
}
```
- `load_icode`：给用户进程建立一个能够让用户进程正常运行的用户环境。为加载新的执行码做好用户态内存空间清空准备。加载应用程序执行码到当前进程的新创建的用户态虚拟空间中。
```c
static int
load_icode(unsigned char *binary, size_t size) {
    if (current->mm != NULL) {
        panic("load_icode: current->mm must be empty.\n");
    }

    int ret = -E_NO_MEM;
    struct mm_struct *mm;
    // 申请进程的内存管理数据结构mm所需内存空间
    if ((mm = mm_create()) == NULL) {
        goto bad_mm;
    }
	// 建立进程新的页目录表，且能够正确映射内核虚空间；
    if (setup_pgdir(mm) != 0) {
        goto bad_pgdir_cleanup_mm;
    }

    struct Page *page;
    // 解析 ELF 文件头
    struct elfhdr *elf = (struct elfhdr *)binary;
    // 获取程序头表
    struct proghdr *ph = (struct proghdr *)(binary + elf->e_phoff);
    // 检查elf文件的魔法头是否有效
    if (elf->e_magic != ELF_MAGIC) {
        ret = -E_INVAL_ELF;
        goto bad_elf_cleanup_pgdir;
    }
	
    uint32_t vm_flags, perm;
    // 遍历所有程序段头，只处理 PT_LOAD 类型的段（需要加载到内存的段）
    struct proghdr *ph_end = ph + elf->e_phnum;
    for (; ph < ph_end; ph ++) {
        if (ph->p_type != ELF_PT_LOAD) {
            continue ;
        }
        if (ph->p_filesz > ph->p_memsz) {
            ret = -E_INVAL_ELF;
            goto bad_cleanup_mmap;
        }
        if (ph->p_filesz == 0) {
            continue ;
        }
        
        // 设置虚拟内存区域（VMA）
        vm_flags = 0, perm = PTE_U;
        if (ph->p_flags & ELF_PF_X) vm_flags |= VM_EXEC;
        if (ph->p_flags & ELF_PF_W) vm_flags |= VM_WRITE;
        if (ph->p_flags & ELF_PF_R) vm_flags |= VM_READ;
        if (vm_flags & VM_WRITE) perm |= PTE_W;
        // 建立内存映射
		if ((ret = mm_map(mm, ph->p_va, ph->p_memsz, vm_flags, NULL)) != 0)
	    {
            goto bad_cleanup_mmap;
        }
        
        
        unsigned char *from = binary + ph->p_offset;
        size_t off, size;
        uintptr_t start = ph->p_va, end, la = ROUNDDOWN(start, PGSIZE);

        ret = -E_NO_MEM;
        end = ph->p_va + ph->p_filesz;
        // 分配内存，并将每个程序段复制到进程的地址空间里。
        // (from~from+end) -> (la,la+end)
        
	    // 分配页面，按页复制代码段和数据段
        while (start < end) {
            if ((page = pgdir_alloc_page(mm->pgdir, la, perm)) == NULL) {
                goto bad_cleanup_mmap;
            }
            off = start - la, size = PGSIZE - off, la += PGSIZE;
            if (end < la) {
                size -= la - end;
            }
            memcpy(page2kva(page) + off, from, size);
            start += size, from += size;
        }

      // 建立BSS段
        end = ph->p_va + ph->p_memsz;
        // 清零最后一页中的BSS部分
        if (start < la) {
            /* ph->p_memsz == ph->p_filesz */
            if (start == end) {
                continue ;
            }
            off = start + PGSIZE - la, size = PGSIZE - off;
            if (end < la) {
                size -= la - end;
            }
            memset(page2kva(page) + off, 0, size);
            start += size;
            assert((end < la && start == end) || (end >= la && start == la));
        }
        // 分配并清零BSS段
        while (start < end) {
            if ((page = pgdir_alloc_page(mm->pgdir, la, perm)) == NULL) {
                goto bad_cleanup_mmap;
            }
            off = start - la, size = PGSIZE - off, la += PGSIZE;
            if (end < la) {
                size -= la - end;
            }
            memset(page2kva(page) + off, 0, size);
            start += size;
        }
    }
    
	// 设置用户栈。
    vm_flags = VM_READ | VM_WRITE | VM_STACK;
    // 建立用户栈地址映射
    if ((ret = mm_map(mm, USTACKTOP - USTACKSIZE, USTACKSIZE, vm_flags, NULL)) != 0) {
        goto bad_cleanup_mmap;
    }
    // 为用户栈分配空间
    assert(pgdir_alloc_page(mm->pgdir, USTACKTOP-PGSIZE , PTE_USER) != NULL);
    assert(pgdir_alloc_page(mm->pgdir, USTACKTOP-2*PGSIZE , PTE_USER) != NULL);
    assert(pgdir_alloc_page(mm->pgdir, USTACKTOP-3*PGSIZE , PTE_USER) != NULL);
    assert(pgdir_alloc_page(mm->pgdir, USTACKTOP-4*PGSIZE , PTE_USER) != NULL);
    
    // 设置当前进程的mm，并把页目录表地址加载到cr3寄存器中，更新了用户进程的虚拟内存空间
    mm_count_inc(mm);
    current->mm = mm;
    current->cr3 = PADDR(mm->pgdir);
    lcr3(PADDR(mm->pgdir));

    // 清空进程的中断帧，再重新设置进程的中断帧，能够让CPU转到用户态特权级
    struct trapframe *tf = current->tf;
    memset(tf, 0, sizeof(struct trapframe));
    
    tf->tf_cs = USER_CS;
    tf->tf_ds = tf->tf_es = tf->tf_ss = USER_DS;
    tf->tf_esp = USTACKTOP;
    tf->tf_eip = elf->e_entry;
    tf->tf_eflags = FL_IF;
    ret = 0;
out:
    return ret;
bad_cleanup_mmap:
    exit_mmap(mm);
bad_elf_cleanup_pgdir:
    put_pgdir(mm);
bad_pgdir_cleanup_mm:
    mm_destroy(mm);
bad_mm:
    goto out;
}
```
- 完成`do_exec`后返回，切换用户栈，切换特权级，跳转至程序入口，开始执行。
