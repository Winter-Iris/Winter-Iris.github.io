---
title: CS61b:Week 5
description: preview of Proj.2
category: CS61B
published: 2026-01-19
tags:
  - java    
  - cs61b
---
### Command Line Programming

- Java代码运行的过程
	- 要先经过javac编译，再通过java解释，才能被运行。
	- Hello.java-->javac(Compiler)-->Hello.class-->Java(Interpreter)-->Code Running

- `String[] args`
	- 静态主函数接受的参数`String[] args` 实际上是接受的是**命令行参数**。

### Git

- Git is just a program in C language.
- Git是一个版本管理系统。

- 工作原理
	- 每次提交对文件的更改时，git会存储整个仓库的副本在一个秘密文件夹中。
	- 每次提交一个版本时，复制所有的内容到该文件夹的一个子目录下。
	- checkout，删除当前文件夹的所有内容，并从请求的子目录中复制所有内容。

- 避免冗余
	- 只存储更改过的文件，而不是整个仓库，可以把避免存储冗余文件。
	- checkout（一种方法）：一次一个浏览提交的文件，并找到最新的版本。
	- 我们可以用数据结构存储提交列表。
	- 所以每一次提交的是一个映射，（或词典），对于每一个文件名，都会映射一个版本号对应相应的文件名。

- 哈希在git的使用
	- 使用哈希作为版本号。
		- git实际上是使用`git-SHA1 hash`作为版本号
			- SHA1是一个确定性函数，对于同样对象的输入（同一个文件），返回的是同一个hash值。
			- SHA1的哈希有160位的长度。
		- `git hash-object HelloWorld.java` 获取对应文件的哈希值。
	- git的使用hash的过程
		- 首先为文件计算一个哈希值，
		- 然后在.git/目录下创建一个子目录，在子目录中取对应哈希值的前两位作为新的子目录，储存对应的文件（压缩节省空间），文件名为哈希值前两位以外的数字。
	- hash-bug：两个文件有可能对应同一个hash值。（概率极低）

- git的提交信息也会被一并存储到仓库中
	- 每个提交都有一个id，git将每次提交对应的哈希值作为id
	- 提交信息包含：
		- 作者
		- 日期
		- 留言(message)
		- 全部文件的列表以及他们的版本
		- 父级提交信息的id（上一次提交信息）

- Branching
	- 创建一个原仓库的副本作为新的分支，在此分支上的修改不会影响到其他分支。
	- 分支合并：
		- 当在另一个独立的分支修改工作完成时，可以和原分支合并在一起，实现修改原分支
	- 合并冲突：
		- 必须手动修复冲突，并重新提交，成为主分支的一部分。
		- 重新提交后，新的这次提交信息**会存在两个父级提交**信息。
	- 分支并不是链表结构，而是更一般的结构--图。

### `Serializable`

- java内置了一个`Serializable`接口，作为序列化的内置特性，允许你存储任何对象
```java
public class Commit implements Serializable {
	public String author;
	public String date;
	public String commitMessage;
	public String parentID;
	...
}
```

### 算法分析

- 由于执行语句的次数与计算机硬件，编程语言无关，只依赖于输入，于是我们通过随输入规模的增大，算法的速度如何随输入规模的增大而变化，（*渐进时间复杂度*）来衡量算法的好坏。
- 渐进分析
	- 运行时间的增长阶：算法所花的时间与输入的数据规模之间的关系
	- 常见的增长阶的比较：
$$O(1)<O(n)<O(nlog {n})<O(n^2)<O(n^3)<O(n^k)<O(2^n)<O(k^n)<O(n!)$$

- 算法运行的时间不仅跟输入的数据规模有关，还与输入的数据本身有关，对于不同的输入，其数据规模一致，运行时间可能不一致。因此我们主要考虑最坏的情况，即最坏时间复杂度。
- 定义
	- $R(N)\in \Theta (f(n))$ 等价于$\exists k_1,k_2\space,s.t.\space k_1f(N) \le R(N) \le k_2f(N)$，即同阶等于
	- $R(N)\in \Omega(f(n))$ 等价于$k_1f(N) \le R(N)$   ，即大等于
	-  $R(N)\in O(f(n))$ 等价于$R(N) \le k_2f(N)$  ，即小等于
- 常见的渐进分析公式
	- $O(a_kn^k+a_{k-1}n^{k-1}+\dots+a_1n^{1}+a_0n^0) = O(n^k)$ 
	- $T(n) = T_1(n)+T_2(n)=O(f(n))+O(g(n))=O(max\{f(n),g(n)\})$ 
	- $T(n)=T_1(n)*T_2(n)=O(f(n))\times O(g(n))=O(f(n)\times g(n))$ 