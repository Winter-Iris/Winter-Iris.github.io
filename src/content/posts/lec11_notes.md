---
title: 处理器数据通路与控制
description: 探讨CPU单周期数据通路的搭建，包括取指、执行、访存等阶段的硬件实现，以及主控制单元的信号逻辑。
published: 2026-05-08
category: 计组
tags:
    - 计组
    - 数据通路
    - CPU控制
---

# 处理器数据通路与控制 · 复习笔记

> 原课件：lec11(1).pdf ｜ 计组 Chapter 4.1-4.5 — Processor Basics ｜ 2026-04-09
> 讲师：Dr. Qingfeng (Karen) Zhuge, ECNU

---

## 整体知识框架

- **CPU 性能模型** → 执行时间 = 指令数 × CPI × 时钟周期
- **逻辑设计基础** → 组合元件 vs 时序元件，边沿触发时钟
- **数据通路搭建** → 取指 → R-type → lw/sw → beq → jump，逐类扩展
- **ALU 控制** → ALUOp + funct 字段 → 4 位 ALU 控制码
- **主控制单元** → 7+1 个控制信号，按指令类型查表

---

## 一、引言（§4.1）

### CPU 性能三要素

| 要素 | 含义 | 决定因素 |
|------|------|---------|
| **指令数** (Instruction Count) | 程序包含多少条指令 | ISA 设计 + 编译器优化 |
| **CPI** (Cycles Per Instruction) | 每条指令平均花费的时钟周期 | CPU 硬件设计 |
| **时钟周期** (Cycle Time) | 每个时钟周期的时长 | CPU 硬件工艺 |

> 公式：CPU 执行时间 = 指令数 × CPI × 时钟周期

### MIPS 指令子集

本章围绕 8 条核心指令设计处理器：

| 类别 | 指令 | 说明 |
|------|------|------|
| **存储访问** | `lw`, `sw` | 加载/存储字 |
| **算术逻辑** | `add`, `sub`, `and`, `or`, `slt` | R 型运算 |
| **控制转移** | `beq`, `j` | 条件分支 + 无条件跳转 |

> 虽然只是子集，但覆盖了处理器设计的大部分关键问题。

---

## 二、逻辑设计基础（§4.2）

### 组合元件 vs 时序元件

| 类型 | 特点 | 示例 |
|------|------|------|
| **组合元件** (Combinational) | 输出仅取决于当前输入，无记忆 | 与门、加法器、多路选择器(MUX)、ALU |
| **时序元件** (Sequential/State) | 输出取决于输入 + 内部状态，有记忆 | 寄存器、存储器 |

### 时钟方法

- **边沿触发** (edge-triggered)：所有状态变化发生在时钟沿（上升沿或下降沿）
- 一个时钟周期内：读取状态 → 组合逻辑计算 → 时钟沿写入新状态
- 这是现代同步数字电路的基础

### 关键元件速查

| 元件 | 符号/功能 |
|------|----------|
| **AND 门** | Y = A & B |
| **加法器** | Y = A + B |
| **多路选择器 (MUX)** | Y = S ? I1 : I0（S 为选择信号） |
| **ALU** | Y = F(A, B)，F 由控制信号决定 |
| **寄存器** | D 触发器阵列，时钟沿存数据 |
| **寄存器堆** | 32 个 32 位寄存器，双端口读 + 单端口写 |

---

## 三、数据通路搭建（§4.3）

### 第一步：取指令（所有指令共用）

```
PC → 指令存储器 → 取出 32 位指令
         ↓
      PC + 4 → PC（准备下一条）
```

- **PC**（程序计数器）：存放下一条指令地址
- **指令存储器**：只读，输入地址 → 输出指令
- **加法器**：PC = PC + 4（每条指令 4 字节）

### 第二步：R 型指令数据通路

指令格式：`op | rs | rt | rd | shamt | funct`

```
rs ──→ [寄存器堆] ──→ Read Data 1 ──→
rt ──→ [寄存器堆] ──→ Read Data 2 ──→ [ALU] ──→ Result ──→ [寄存器堆] Write Data
                         ↑                            ↑
                      ALU control                rd（目标寄存器号）
```

需要：寄存器堆（双读 + 单写）、ALU、写回数据到 rd

### 第三步：Load/Store 指令数据通路

`lw rt, offset(rs)` / `sw rt, offset(rs)`

```
rs ──→ Read Data 1 ──→ [ALU] ──→ 地址 ──→ [数据存储器]
rt ──→ Read Data 2 ──┘  ↑ 计算            │
       (store时用作写入数据) │ 基址+偏移       ├── lw: 读出 → 写回 rt 的寄存器
                         │                  └── sw: 写入 rt 的寄存器值
                    offset → [符号扩展] →
```

关键部件：
- **符号扩展**（Sign-extend）：16 位立即数 → 32 位
- **数据存储器**：可读可写，读写信号由控制单元产生

### 第四步：分支指令数据通路

`beq rs, rt, offset`

```
rs ──→ Read Data 1 ──→ [ALU] ──→ Zero? ──→ 若 Zero=1，PC = PC+4 + offset×4
rt ──→ Read Data 2 ──┘  (相减)               若 Zero=0，PC = PC+4（顺序执行）

PC+4 ──→ [加法器] ──→
offset×4 ──────────┘（左移 2 位后）
```

- 通过 ALU 做减法比较两寄存器
- Zero 信号为 1 表示相等，触发分支
- 分支目标地址 = PC+4 + (sign-extended_offset << 2)

### 第五步：跳转指令数据通路

`j target`（J 型：op | 26-bit address）

```
跳转目标地址 = { PC+4[31:28], address, 00 }
               ↑ 高 4 位     ↑ 26 位    ↑ 补 0（字对齐）
```

- J 型指令低 26 位是字地址（不是字节地址）
- 与 PC+4 的高 4 位拼接形成 32 位目标地址

---

## 四、ALU 控制（§4.4）

### 两级解码

```
opcode (6位) → ALUOp (2位) → 结合 funct (6位) → ALU control (4位)
```

### 真值表（必记）

| opcode | ALUOp | 操作说明 | funct | ALU 功能 | ALU control |
|--------|-------|---------|-------|---------|-------------|
| `lw` | 00 | 加载字 | XXXXXX | add | 0010 |
| `sw` | 00 | 存储字 | XXXXXX | add | 0010 |
| `beq` | 01 | 相等分支 | XXXXXX | subtract | 0110 |
| R-type | 10 | 看 funct | 100000 | add | 0010 |
| R-type | 10 | 看 funct | 100010 | subtract | 0110 |
| R-type | 10 | 看 funct | 100100 | AND | 0000 |
| R-type | 10 | 看 funct | 100101 | OR | 0001 |
| R-type | 10 | 看 funct | 101010 | slt | 0111 |

### ALU control 编码速记

| 编码 | 功能 |
|------|------|
| 0000 | AND |
| 0001 | OR |
| 0010 | add |
| 0110 | subtract |
| 0111 | set-on-less-than |
| 1100 | NOR |

---

## 五、主控制单元（必考）

### 7 个控制信号（不含 Jump）

| 信号 | 含义 | R-type | lw | sw | beq |
|------|------|--------|----|----|-----|
| **RegDst** | 写回目标寄存器选择：0=rt, 1=rd | 1 | 0 | X | X |
| **ALUSrc** | ALU 第二操作数：0=寄存器, 1=立即数 | 0 | 1 | 1 | 0 |
| **MemtoReg** | 写回数据来源：0=ALU结果, 1=存储器 | 0 | 1 | X | X |
| **RegWrite** | 是否写寄存器 | 1 | 1 | 0 | 0 |
| **MemRead** | 是否读存储器 | 0 | 1 | 0 | 0 |
| **MemWrite** | 是否写存储器 | 0 | 0 | 1 | 0 |
| **Branch** | 是否为分支指令 | 0 | 0 | 0 | 1 |

> X 表示 don''t care（该信号不影响此指令的结果）

### 额外信号：Jump

- `j` 指令需要额外控制信号，由 opcode 直接译码
- Jump=1 时，PC 写入跳转目标地址而非 PC+4

### 三种指令格式

```
R-type:  op(6) | rs(5) | rt(5) | rd(5) | shamt(5) | funct(6)
          31:26   25:21   20:16   15:11    10:6       5:0

lw/sw:   op(6) | rs(5) | rt(5) |   offset(16)
          31:26   25:21   20:16     15:0

beq:     op(6) | rs(5) | rt(5) |   offset(16)
          31:26   25:21   20:16     15:0

jump:    op(6) |         address(26)
          31:26            25:0
```

### 数据通路全图（信号流动）

```
┌──────┐     ┌─────────┐     ┌──────────┐     ┌─────────┐     ┌───────┐     ┌──────┐
│  PC  │────→│ 指令存储 │────→│ 控制单元  │────→│ 寄存器堆 │────→│  ALU  │────→│数据存储│
└──┬───┘     └─────────┘     │ RegDst   │     │ 读取 rs  │     │ 运算  │     │读/写  │
   │                          │ ALUSrc   │     │ 读取 rt  │     └──┬───┘     └──┬───┘
   │  PC+4                    │ MemtoReg │     │ 写入 rd  │        │            │
   └──────────────────────────│ RegWrite │     └──────────┘        │            │
                              │ MemRead  │                          │            │
                              │ MemWrite │     ┌──────────┐        │            │
                              │ Branch   │     │ 符号扩展  │────────┘            │
                              └──────────┘     └──────────┘                      │
                                                offset(16)                        │
                                                                                 │
                              MemtoReg 选择写回数据来源 ←──────────────────────────┘
```

---

## 易错辨析

- **RegDst 的含义**：R 型写 rd（RegDst=1），lw 写 rt（RegDst=0）。不要搞混——lw 的 rt 在指令中是第二个寄存器字段，但在这里是**目标寄存器**。
- **ALUSrc**：lw/sw 的 ALU 第二操作数是符号扩展后的立即数（做基地址+偏移），R 型才是从寄存器读。
- **Branch 目标计算**：offset 是**相对 PC+4** 的偏移，且要**左移 2 位**（字对齐），单位是字不是字节。
- **Jump 地址拼接**：用 PC+4 的高 4 位 + 26 位字地址 + 00，不是 PC 的高 4 位。
- **MemtoReg for sw**：sw 不写寄存器，所以 MemtoReg 是 don''t care。

---

## 自测题

### 一、选择题

**1. CPU 执行时间由以下哪三项乘积决定？**

A. 指令数 × 时钟频率 × IPC
B. 指令数 × CPI × 时钟周期
C. CPI × MIPS × 时钟频率
D. IPC × 指令数 × 时钟周期

<details>
<summary>答案与解析</summary>

**答案：B**

执行时间 = IC × CPI × Cycle Time。指令数由 ISA 和编译器决定，CPI 和时钟周期由 CPU 硬件决定。

</details>

**2. 对于 R 型指令 `add rd, rs, rt`，控制信号 RegDst 应为：**

A. 0（写 rt）    B. 1（写 rd）    C. X（任意）    D. 取决于 funct

<details>
<summary>答案与解析</summary>

**答案：B**

R 型指令目标寄存器是 rd（15:11），所以 RegDst=1 选择 rd。lw 的目标是 rt（20:16），所以 RegDst=0。

</details>

**3. ALUOp=10 时，ALU 控制码由哪个字段进一步决定？**

A. opcode    B. shamt    C. funct    D. rs

<details>
<summary>答案与解析</summary>

**答案：C**

ALUOp=10 表示这是 R 型指令，具体操作由 funct 字段（5:0）决定。ALUOp=00（lw/sw）固定做加法，ALUOp=01（beq）固定做减法。

</details>

**4. `beq $t0, $t1, Label` 的分支目标地址计算公式为：**

A. PC + offset
B. PC + offset × 4
C. (PC+4) + offset × 4
D. (PC+4) + offset

<details>
<summary>答案与解析</summary>

**答案：C**

MIPS 的 branch 是相对 PC+4 的偏移，且 offset 是字偏移（需左移 2 位变字节地址）。

</details>

**5. 对于 `sw $t0, 8($sp)`，控制信号 MemRead 的值是：**

A. 0    B. 1    C. X    D. 取决于地址

<details>
<summary>答案与解析</summary>

**答案：A**

sw 只写存储器不读，MemRead=0, MemWrite=1。lw 相反：MemRead=1, MemWrite=0。

</details>

**6. Jump 指令的目标地址由哪几部分组成？**

A. { PC[31:28], address, 00 }
B. { (PC+4)[31:28], address, 00 }
C. { 00, address, 0000 }
D. { address, 000000 }

<details>
<summary>答案与解析</summary>

**答案：B**

跳转地址 = (PC+4) 的高 4 位 + 26 位 address + 2 位 00（字对齐）。注意是 PC+4 而非当前 PC。

</details>

### 二、简答题

**1. 列出 7 个主控制信号，并写出 R-type、lw、sw、beq 四种指令各自的控制信号值。**

<details>
<summary>参考答案</summary>

| 信号 | R-type | lw | sw | beq |
|------|--------|----|----|-----|
| RegDst | 1 | 0 | X | X |
| ALUSrc | 0 | 1 | 1 | 0 |
| MemtoReg | 0 | 1 | X | X |
| RegWrite | 1 | 1 | 0 | 0 |
| MemRead | 0 | 1 | 0 | 0 |
| MemWrite | 0 | 0 | 1 | 0 |
| Branch | 0 | 0 | 0 | 1 |

</details>

**2. 解释组合元件和时序元件的区别，各举两个例子。**

<details>
<summary>参考答案</summary>

- **组合元件**：输出仅由当前输入决定，无状态记忆。例：ALU、多路选择器（MUX）。
- **时序元件**：输出由输入和内部状态共同决定，有记忆功能。例：寄存器（PC）、数据存储器。
- 时序元件在时钟沿更新状态，这是边沿触发同步设计的基础。

</details>

**3. 简述从 PC 取指令到 R 型指令执行完成的数据流动过程。**

<details>
<summary>参考答案</summary>

1. PC 输出地址 → 指令存储器 → 取出 32 位指令
2. 同时 PC+4 加法器计算下一条地址
3. 指令字段 rs、rt 作为读地址 → 寄存器堆输出两个读数据
4. ALU 接收两个读数据，ALU control 根据 funct 确定运算
5. ALU 结果通过 MemtoReg=0 选择，写回寄存器堆的 rd
6. RegWrite=1 使能写，RegDst=1 选择 rd 为目的寄存器

</details>

