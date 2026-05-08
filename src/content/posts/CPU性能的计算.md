---
title: CPU性能
description: CPU性能相关计算
published: 2026-05-08
category: 计组
tags:
    - 计组
    - CPU
    - Hardware 
---


# 名词含义

- **CPU Time (CPU时间)**：处理器执行特定任务所花费的时间。它**只计算处理器的处理时间**，排除了I/O等待或运行其他程序的时间。
- **CPU Clock Cycles (时钟周期数)**：程序执行过程中经过的总时钟脉冲数。
- **Clock Cycle Time (时钟周期长度)**：一个完整周期的持续时间（例如 250ps），是衡量硬件速度的基本单位。
- **Clock Rate / Frequency (时钟频率)**：时钟每秒钟跳动的次数（例如 4.0GHz）。它是时钟周期长度的倒数。

# 性能计算公式

- CPU时间 = CPU时钟周期数 × 时钟周期长度

$$\text{Cpu Execuution Time} = \text{Cpu Clock Cycles}\times \text{Clocl Cycle Time}$$

- CPU时钟周期 × 时钟频率 = 1
- CPU时间 = CPU时钟周期数​ / 时钟频率

$$\text{Cpu Execution Time} = \frac{\text{CPU Clock Cycles}}{\text{Clock Rate}}$$
- 引入CPI(Cycles per Instruction)
- **CPI/Cycles per Instruction**: 每条指令所需的平均时钟周期数

$$\text{CPU Clock Cycles} = \text{Instrucions} \times \text{Average Clock Cycles per Instruction}$$

$$CPI = \frac{\text{CPU Clock Cycles}}{\text{Instrucions}}$$
$$CPI = \frac{\text{执行程序所需的总时钟周期数}}{\text{程序包含的指令总数}}$$
- 经典性能计算公式
$$\text{CPU Time} = \text{Instruction Count} \times \text{CPI}\times \text{Clock Cycle Time}$$
$$\text{CPU time}=\frac{\text{Instruction count}\times\text{CPI}}{\text{Clock rate}}$$

$$CPU时间 = \text{指令数}\times \text{CPI} \times \text{时钟周期}$$
$$CPU时间 = \text{指令数}\times \text{CPI} \times \frac{1}{\text{时钟频率}}$$
# 能耗计算

- **总功耗公式：** 总功耗由**动态功耗**（Dynamic Power）和**静态功耗**（Static Power，也称漏电功耗）组成。
$$Power_{total} = Power_{dynamic} + Power_{static}$$

- **动态功耗：** 动态功耗主要源于电容充放电
- 一个**完整的充放电循环**（即 $0 \rightarrow 1 \rightarrow 0$）所消耗的能量。
$$P_{dynamic} \propto Capacitive\ Load \times Voltage^2 \times Frequency$$
- **单次转换**（Single Transition，即仅 $0 \rightarrow 1$ 或仅 $1 \rightarrow 0$）所消耗的能量
$$Power \propto \frac{1}{2} \times \text{Capacitive load} \times \text{Voltage}^2 \times \text{Frequency switched}$$

# 阿姆达尔定律 Amdahl's Law

- 当你只改良系统的一部分时，整个系统性能提升的上限，**取决于这一部分在总运行时间中所占的比例**。

$$\text{Execution time after improvement}\\=\frac{\text{Execution time affected by improvement}}{\text{Amount of improvement}}+\text{Execution time unaffected}$$
$$T_{new} = \frac{T_{affected}}{n} + T_{unaffected}$$
- **$T_{affected}$ (受影响的部分)：** 程序中可以被这项新技术（如并行化、更快的硬件单元、更好的算法）优化的那部分时间。
- **$n$ (改进倍数)：** 这部分被优化后性能提升了多少倍。
- **$T_{unaffected}$ (不受影响的部分)：** 无论你怎么优化，这部分的时间都不会改变。这通常是程序的**串行瓶颈**（如 I/O 操作、任务分发、同步开销）。

加速比（Speedup）的定义是：
$$\text{Speedup} = \frac{\text{旧时间}}{\text{新时间}}$$
如果我们设定旧时间为 **1**，那么：
$$\text{Speedup} = \frac{1}{\text{无法优化的时间} + \text{优化后的新时间}}$$
代入变量：
$$Speedup_{overall} = \frac{1}{(1 - f) + \frac{f}{s}}$$
- **$f$ (fraction enhanced)：** 程序中**可以被优化（或并行化）** 的部分所占的时间比例（0 到 1 之间）。
- **$s$ (speedup attained)：** 这一部分被优化后的**加速倍数**。
- **$1 - f$：** 程序中 **无法被优化（必须串行执行）** 的部分。
