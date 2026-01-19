---
title: Lab6&7
published: 2026-01-19
pinned: false
description: ucore-lab6&7实验
image: ""
tags:
  - 操作系统
category: 操作系统
draft: false
---


# Round Robin 调度算法调度流程

- RR算法的核心是设置一个时间片，执行过程中，**如果进程只需要小于时间片的CPU区间，则进程完成后释放CPU。**
- **否则**定时器中断并产生系统中断，**进行上下文切换**，将进程加入到就绪队列的尾部，然后从其头部取出进程进行调度。

# `sched_class`数据结构

```c
struct sched_class {
	// 调度类名字
    const char *name;
	// 初始化函数指针
    void (*init)(struct run_queue *rq);
    // 加入到运行队列的函数指针
    void (*enqueue)(struct run_queue *rq, struct proc_struct *proc);
	// 离开运行队列的函数指针
    void (*dequeue)(struct run_queue *rq, struct proc_struct *proc);
	// 从运行队列中返回下一个可执行进程的函数指针
    struct proc_struct *(*pick_next)(struct run_queue *rq);
	// 处理时间片的函数指针
    void (*proc_tick)(struct run_queue *rq, struct proc_struct *proc);
};
```

# `schedule`调度流程

```c
void
schedule(void) {
    bool intr_flag;
    struct proc_struct *next;
    local_intr_save(intr_flag);
    {
        current->need_resched = 0;
        // 将当前进程插入运行队列
        if (current->state == PROC_RUNNABLE) {
            sched_class_enqueue(current);
        }
        // 使用RR算法挑选下一个执行的进程，离队
        if ((next = sched_class_pick_next()) != NULL) {
            sched_class_dequeue(next);
        }
        if (next == NULL) {
            next = idleproc;
        }
        // 运行下一个进程
        next->runs ++;
        if (next != current) {
            proc_run(next);
        }
    }
    local_intr_restore(intr_flag);
}
```

# 多级反馈队列调度算法设计

**多级反馈队列核心思想是**：
- 时间片大小随优先级级别增加而增加
- 进程在当前时间片没有完成则降到下一优先级
- 每个新的进程加入第一个队列，当需要选择一个进程调入执行时，从第一个队列开始向后查找，遇到某个队列非空，那么从这个队列中取出一个进程调入执行。
- 如果从某个队列调入的进程在时间片用完之后仍然没有结束，则将这个进程加入其调入时所在队列之后的一个队列，并且时间片加倍。
- 一旦一个阻塞的进程完成了I/O操作，它将进入最高优先级的队列

实现设计：

```c
#define QLEVELNUM 3
queue run_list[QLEVELNUM]; // 多级队列
int time_slice[QLEVELNUM]; // 每一级队列的时间片
```

- `void enqueue(PCB *proc, int queue_index)`：将进程加入指定队列的队尾。新进程或I/O完成的进程通常加入`queue_index = 0`。

-  `PCB* dequeue(int queue_index)`：从指定队列的队头取出一个进程。

- `PCB* pick_next()`：从第一个队列遍历所有优先级队列，找到可运行进程

- `PCB* proc_tick(PCB *current)`：返回当前应该继续运行的进程，增加已运行时间，检查时间片是否用完，若时间片用完，未完成则降到下一优先级 (除非已经是最低优先级)，若时间片未用完，继续运行

# 信号量机制的实现方案

## 数据结构定义

- 信号量
```c
typedef struct {
    int value;                // 信号量的值
    wait_queue_t wait_queue;  // 信号量的等待队列
} semaphore_t;
```

- 等待队列
```c
typedef struct {
    list_entry_t wait_head;
} wait_queue_t;

struct proc_struct;

typedef struct {
    struct proc_struct *proc;   // 等待进程的指针
    uint32_t wakeup_flags;      // 进程被放入等待队列的原因标记
    wait_queue_t *wait_queue;   // 组织此结构所属的等待队列
    list_entry_t wait_link;     // 组织对应的等待队列中的连接
} wait_t;
```

## 接口实现

- 初始化信号量
```c
void
sem_init(semaphore_t *sem, int value) {
	// 初始化值和等待队列
    sem->value = value;
    wait_queue_init(&(sem->wait_queue));
}
```
- down操作（P操作）：请求资源
```c
void
down(semaphore_t *sem) {
    uint32_t flags = __down(sem, WT_KSEM);
    assert(flags == 0);
}

static __noinline uint32_t __down(semaphore_t *sem, uint32_t wait_state) {
    bool intr_flag;
    local_intr_save(intr_flag);
    // 如果有空闲资源，取出资源，正常运行该进程
    if (sem->value > 0) {
        sem->value --;
        local_intr_restore(intr_flag);
        return 0;
    }
    // 如果无空闲资源value<=0,让出CPU，加入等待队列
    wait_t __wait, *wait = &__wait;
    wait_current_set(&(sem->wait_queue), wait, wait_state);
    local_intr_restore(intr_flag);
    // 让出CPU
    schedule();
    // 被唤醒后从等待队列中离开
    local_intr_save(intr_flag);
    wait_current_del(&(sem->wait_queue), wait);
    local_intr_restore(intr_flag);
    if (wait->wakeup_flags != wait_state) {
        return wait->wakeup_flags;
    }
    return 0;
}
```
- up操作（V操作）：释放资源
```c
void
up(semaphore_t *sem) {
    __up(sem, WT_KSEM);
}

static __noinline void __up(semaphore_t *sem, uint32_t wait_state) {
    bool intr_flag;
    local_intr_save(intr_flag);
    {
        wait_t *wait;
        // 如果等待队列为空，信号量的值加一
        if ((wait = wait_queue_first(&(sem->wait_queue))) == NULL) {
            sem->value ++;
        }
        else {
	        // 等待队列非空，取出一个进程唤醒
            assert(wait->proc->wait_state == wait_state);
            wakeup_wait(&(sem->wait_queue), wait, wait_state, 1);
        }
    }
    local_intr_restore(intr_flag);
}
```

## 理论课上的信号量实现

一个信号量有2个操作：
- Down / P： 操作对应于**资源的申请**
- Up / V：操作对应于**资源的释放**(产生)
- P、V操作是**不可中断的原子操作**(原语)。
```c
typedef struct {
	int v;
	struct *waitingQueue;
} semaphore_t;
```
- 在 P 操作中，当信号量值小于 0 时，操作系统将当前进程加入信号量的等待队列，并将其状态置为阻塞.
- V 操作的核心作用就是通过 wakeup() 将在 P 操作中 sleep 的进程从等待队列唤醒，使其重新进入就绪队列。
```c
void P(semaphore_t* s) {
	s->v -=1;
	if(s->v <0) {
		s->waitingQueue.add(cur_pid);
		block(cur_pid);
	}
}

void V(semaphore_t* s) {
	s->v +=1;
	if(s->v <=0) {
		int pid = s->waitingQueue.front();
		s->waitingQueue.pop();
		wakeup(pid);
	}
}
```

## 不同之处

- ucore实现的信号量的值永远大于等0，而理论课上的信号量值可以小于0，其绝对值表示正在等待的进程数。



# 用户级信号量

- 用户态的进程/线程的信号量的数据结构与内核态相同。
- 用户态进程/线程的信号量的相关操作通过系统调用来完成。每当用户进程调用信号量相关函数时，都会进入系统调用，由内核进行处理，之后再返回到用户态继续执行。
- 相比于为内核提供的信号量机制，用户态进程/线程由于要执行中断操作等特权指令，需要通过系统调用进入内核态使用内核信号量机制。
- 相同：提供信号量机制的代码实现逻辑是相同的
- 不同：提供给用户态进程的信号量机制是通过系统调用来实现的，而内核级线程只需要直接调用相应的函数就可以。
- 因此想要在用户态完成信号量机制设计，其实只需要在完成内核态信号量机制设计的基础上，增添一些系统调用。
- 包括：申请创建一个信号量的系统调用。对某一信号量进行P操作。对某一信号量进行V操作。将指定信号量释放

# 彩票调度算法的实现

**彩票调度（Lottery Scheduling）的核心思想**是： 给每个进程分配一定数量的**彩票（Tickets）**。调度器在所有彩票中随机抽取一张，持有该彩票的进程获得 CPU 使用权。进程拥有的彩票越多，被选中的概率这就越大。

- **数据结构**：需要维护当前运行队列中所有进程的彩票总数 (`total_tickets`)。
- **入队 (`enqueue`)**：进程加入队列时，将它的彩票数加到总数中。
- **出队 (`dequeue`)**：进程离开队列时，从总数中减去它的彩票数。
- **选择进程 (`pick_next`)**：
    - 生成一个随机数 `r`，范围是 `[0, total_tickets)`。
    - 遍历运行队列，累加彩票数，直到找到覆盖 `r` 的那个进程。
- **时钟中断 (`proc_tick`)**：采用标准的时间片轮转机制，时间片用完后触发重调度。

## 伪随机数生成

```c
static unsigned long next_rand = 1;
static int simple_rand()
{
    next_rand = next_rand * 1103515245 + 12345;
    return (unsigned int) (next_rand / 65536 ) % 32768;
}
```

## 初始化

```c
static void
lottery_init(struct run_queue* rq)
{
    list_init(&(rq->run_list));
    rq->proc_num = 0;
    total_tickets = 0;
}
```

## 入队

```c
static void
lottery_enqueue(struct run_queue *rq, struct proc_struct *proc)
{
    // 将进程加入运行队列链表
    list_add_before(&(rq->run_list), &(proc->run_link));

    // 如果进程的时间片用完了或者是新的，重置时间片
    if (proc->time_slice == 0 || proc->time_slice > rq->max_time_slice) {
        proc->time_slice = rq->max_time_slice;
    }

    // 确保进程有彩票，如果 lab6_priority 为 0，给一个默认值
    if (proc->lab6_priority == 0) {
        proc->lab6_priority = DEFAULT_TICKETS;
    }
	// 更新总彩票
    total_tickets += proc->lab6_priority;
    rq->proc_num++; // 更新准备队列
}
```

## 出队

```c

static void
lottery_dequeue(struct run_queue *rq, struct proc_struct *proc) {
    // 从链表中移除
    list_del_init(&(proc->run_link));

    // 更新全局彩票总数
    total_tickets -= proc->lab6_priority;
    rq->proc_num--;
}
```

## 挑选

- 假设给每个进程分发的彩票编号是区间内连续的整数，并且每个进程的区间是连续的。
- 比如：`p1 [0,9); p2 [10,19); p3 [20,29) ...`
- 若我们抽到x号
	- 若`x - p->tickets >= 0` : 表示不在p的区间范围内；
	-  若`x - p->tickets < 0` : 表示在p的区间范围内，p中奖
	- 如 `x=12` ：`x-10=2>0`，不在p1的范围内；`x=2,x-10=-8<0`，在p2的范围内，p2中奖
```c
static struct proc_struct *
lottery_pick_next(struct run_queue *rq) {
    //  如果队列为空，返回 NULL
    if (list_empty(&(rq->run_list))) {
        return NULL;
    }
	
	// 无彩票，返回第一个进程
    if(total_tickets == 0) {
        list_entry_t *le = list_next(&(rq->run_list));
        return le2proc(le,run_link);
    }

    // 抽取中奖票号: [0, total_tickets)
    long tickets = simple_rand() % total_tickets;

    // 遍历链表寻找中奖者
    list_entry_t *le = list_next(&(rq->run_list));
    while(le != &(rq->run_list)) {
        struct proc_struct *p = le2proc(le,run_link);
        /*
         * 这段代码本质上是在做区间判定，
         * 通过减法避免了维护复杂的区间起始坐标。
         ticket (初始值) 代表从起跑线开始的距离。
         ticket -= p->priority 代表跨过当前进程的range。
         如果结果小于 0：中奖号码就落在这个进程的range里。
         如果结果大于等于 0：说明中奖号码比这个进程的range还远，
                             继续往后找。
         */
        tickets -= p->lab6_priority;

        if (tickets < 0) {
            // 找到中奖进程
            return p;
        }

        le = list_next(le);
    }
    // 正常情况不会运行到这里，返回第一个进程
    le = list_next(&(rq->run_list));
    return le2proc(le,run_link);
}
```

## 时间片处理

```c
static void
lottery_proc_tick(struct run_queue *rq, struct proc_struct *proc) {
    if (proc->time_slice > 0) {
        proc->time_slice--;
    }

    // 如果时间片用完，标记需要重调度 (need_resched)
    if (proc->time_slice == 0) {
        proc->need_resched = 1;
    }
}
```

## 封装

```c
struct sched_class lottery_sched_class = {
    .name = "lottery_scheduler",
    .init = lottery_init,
    .enqueue = lottery_enqueue,
    .dequeue = lottery_dequeue,
    .pick_next = lottery_pick_next,
    .proc_tick = lottery_proc_tick,
};

```