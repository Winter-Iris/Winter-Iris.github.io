---
title: 最优二叉查找树-动态规划
description:  最优二叉查找树-动态规划
category: 算法
published: 2026-01-19
tags:
  - c++
  - 算法
  - 动态规划
---
## 定义

**最优二叉搜索树(optimal binary search tree)**：给定一个由 $n$ 个互不相同的关键字组成的序列 $K=⟨k1,k2,…,kn⟩$ ，其中 $k1<k2<⋯<kn$ ，用这些关键字构造一棵二叉搜索树。对于每个关键字 $ki$，查找其的的概率为$pi$ ，可能有些被查找的关键字不在 $K$ 中，我们需要构造 $n+1$ 个虚关键字 $d0,d1,d2,…,dn$ ，其中 $d0<k1$ ， $dn>kn$ ， $ki<di<ki+1$ ，其中 $i=1,2,…,n−1$ ，对于每个关键字 $di$ ，查找其的的概率为 $qi$ 。每个关键字 $ki$ 对应二叉搜索树中一个内部结点，每个虚关键字 $di$ 对应二叉搜索树中一个叶结点，这样每次查找关键字如果查找成功，那么最终落在 $ki$ ，如果查找失败，那么最终落在 $di$ 。且有$\sum_{i=1}^np_i+\sum_{i=0}^nq_i=1$。

## 题意

设二叉搜索树的关键字按从小到大的顺序为 a1,a2,…,an(∀i<j,ai<aj)，搜索频率表示为 q0,p1,q1,p2,q2,…,qn−1,pn,qn，其中 pi 表示搜索关键字是 ai 的频率，qi 表示搜索关键字在 ai−1 和 ai 之间的频率（这里我们令 a0=−∞,an+1=+∞）。定义搜索代价为这次搜索访问的结点个数，对于存在的关键字，代价为对应结点的深度；对于不存在的结点，代价为某个虚结点的深度。求代价的最小期望。

## 题解

### 代价计算公式

- 一棵树的期望搜素代价为根节点到每个节点的查找次数(深度+1)乘以该节点的搜索概率的乘积之和。


$$
\begin{aligned}\operatorname{E}[\text{search cost in }T]
&=\sum_{i=1}^n(\mathrm{depth}_T(k_i)+1)\cdot p_i+\sum_{i=0}^n(\mathrm{depth}_T(d_i)+1)\cdot q_i\\
&=\sum_{i=1}^{n} depth_T(k_i)p_i +\sum_{i=0}^{n}depth_T(d_i)q_i +  \sum_{i=1}^{n} p_i +\sum_{i=0}^{n} q_i\\
&=1+\sum_{i=1}^n\mathrm{depth}_T(k_T)\cdot p_i+\sum_{i=0}^n\mathrm{depth}_T(d_i)\cdot q_i\\
\end{aligned}
$$


### 确定状态

- $E[i,j]$为关键字$k_i,k_{i+1},\dots ,k_{j}$组成的二叉搜索树的搜索期望代价。

$$E[i,j]=\sum_{i=1}^{n} depth_T(k_i)p_i +\sum_{i=0}^{n}depth_T(d_i)q_i +  \sum_{i=1}^{n} p_i +\sum_{i=0}^{n} q_i$$

- $w[i,j]$为关键字$k_i,k_{i+1},\dots ,k_{j}$组成的二叉搜索树的搜索概率和。

$$w[i,j]=\sum_{l=i}^jp_l+\sum_{l=i-1}^jq_i$$

### 确定状态转移方程

- 若存在一个$r$在$[i,j]$中，且$k_r$为根节点，则其左子树键序列为$<k_i,k_{i+1},\dots,k_{r-1}>$，右子树键序列为$<k_{r+1},\dots,k_j>$，将上述式子拆分成左右子树两个部分。
- 注：在子树中搜索一个节点的查找次数为$depth+1$，而子树在整棵树中的查找次数中还要加上查找整棵树的根节点一次，故为$depth+2$。


$$
\begin{aligned}
E[i,j]&= p_r+ \sum_{l=i}^{r-1}(depth_{T_{left}}(k_l)+2)p_i+\sum_{l=i-1}^{r-1}(depth_{T_{left}}(d_l)+2)q_i \\ &+\sum_{l=r+1}^{j}(depth_{T_{right}}(k_l)+2)p_i+\sum_{l=r}^{j}(depth_{T_{right}}(d_l)+2)q_i\\
&=p_r+E[i,r-1]+E[r+1,j]+\sum_{l=i}^{r-1} p_l +\sum_{l=i-1}^{r-1} q_l+\sum_{l=r+1}^{j} p_l +\sum_{l=r}^{j} q_l\\
&=p_r+E[i,r-1]+E[r+1,j]+w[i,r-1]+w[r+1,j]\\
&=E[i,r-1]+E[r+1,j]+w[i,j]
\end{aligned}
$$


- 且当$j = i - 1$时，此时子树中只有虚拟键，期望搜索代价为$E[i,i - 1] = q_{i-1}$.
- 故状态确定转移方程为

$$
E[i,j]=\begin{cases}q_{i-1}&\text{when }j=i-1\:,\\\min_{i\leq r\leq j}\{E[i,r-1]+E[r+1,j]+w(i,j)\}&\text{when }i\leq j\:.\end{cases}
$$

### 代码实现

```cpp
#include<bits/stdc++.h>
using namespace std;
const int N = 1e3+5;
const double INF = 1.0/0.0;
int n;
double p[N],q[N];
double dp[N][N],w[N][N];
signed main()

{
    cin>>n;
    for(int i=1;i<=n;i++) {
        cin>>p[i];
    }
    for(int i=0;i<=n;i++) {
        cin>>q[i];
    }
    //确定初状态
    for(int i=1;i<=n+1;i++) {
        dp[i][i-1] = q[i-1];
        w[i][i-1] = q[i-1];
    }
    //按对角线遍历
    for(int k=1;k<=n;k++) {
        for(int i = 1; i<=n-k+1;i++) { //从第1行到第n-k+1行
            int j = i+k-1; //对应行数对角线元素所在列数
            dp[i][j] = INF; //初值为无穷大
            w[i][j] = w[i][j-1]+p[j]+q[j]; //维护w
            for(int r=i;r<=j;r++) {
	            //状态转移
                double val = dp[i][r-1]+dp[r+1][j]+w[i][j];
                if(val<dp[i][j]) dp[i][j]=val;
            }
        }
    }
	
    cout<<dp[1][n]<<"\n";
    return 0;
}
```