---
title: CPU汇编入门
description: 计算机导论的复习~
category: 计算机导论
published: 2026-01-19
tags:
  - 计算机导论
---
## CPU的核心部件

### 程序计数器(Program Counter,PC)

 - 程序计数器属于一个特殊的寄存器，始终指向主存中的某条命令语句。
 - CPU通过读取PC指向的那条命令来执行。
 - 顺序执行语句时，PC每次加上一个单位（一个命令所占的内存大小），自动指向下一条要执行的语句。
### 指令寄存器(Instruction Register,IR)

- 用来存放从主存中读取的某条命令。
### 算术逻辑单元(ALU)

- CPU用于计算的部件。

## 汇编指令

- 定义：汇编语言（assembly language）是一种用于电子计算机、微处理器、微控制器或其他可编程器件的低级语言，亦称为符号语言。在汇编语言中，用助记符代替机器指令的操作码，用地址符号或标号代替指令或操作数的地址。汇编语言又被称为第二代计算机语言。
- 不同的CPU有内置不同的汇编指令集。（如：arm,x86......）
- 最简单的汇编程序的组成：CPU从主存读取程序到寄存器（命令，变量），CPU进行计算，CPU将结果放回主存。

### SEAL指令

- `load R1,(address)`：读取到寄存器，从地址读取值存入寄存器R1
- `mov R1,C`：赋值，把值C赋值给寄存器R1
- `add R1,R2,C` ：加法运算，把`R2+c`的结果赋值给寄存器R1
- `sub R1,R2,C`：减法运算，把`R2-c`的结果赋值给寄存器R1
- `mul R1,R2,C`：乘法运算，把`R2*c`的结果赋值给寄存器R1
- `div R1,R2,C`：除法运算，把`R2//c`的结果赋值给寄存器R1
- `shiftl R1,R2,C` ：左移运算，把`R2<<c`的结果赋值给寄存器R1
- `shiftr R1,R2,C`：右移运算，把`R2>>c`的结果赋值给寄存器R1
- `and R1,R2,R3`：与运算，把 `R2&R3` 的结果赋值给寄存器R1
- `or R1,R2,R3`：或运算，把 `R2|R3` 的结果赋值给寄存器R1
- `xor R1,R2,R3`：异或运算，把 `R2^R3` 的结果赋值给寄存器R1
- `store (address),R2`：保存到主存，把寄存器R2的值保存到主存的某个地址处
- `slt R1,R2,R3`：*(set if less than)* 判断值大小R2是否小于R3，结果存到寄存器R1
	- 若`R2<R3`,`R1=1`；否则`R1=0`
- `sle R1,R2,R3`：*(set if less than or euqal to)* 判断值大小R2是否小等于R3，结果存到寄存器R1
	- 若`R2<=R3`,`R1=1`；否则`R1=0`
- `beqz R1,Label`：*(branch equal zero)* 判断0跳转，如果R1值为0，则跳转到标签Label处。
- `bneqz R1,Label`：*(branch not equal zero)* 判断0跳转，如果R1值不为0，则跳转到标签Label处。
- `goto Label`：直接跳转至标签Label处。
- `_pr R1`：打印出R1的值。
- `_data first_address,[a0,a1,a2,…,an]`：一次存储多个数，按顺序存储。第一个操作数为要存储一组数据的首地址，第二个操作数为所要存储的一组数，依次将该组数存储在以首地址开始递增的内存中，一般首地址都是比较小的地址。

## 简单的SEAL程序

### `a=a+1`

- 简单三步走：读取，计算，保存
```
# 假设a储存在主存地址300处
load R1,(300)
add R1,R1,1
store (300),R1
```

### if选择语句的实现

- python
```python
if R1<R2:
	# 语句块A
else:
	# 语句块B
```

- SEAL
```
slt R3,R1,R2
beqz R3,L1 # 若R3==0（R1>=R2），跳转至L1

# 语句块 A
goto L2 # 跳过不执行L1处的语句块

L1:
# 语句块 B

L2: # if结束
```

### 循环结构的实现

#### while循环

- python
```python
while R1<R2:
	# 语句块 A
#语句块 B
```

- SEAL
```
Lwhile:
slt R3,R1,R2
beqz R3,L1     # 判断是否退出循环

# 语句块 A
goto Lwhile    # 跳转实现循环

L1：
# 语句块 B
```

#### for循环

- c++
```cpp
for(int i=0;i<10;i++) {
	//语句块 A
}
//语句块 B
```

- SEAL
```
mov R1,0 # 循环计数变量
mov R2,10 # 循环边界值

Lfor:
slt R3,R1,R2
beqz R3,L1    # 判断是否退出循环
# 语句块 A
add R1,R1,1   # 更新循环计数变量
goto Lfor     # 跳转循环

L1:
# 语句块 B 
```

### 位运算的小技巧

#### 判断一个数是否为偶数

- 将一个数`a`与1进行与运算，若a为奇数则返回1，否则返回0。

#### 判断两个数是否相等

- 将两个数`a` , `b`进行异或运算，若相等则返回0，否则返回非0数。

#### 左/右移实现乘/除法

- 将一个数a左移n位得到的结果为：$a\times 2^{n}$
- 将一个数a右移n位得到的结果为：$\frac{a}{2^n}$

#### 实现位取反

- 对**一位**二进制数`a`取反可以由`a^1`得到
- 对**N位**二进制数`a`取反可以由`a^111...111(N个1)`得到

### if语句的扩展

#### if的大于条件实现

- python
```python
if R1>R2:
	# 语句块 A
# 语句块 B
```

- SEAL
```
# 由sle条件取反得到
sle R3,R1,R2
xor R3,R3,1   
beqz R3,L1

# 语句块 A
L1:
# 语句块 B 
```

#### if的等于条件实现

- python
```python
if R1==R2:
	# 语句块 A
# 语句块 B
```

- SEAL
```
xor R3,R1,R2
bneqz R3,L1
# 语句块A

L1:
# 语句块B
```

#### 简单的程序实例1

- **if的多分支实现**：python
```python
a = 10
b = 4
if a == b:
    print(1)
elif a<b:
    print(0)
else:
    print(2) 
```
- SEAL
```
mov R0,10 #a
mov R2,4 #b
xor R3,R0,R2
bneqz R3,L1 #a!=b ->L1
# a==b
mov R1,1
goto L3

L1:
slt R4,R0,R2
beqz R4,L2
# a<b
mov R1,0
goto L3

L2:
#a>b
mov R1,2
goto L3

L3:
_pr R1
```

#### 简单的程序实例2

- **数组求和**：python
```python
l = [2,1,4,1,5,6,1,7,2,1,3,4]
sum = 0
for i in range(len(l)):
    sum += l[i]
print(sum)
```
- SEAL
```
_data 1,[2,1,4,1,5,6,1,7,2,1,3,4]
mov R0,1 # 首地址
mov R1,0 # 储存总和
mov R3,0 # 循环计数变量

Lfor:
slt R4,R3,12
beqz R4,L1
load R5,0(R0)
add R1,R1,R5
add R0,R0,1
add R3,R3,1
goto Lfor

L1:
_pr R1
```

## 函数的调用逻辑

### Stack--栈

- **栈**是一种**先进后出**(FILO)的数据结构，有两个基本操作，入栈（在栈顶添加元素），弹栈/出栈（弹出栈顶元素）。
- 栈是函数调用的储存形式。

### 栈帧(Frame)

- 当调用一个函数时，会在栈顶开辟一空间用于存储函数的信息（局部变量，返回地址），这一块区域叫做栈帧。函数调用结束时即从栈顶弹出。

### 建栈步骤

- 当调用一个函数时要建立相应的栈帧，按以下步骤进行建立：
	- 若有参数，参数先入栈（按参数接受的顺序的反序入栈）
	- 将PC中的地址入栈（作为调用函数的返回地址）
	- 将FP中的地址入栈（将旧的FP地址入栈，便于函数调用结束时恢复）
	- 将函数的局部变量入栈

### 栈指针

#### SP(Stack Pointer)

- 栈顶指针SP，始终指向一个栈帧的顶部，CPU将栈帧的顶部地址保存在寄存器SP中

#### FP/BP (Frame Pointer/Base Pointer)

- FP指针始终指向一个栈帧的底部，CPU将栈帧的底部地址保存在寄存器FP中

### 相关的SEAL指令

- `call Lable` ：调用函数，巨指令，执行两件事，将PC值push入栈，然后执行`goto Lable`。
- `push Value`：将值Value放入栈顶。
	- 其内部的操作步骤为：`sub sp,sp,1`（将sp往栈顶方向推移一个单位，开辟一个单位的空间用于存储数据）， `store 0(sp),R1`（将寄存器R1的值放入sp指向的内存）。
- `pop R1`：将栈顶的数值取出赋给寄存器。
	- 其内部的操作步骤为：`load R1,0(sp)`（将sp指向地址的值读取到寄存器R1）,`add sp,sp,1`（将sp往栈底方向推移一个单位）。
- `ret` ：函数返回，即`pop pc`，接受返回地址

### 函数调用的建栈模板

- 程序开头处，初始化栈
```
mov R15,100  # 将栈底指针fp的初始地址设置为100
mov sp,R15   # sp=fp
sub sp,sp,x  # 从sp开始向上开辟x个空间给局部变量存储
```

- 函数调用前，传递参数
```
# 保存参数原始值
store -1(R15),R4
store -2(R15),R3
store -3(R15),R2
store ...

# 传递参数，参数入栈（按参数顺序反序入栈）
push R4
push R3
push R2
```

- 函数调用开始时，建立栈帧
```

call Lfunc

Lfunc:
push R15    # 旧的fp入栈
mov R15,sp  # fp=sp
sub sp,sp,x # sp向栈顶方向移动，开辟x个空间给x个局部变量

# 将临时变量入栈（在函数内部更改的变量）
push R2
push R3
push ...

# 读取参数到寄存器
load R2 2(R15)   # 第一个参数在FP下面两个单位（旧的FP,返回地址）
load R3 3(R15)   # 后面逐步增加1
load ...
```

- 函数调用结束时恢复栈帧

```
# 弹出临时变量，恢复变量的初始状态（按push的反序弹出）
pop ...
pop R3
pop R2

# 栈帧的恢复
mov sp,R15   # sp=fp
pop R15      # 弹出旧的FP值
ret          # 函数返回,pop pc
```

### 函数调用的程序实例--递归调用

- python
```python
# 找到x的因数
 def factors(x):  		
     y=x//2
     for i in range(2,y+1):
# 发现i是x的因数
         if (x %i ==0):             
             print("Factor:",i);
# 递归调用自己，参数变小是x//i
             factors(x//i)	
# 跳出for循环
             break  		
# 假如离开循环正常，没有碰到break，就执行else内的print，x是质数
     else:  
         print("Prime Factor:",x)
     # print("参数x:%d, 变量y:%d" %(x,y))
     return
 factors(18)
```

- SEAL
```
# 初始化栈
mov R15,100  # R15即为栈底指针，100为初始地址
mov sp,R15   # 更新sp的指向
sub sp,sp,1  # 按需分配空间

# 参数
mov R2,18

# 保存参数
store -1(R15),R2

# 参数进栈
push R2

# 调用函数
call Lfactor
goto LL


Lfactor:
# 建栈
push R15
mov R15,sp
sub sp,sp,1

# 临时变量入栈
push R2
push R3
push R4
push R5
push R6
push R7
push R8
push R9

# 读取参数
load R2,2(R15) # x
# 初始化临时变量
div R3,R2,2    # y
mov R4,2       # i
add R5,R3,1    # 边界

# 进入for循环
Lfor:
slt R6,R4,R5
beqz R6,L1

div R7,R2,R4
mul R7,R7,R4 # R7 = x//i*i
xor R8,R7,R2 # 判断 x//i*i==x

bneqz R8,L2
# x//i*i==x
_pr "Factor:",R4

# 调用本身
div R9,R2,R4
store -1(R15),R9
push R9

call Lfactor
# break
goto L3


L2:
# x//i*i!=x
add R4,R4,1
goto Lfor


L1:
# 正常退出for循环
_pr "Prime Factor:",R2


L3:
# break
_pr "参数为：",R2
goto Lret

Lret:
# 弹出临时变量，并返回
pop R9
pop R8
pop R7
pop R6
pop R5
pop R4
pop R3
pop R2

mov sp,R15
pop R15
ret

LL:
```