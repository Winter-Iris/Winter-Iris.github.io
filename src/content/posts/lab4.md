---
title: Lab4
published: 2026-01-19
pinned: false
description: ucore-lab4实验
image: ""
tags:
  - 操作系统
category: 操作系统
draft: false
---

# PCB

- 进程控制块(PCB)是管理控制进程运行所用信息的集合。PCB是进程存在的唯一标志，每个进程在操作系统中都有一个对应的PCB,操作系统用PCB来描述进程的基本信息以及运行变化情况。
- PCB通常包含进程标识符、处理机的信息、进程调度信息、进程控制信息。

# 上下文切换

- 进程切换（上下文切换）：暂停当前的进程，从运行状态变为其他状态，调用另一个进程从就绪状态改为运行状态。在这一过程中，切换前需要保存进程上下文，以便于之后恢复该进程，且尽可能地快速切换（因此通常用汇编写进程切换过程的代码）。CPU给每个任务一定的服务时间，当时间片轮转的时候，需要把当前状态保存下来，同时加载下一个任务，这时候就进行上下文切换。

# ucore的进程管理信息结构体

```c
struct proc_struct {
	// 进程状态
    enum proc_state state;      
    // 进程id                
    int pid;      
    // 运行时间                             
    int runs;           
    // 内核栈指针                        
    uintptr_t kstack;          
    // 是否需要重新调度释放cpu标志                
    volatile bool need_resched;     
    // 父进程控制块指针            
    struct proc_struct *parent;    
    // 进程内存描述符             
    struct mm_struct *mm;            
    // 进程上下文           
    struct context context;        
    // 当前中断帧的指针            
    struct trapframe *tf;      
    // 页表地址                 
    uintptr_t cr3;   
    // 反应进程状态的表示位                         
    uint32_t flags;        
    // 进程名                     
    char name[PROC_NAME_LEN + 1];         
    // 进程的链表      
    list_entry_t list_link;          
    // hash链表           
    list_entry_t hash_link;                    
};
```

- 上下文结构体
```c
// 保存寄存器信息，以便进行上下文切换
struct context {
    uint32_t eip;
    uint32_t esp;
    uint32_t ebx;
    uint32_t ecx;
    uint32_t edx;
    uint32_t esi;
    uint32_t edi;
    uint32_t ebp;
};
```

# ucore内核线程的创建过程

- kernel_thread() 创建请求
- 设置中断帧（trapframe）
- do_fork() 核心创建函数
- alloc_proc() 分配PCB
- setup_kstack() 分配内核栈
- copy_mm() 设置内存管理（共享内核空间）
- copy_thread() 设置执行上下文
- 分配PID并加入进程表
- wakeup_proc() 唤醒新线程
- 新线程进入就绪队列


- 用于分配并初始化进程信息块的函数`alloc_proc`
```c
// 负责创建并初始化一个新的proc_struct
static struct proc_struct *
alloc_proc(void) {
    struct proc_struct *proc = kmalloc(sizeof(struct proc_struct));
    if (proc != NULL) {
        proc->state = PROC_UNINIT;
        proc->pid = -1;
        proc->runs = 0;
        proc->kstack = 0;
        proc->need_resched = 0;
        proc->parent = NULL;
        proc->mm = NULL;
        memset(&(proc->context), 0, sizeof(struct context));
        proc->tf = NULL;
        proc->cr3 = boot_cr3;
        proc->flags = 0;
        memset(proc->name, 0, PROC_NAME_LEN);
    }
    return proc;
}
```

- 用于创建内核线程的函数
```c
//创建一个新的内核线程，该线程将在内核态执行指定的函数fn，并传入参数arg。
int
kernel_thread(int (*fn)(void *), void *arg, uint32_t clone_flags) {
	// 创建中断帧，初始化
    struct trapframe tf;
    memset(&tf, 0, sizeof(struct trapframe));
    // 设置段寄存器
    tf.tf_cs = KERNEL_CS;
    tf.tf_ds = tf.tf_es = tf.tf_ss = KERNEL_DS;
    // 设置线程执行参数
    tf.tf_regs.reg_ebx = (uint32_t)fn;
    tf.tf_regs.reg_edx = (uint32_t)arg;
    // 设置指令指针
    tf.tf_eip = (uint32_t)kernel_thread_entry; //当线程第一次被调度执行时，将从这里开始执行
    
    // 调用 do_fork 创建线程
    return do_fork(clone_flags | CLONE_VM, 0, &tf);
}
```
- **创建一个新的进程/线程** `do_fork`
- 参数说明：
-  **clone_flags**：克隆标志，控制创建行为
    - `CLONE_VM`：共享内存空间（用于创建线程）
    - `CLONE_FS`：共享文件系统信息
    - 等等
- **stack**：用户栈指针（对于内核线程为0）
- **tf**：中断帧指针，包含新进程的初始执行上下文
```c
int
do_fork(uint32_t clone_flags, uintptr_t stack, struct trapframe *tf) {

	// 检查系统是否已达到最大进程数
    int ret = -E_NO_FREE_PROC; //错误返回值
    struct proc_struct *proc;
    if (nr_process >= MAX_PROCESS) {
        goto fork_out;
    }
    ret = -E_NO_MEM;
    
    // 分配进程控制块
    if ((proc = alloc_proc()) == NULL) {
        goto fork_out;
    }
    // 设置父进程为当前进程 current
    proc->parent = current;
    // 分配内核栈
    if (setup_kstack(proc) != 0) {
        goto bad_fork_cleanup_proc; // 失败则跳转到清理代码
    }
    // 复制内存管理结构，根据clone_flags 决定复制还是共享内存空间
    if (copy_mm(clone_flags, proc) != 0) {
        goto bad_fork_cleanup_kstack;
    }
    // 复制线程上下文
    copy_thread(proc, stack, tf);
    // 分配PID并加入进程表
    bool intr_flag;
    local_intr_save(intr_flag); // 关闭中断
    {
	    // 分配唯一PID
        proc->pid = get_pid();
        // 加入哈希表，便于快速查找
        hash_proc(proc);
	    // 加入进程链表
        list_add(&proc_list, &(proc->list_link));
        // 进程计数增加
        nr_process ++;
    }
    local_intr_restore(intr_flag); // 恢复中断
    // 唤醒新进程
    // wakeup_proc()：将进程状态设为 PROC_RUNNABLE，可被调度执行
    wakeup_proc(proc);
    ret = proc->pid;
    
    // 错误处理
fork_out:
    return ret; // 返回错误码或PID
bad_fork_cleanup_kstack:
    put_kstack(proc); // 释放内核栈
bad_fork_cleanup_proc:
    kfree(proc);     // 释放进程控制块
    goto fork_out;
}
```

-  **分配内核栈**:为线程分配内核栈空间（通常2页，8KB）, 将物理页转换为内核虚拟地址， 设置 `proc->kstack` 指向栈底（高地址）
```c
static int
setup_kstack(struct proc_struct *proc) {
    struct Page *page = alloc_pages(KSTACKPAGE);
    if (page != NULL) {
        proc->kstack = (uintptr_t)page2kva(page);
        return 0;
    }
    return -E_NO_MEM;
}
```
- 子线程对父线程的复制
```c
// 复制父进程的内存管理结构(当前为空)
static int
copy_mm(uint32_t clone_flags, struct proc_struct *proc) {
    assert(current->mm == NULL);
    /* do nothing in this project */
    return 0;

}

// 设置子进程的线程执行上下文
static void
copy_thread(struct proc_struct *proc, uintptr_t esp, struct trapframe *tf) {
    // 1. 设置中断帧位置：在进程内核栈的顶部
    proc->tf = (struct trapframe *)(proc->kstack + KSTACKSIZE) - 1;
	// 2. 复制父进程的中断帧
    *(proc->tf) = *tf;
    
    // 设置子进程返回值
    proc->tf->tf_regs.reg_eax = 0;
    // 设置用户栈指针
    proc->tf->tf_esp = esp;
    // 启用中断（设置IF标志位）
    proc->tf->tf_eflags |= FL_IF;
    // 设置上下文切换的返回地址：forkret函数
    proc->context.eip = (uintptr_t)forkret;
    // 设置上下文切换的栈指针：指向中断帧
    proc->context.esp = (uintptr_t)(proc->tf);
}
```

- 分配pid
```c
static int
get_pid(void) {
	// 确保PID数量大于最大进程数
    static_assert(MAX_PID > MAX_PROCESS);
    struct proc_struct *proc;
    list_entry_t *list = &proc_list, *le;
    // last_pid: 上一次分配的PID，从它开始搜索下一个可用PID
	// next_safe: 安全边界，在[last_pid, next_safe)区间内搜索可用PID
    static int next_safe = MAX_PID, last_pid = MAX_PID;
    // 实现环形遍历
    if (++ last_pid >= MAX_PID) {
        last_pid = 1;
        goto inside;
    }
    if (last_pid >= next_safe) {
    inside:
	    // 更新安全边界
        next_safe = MAX_PID;
    repeat:
        le = list;
        // 扫描进程列表
        while ((le = list_next(le)) != list) {
            proc = le2proc(le, list_link);
            // 冲突：当前进程的PID等于last_pid
            // last_pid++，尝试下一个值
            // 如果超出安全边界，需要重置并重新扫描
            if (proc->pid == last_pid) {
                if (++ last_pid >= next_safe) {
                    if (last_pid >= MAX_PID) {
                        last_pid = 1;
                    }
                    next_safe = MAX_PID;
                    goto repeat;
                }
            }
            // 进程PID大于last_pid且小于当前next_safe
            else if (proc->pid > last_pid && next_safe > proc->pid) {
	            // 缩小安全边界
                next_safe = proc->pid;
            }
        }
    }
    return last_pid;
}
```
- 唤醒线程
```c
void
wakeup_proc(struct proc_struct *proc) {
    assert(proc->state != PROC_ZOMBIE && proc->state != PROC_RUNNABLE);
    // 更新进程状态即可。
    proc->state = PROC_RUNNABLE;
}
```



# ucore内核线程切换的过程

- 定时器中断/系统调用
- `trap()` 中断处理
- `schedule()` 调度决策
- `proc_run()` 切换执行
- `switch_to()` 上下文切换
- 新线程开始执行

- 调度程序
```c

void
schedule(void) {
    bool intr_flag;
    list_entry_t *le, *last;
    struct proc_struct *next = NULL;
    // 关中断，确保调度过程是原子性的，不会被中断打断
    local_intr_save(intr_flag);
    {
	    // 清除当前进程的"需要重新调度"标志
        current->need_resched = 0;
        // 确定搜索起点
        last = (current == idleproc) ? &proc_list : &(current->list_link);
        le = last;
        // 搜索可运行进程
        do {
            if ((le = list_next(le)) != &proc_list) {
                next = le2proc(le, list_link);
                if (next->state == PROC_RUNNABLE) {
                    break;
                }
            }
        } while (le != last);
        // 处理没有可运行进程的情况
        if (next == NULL || next->state != PROC_RUNNABLE) {
        // 切换到空闲进程
            next = idleproc;
        }
        next->runs ++;
        // 进程切换
        if (next != current) {
            proc_run(next);
        }
    }
    local_intr_restore(intr_flag);
}

```

- 运行线程的程序
```c
void
proc_run(struct proc_struct *proc) {
    if (proc != current) {
        bool intr_flag;
        struct proc_struct *prev = current, *next = proc;
        // 关中断
        local_intr_save(intr_flag);
        {
	        // 上下文切换
            current = proc;
            load_esp0(next->kstack + KSTACKSIZE);
            lcr3(next->cr3);
            switch_to(&(prev->context), &(next->context));
        }
        local_intr_restore(intr_flag);
    }
}
```

- 上下文切换的函数
```
switch_to:                      # switch_to(from, to)

    # save from's registers
    movl 4(%esp), %eax          # eax points to from
    popl 0(%eax)                # save eip !popl
    movl %esp, 4(%eax)
    movl %ebx, 8(%eax)
    movl %ecx, 12(%eax)
    movl %edx, 16(%eax)
    movl %esi, 20(%eax)
    movl %edi, 24(%eax)
    movl %ebp, 28(%eax)

    # restore to's registers
    movl 4(%esp), %eax          # not 8(%esp): popped return address already
                                # eax now points to to
    movl 28(%eax), %ebp
    movl 24(%eax), %edi
    movl 20(%eax), %esi
    movl 16(%eax), %edx
    movl 12(%eax), %ecx
    movl 8(%eax), %ebx
    movl 4(%eax), %esp

    pushl 0(%eax)               # push eip

    ret

```
