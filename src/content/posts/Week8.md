---
title: CS61b:Week 8
description: 优先队列，堆，图
category: CS61B
published: 2026-01-19
tags:
  - java    
  - cs61b
  - 数据结构
---
## Priority Queue(优先队列)

- 优先队列ADT是一种数据结构，它支持插入和删除最小值操作（返回并删除最小元素）或删除最大值操作（返回并删除最大元素）.
- 使用有序数组，二叉搜索树，哈希表来实现优先队列时，均有缺陷存在，因此我们使用一种新的数据结构--堆(*Heap*)

### 接口

```java
/*(Min) Priority Queue*/
public interface MinPQ<T> {
	public void add(T x);
	public T getSmallest();
	public T removeSmallest();
	public int size();
}
```

### 使用二叉最小堆实现优先队列
### 不同实现方式的比较

|                | Ordered Array | Bushy BST              | Hash Table  | Heap                   |
| -------------- | ------------- | ---------------------- | ----------- | ---------------------- |
| add            | $\Theta(N)$   | $\Theta(log \space N)$ | $\Theta(1)$ | $\Theta(log \space N)$ |
| getSmallest    | $\Theta(1)$   | $\Theta(log \space N)$ | $\Theta(N)$ | $\Theta(1)$            |
| removeSmallest | $\Theta(N)$   | $\Theta(log \space N)$ | $\Theta(N)$ | $\Theta(log \space N)$ |


## Heap(堆)

### 二叉最小堆

#### 定义：

一棵二叉树的基础上，树必须是完整的(可以有缺少的项目，但是必须在最底层，所有的节点都要**尽可能地向左推**)，**每个节点的值必须小于或等于其两个子节点的值**（可以有重复元素）

![](https://s2.loli.net/2024/11/09/4rlkSFTQzjW61Uu.png)

#### 操作：
- 获取最小值：堆中最小的项目始终位于根处。
- 插入元素：先在堆的最后靠左添加新项目，然后判断它的值是否小于父节点的值，若小于则- 交换位置(向上爬树)
- 删除最小值：将最底层靠最右侧的元素与根节点交换，删去原来的根节点。再将现在的根节点下沉到适当的位置(每次与两个子节点的较小节点交换)。
- 复杂度均为$O(log(n))$


## 树的实现方法

### Method1

- 使用实例变量存储其他节点的地址（引用）
```java
//一个三节点的树的实现
public class Tree1<Key> {
	Key k;
	Tree1 left;
	Tree1 middle;
	Tree1 right;
}
```

### Method2

- 使用数组存储子节点的地址
```java
//一个多节点的树的实现
public class Tree2<Key> {
	Key k;
	Tree2[] children;
}
```

### Method3

- 左儿子-右兄弟表示法
```java
//一个多节点的树的实现
public class Tree3<Key> {
	Key k;
	Tree3 child;   //子节点
	Tree3 sibling; //兄弟节点
}
```

![](https://s2.loli.net/2024/11/09/FnI9YcJovhXmMqU.png)

### Method4

- 数组表示法（与并查集的表示类似）
- 对每个节点进行编号，键数组存储对应编号节点的键，父数组存储对应节点的父节点的编号。
```java
public class Tree4<Key> {
	Key[] keys;
	int[] parents;
}
```

![](https://s2.loli.net/2024/11/09/qCLJeMXQTzRA1w4.png)

- 对于编号为$N$的节点
- 父节点的编号为$N/2$
- 左孩子的节点编号为$2N$
- 右孩子的节点编号为$2N+1$

## Tree-Traversal(树的遍历)

### DFS(Depth-First-Search)深度优先搜索

- 沿着每一个分支路径遍历直到到达叶节点。如果到达叶节点，向上回溯，回到叶节点之前的那一个节点，接着遍历该节点未被访问过的子节点。一直重复这个过程直到所有的节点把遍历完。
- 对于这棵树，分别进行三种DFS方式的遍历节点的顺序如下

![](https://s2.loli.net/2024/11/09/2nth75bgKwJSUWe.png)

#### 先序遍历

- 遍历顺序：DBACFEG
```java
//伪代码
preOrder(BSTNode x) {
	if(x==null) return;
	print(x.key);
	preOrder(x.left);
	preOrder(x.right);
}
```
- 可以用来显示树的机构
#### 中序遍历

- 遍历顺序：ABCDEFG
```java
//伪代码
inOrder(BSTNode x) {
	if(x==null) return;
	inOrder(x.left);
	print(x.key);
	inOrder(x.right);
}
```

#### 后序遍历

- 遍历顺序：ACBEGFD
```java
//伪代码
postOrder(BSTNode x) {
	if(x==null) return;
	postOrder(x.left);
	postOrder(x.right);
	print(x.key);
}
```
- 可以在一直子文件的大小计算总大小的时候使用
#### 不同遍历顺序的记忆方法

![](https://s2.loli.net/2024/11/09/bUuhFNkx8nSRw6t.png)

- 画出树的轮廓线
- 前序遍历：每次经过节点左侧时访问节点(124578369)
- 中序遍历：每次经过节点底部时访问节点(427581369)
- 后序遍历：每次经过节点右侧时访问节点(478529631)

### BFS(Breadth-First Search)广度优先搜索

- 比如从顶部到底部，从左到右依次遍历。
- 对应上图树的遍历顺序：123456789

## Graph(图)

- 图是树的更加一般的结构。
### 图的组成与定义：

- 节点（顶点）
- 边（连接两个节点的路径）
- 树与图的区别：树中没有环存在，而图中可以有环，树是没有环的图。
- 邻接：两个节点通过边相连，则它们就是相邻的
- 权重：在边上加上数字权重
- 路径：一系列由边连接的节点。(简单路径：没有重复节点的路径)
- 循环：起点和终点是相同节点的路径
- 连通：如果两个节点之间有路径，则这两个节点连通。如果所有节点之间都有路径，则图是连通的。
### 图的分类

- 简单图：
	- 没有连接自己的边。
	- 没有两条连接相同节点的边。
- 有向图(Directed)：
	- 边是有箭头（方向）之分的
- 无向图(Undirected)：
	- 边没有方向的概念。
- 有环图(Cyclic)：图中存在环状结构。
- 无环图(Acyclic)：图中没有环状结构。
- 加权图

### 著名的图问题

- s-t路径连通性：两个节点之间是否连通
- 连通性问题：整个图是否连通
- 双连通性问题：是否存在一个节点，删除后将图分为两个不相连的部分。
- 最短路径问题：两个节点之间的最短路径是什么
- 环问题：图中是否有循环存在
- 欧拉环游：可以在遍历不重复节点的情况下遍历完整个图吗
- 哈密顿圈：可以在遍历不重复边的情况下遍历完整个图吗
- 同构性：判断两个图是否相同
- 平面性：可以画出没有交叉边的图吗

### s-t路径连通性

- 判断两个节点之间是否存在路径使它们相连通。
- 从一个s节点开始，判断一个节点是否是t节点，若是，返回true；若不是，则对其邻居节点进行判断，并且不检查已经检查过的节点。当检查到一个节点没有邻居时，且该节点不是t节点，则返回false。(DFS)

## 图的实现

### API
- 例子：
```java
//顶点均为整数
public class Graph {
	public Graph(int v);                //创建v个顶点数的空图
	public void addEdge(int v,int w);   //在两个节点添加边
	Iterable<Integer> adj(int v);       //v的相邻节点
	int V();                            //节点数
	int E();                            //边数
}
```

### 构建

#### Method1：邻接矩阵

- 创建一个二维列表，记录两个节点之间是否存在边的关系。
- 缺点：节点数量大时，十分不便。

![](https://s2.loli.net/2024/11/09/7GbcI8KBVHD6MRk.png)
#### Method2：边集合(几乎不考虑)

- 创建一个集合，包含所有边（边用其相连的两个节点组成的数对表示）
#### Method3：邻接表

- 创建一个数组，每个元素储存对应索引节点的邻接节点。
- 时间复杂度$O(V+E)$ ，其中V是顶点数，E是边数。
![](https://s2.loli.net/2024/11/09/tnUdGKPoXhZ132w.png)

### 遍历

#### DFS
- 深度优先搜索：从一个顶点开始，沿着一条路一直走到底，如果发现不能到达目标解，那就返回到上一个节点，然后从另一条路开始走到底，这种尽量往深处走的概念即是深度优先的概念。
- 前序遍历：在遍历子图前，先对该节点调用函数
- 后序遍历：在遍历子图后，再对该节点调用函数
```java
public class DepthFirstPath {
	//存储是否标记的状态，防止重复访问
	private boolean[] marked;
	//记录走过的节点
	private int[] edgeTo;
	private int s;
	//接口
	public DepthFirstPaths(Graph G,int s) {
		dfs(G,s);
	}
	//实现
	private void dfs(Graph G,int v) {
		//标记已经访问的节点
		marked[v] = true;
		//遍历相邻节点
		for(int i : G.adj(v)) {
			//判断是否已经访问
			if(!marked(i)) {
				//先序遍历
				edgeTo[i] = v;
				dfs(G,i)
			}
		}
	} 

}
```

#### BFS

- 广度优先搜索：从一个节点开始，逐层访问节点(距离该节点相同的节点为同一层节点)，逐步遍历节点。
- 时间复杂度$\Theta(V+E)$
##### 使用队列实现BFS

###### 队列(FIFO)

- 队列是一种常见的数据结构，基本操作如下：
- 进队：在队列末尾添加元素
- 出队：将队列的首个元素移除

###### 实现

- 每次访问一个元素时，将其标记(防止重复访问同一个元素)，且进入队列。
- 然后该节点出队，对该节点执行操作，且将其未标记相邻节点全部依次进队(标记)。
- 然后队列元素依次出队，执行操作，将其未标记相邻节点全部依次进队(标记)。
- 由于每个节点的相邻节点都在队列末尾，队列的顺序保证了逐层访问的实现。
- 伪代码
```java
public class BreadthFirstPaths {
	//储存标记状态
	private boolean[] marked;
	//存储路径(每个节点的下一个节点)
	private int[] edgeTo;
	private void bfs(Graph G,int s) {
		//队列创建
		Queue<Integer> fringe = new Queue<>();
		//标记进队
		fringe.enqueue(s);
		marked[s] = true;
		//按队列顺序处理节点
		while(!fringe.isEmpty()) {
			int v = fringe.dequeue();
			for (int w: G.adj(v)) {
				if(!marked[w]) {
					fringe.enqueue(w);
					marked[w] = true;
					edgeTo[w] = v;
				}
			}
		}
	}
}
```

### Lab8通关啦！