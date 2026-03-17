---
title: zkw线段树--非递归线段树
published: 2026-03-17
pinned: false
description: zkw线段树的板子
image: ""
tags:
  - 算法
  - 数据结构
  - 线段树
  - zkw线段树
category: 算法
draft: false
---



- 递归式线段树，无论是建树、修改还是查询，都是**自顶向下**的。
- zkw线段树是非递归线段树，正好反过来，即**自底向上**。具体来说，就是先把线段树填充成满二叉树（堆式存储），之后就可以直接找到叶节点，然后回溯上去了
- 满二叉树有很好的性质：设一共有$n$个叶子节点，
	- 若某叶子节点退化的线段为$[x,x]$，则其编号为$x+n$
	- 整棵树一共有$2n-1$个节点
	- 一共有$H=\log_2n+1$层，第$i$层有$2^{i-1}$个节点。且该层线段长度为$2^{H-h}$
	- 若某节点编号为$p$，其左右孩子为$2p,2p+1$，其父亲为$\lfloor p/2\rfloor$
	- 若两兄弟节点编号为$p,q$，则$p\oplus q=1$
	- 除根结点外，编号为偶数的节点都是某个节点的左节点，编号为奇数的节点都是某个节点的右节点。

# 建树

- $n$为原数组长度，$N$为满二叉树叶子数量。
- 要构建出这样一棵满二叉树，需要让$N$是 $2$ 的整数幂。
- $N=2^{\lceil\log_2{(n+1)}\rceil}$，为了**确保树深足够、且编号不越界**。因为有时会访问到 `r+1`、`l-1` 等边界编号。
```cpp
#define ll long long
struct segTree
{
    ll n,N;
    vector<ll> d;

    void build(ll n) {
        this->n = n;
        N=1;
        while(N<=n+1) N<<=1; 
        d.resize(N<<1);
        mark.resize(N<<1);
        // 初始化叶子节点
        for(int i=1;i<=n;i++) {
            d[i+N]=a[i];
        }
        // 初始化中间节点
        for(int i=N-1;i>=1;--i) {
            d[i] = d[i<<1] + d[i<<1|1];
        }
    }
}
```

# 单点修改

- 只需将修改向上传递给父亲节点即可
```cpp
void update(int x,int k) {
	// 从叶子节点向上传递更新
	for(x+=N;x;x>>=1) {
		tree[x]+=k;
	}
}
```


## 单点修改下的区间查询

- 在区间左端点-1和右端点+1的位置放两个指针`l,r`
- 接着不断将`l,r`移动到对应节点的父节点处，直到`l,r`指向的节点的父节点相同时停止.
- 在这期间，如果：
	1. `l`指向的节点是左儿子，那么`ans += 其右兄弟的值`
	2. `r`指向的节点是右儿子，那么`ans += 其左兄弟的值`
```cpp
ll query(int l,int r) {
	ll ans=0;
	//s ^ r ^ 1就是判断对应节点的父节点是否相同
	//当对应节点互为左右儿子时，s^t = 1，再^1之后就是0
	for(l+=N-1,r+=N+1;l^r^1;l>>=1,r>>=1) {
		//指向的节点是左儿子，那么ans += 其右兄弟的值
		if(~l & 1) ans += d[l^1]; 
		//指向的节点是右儿子，那么ans += 其左兄弟的值
		if(r & 1) ans += d[r^1];
	}
	return ans;
}
```

# 区间修改+区间查询(永久化标记)

- 递归式线段树懒标记思想：延迟更新，等真正访问时再下传懒标记。
- 非递归线段树永久化标记：标记一旦加在某个节点，就「永久存在」，不下传标记，而在查询时按路径**逐层累加**。
- 即：修改时只记录增量，不传播；查询时动态加上路径上累积的标记。
- 永久化标记

## 区间修改

- 当左端点是左儿子/右端点是右儿子时，我们对它的**兄弟**进行修改并**打上标记**
- 因为上述修改还会波及到这些节点的**各级祖先**。所以我们需要在途中根据**实际修改的区间长度**来更新各级祖先的值，而且这种操作需要一路上推到根节点。
- 因此需要辅助变量
```cpp
int len = 1; // 当前层每个节点所代表区间长度
int cntl = 0, cntr = 0; // 记录左端和右端已覆盖长度
```

```cpp
void update(int l,int r,int k) {
	int len=1,cntl=0,cntr=0;
	//更新tree
	for(l+=N-1,r+=N+1;l^r^1;l>>=1,r>>=1,len<<=1) {
		// 每次向上走一层时，把覆盖的部分值累加到父节点；
		d[l]+= cntl*k,d[r]+=cntr*k;
		// 处理标记和中间需要更新的节点
		if(~l&1) d[l^1]+= len*k,mark[l^1]+=k,cntl+=len;
		if(r&1) d[r^1]+= len*k,mark[r^1]+=k,cntr+=len;
	}
	//更新上层tree
	for(;l;l>>=1,r>>=1) {
		d[l]+=cntl*k,d[r]+=cntr*k;
	}
}
```

## 区间查询

- 在有区间修改存在时，区间查询也需要考虑标记的影响。
- 所以除了加上端点的兄弟节点的信息，沿途中遇到的标记也对答案有相应的贡献， 依赖于**实际查询的区间长度**，这同样也需要上推到根节点。
```cpp
ll query(int l,int r) {
	int len=1,cntl=0,cntr=0;
	ll ans=0;
	for(l+=N-1,r+=N+1;l^r^1;l>>=1,r>>=1,len<<=1) {
		ans += cntl *mark[l] + cntr*mark[r];
		if(~l & 1) ans+=d[l^1],cntl+=len;
		if(r & 1) ans+=d[r^1],cntr+=len;
	}
	for(;l;l>>=1,r>>=1) {
		ans+=cntl*mark[l]+cntr*mark[r];
	}
	return ans;
}
```

# 懒标记zkw线段树
- 与标记永久化相比，使用懒标记的zkw线段树为了保证其正确性，在每次访问之前，先将路径上遇到的节点的懒标记下移，确保其结果正确；
- 懒标记下移更新
```cpp
void modify(int p,int x) {
    t[p].sum += t[p].sz * x;
    t[p].add += x;
}

void pushdown(int x) {
    if(!t[x].add) return;
    modify(x<<1,t[x].add);
    modify(x<<1|1,t[x].add);
    t[x].add = 0;
}
```
- 更新父节点
```cpp
void pushup(int x) {
    t[x].sum = t[x<<1].sum + t[x<<1|1].sum;
}
```
- 可以看到这部分代码与递归线段树几乎没有区别

## 区间查询

- 此zkw线段树采用闭区间`(l-1,r+1)`查询法
- 与永久化标记的zkw线段树相比，多了一步下移更新懒标记的步骤，在查询之前
```cpp
// 下移更新懒标记（只需更新其路径上的节点即可）
for(int i=H;i;i--) pushdown(l>>i),pushdown(r>>i); 
```
- 完整区间查询模板
```cpp
ll query(int l,int r) {
    l+=N-1,r+=N+1;ll ans=0;
    for(int i=H;i;i--) pushdown(l>>i),pushdown(r>>i);
    for(;l^r^1;l>>=1,r>>=1) {
        if(~l&1) ans+=t[l^1].sum;
        if(r&1) ans+=t[r^1].sum;
    }
    return ans;
}
```

## 区间修改

- 同理，为了保证其正确性，再修改前先进行懒标记下移操作。
- 在区间修改后，别忘了向上传递更新。
- 向上传递更新
```cpp
for(int p=l>>1;p;p>>=1) pushup(p);
for(int q=r>>1;q;q>>=1) pushup(q);
```
或者(此写法可以防止p,q的共同祖先重复更新，减少开销)
```cpp
for(int p=l>>1,q=r>>1;p;p>>=1,q>>=1) {
    pushup(p);
    if(p!=q) pushup(q); 
}
```
- 完整模板
```cpp
void update(int l,int r,int x) {
    l+= N-1,r+=N+1;
    for(int i=H;i;i--) pushdown(l>>i),pushdown(r>>i);
    for(int p=l,q=r;p^q^1;p>>=1,q>>=1) {
        if(~p&1) modify(p^1,x);
        if(q&1) modify(q^1,x);
    }
    for(int p=l>>1;p;p>>=1) pushup(p);
    for(int q=r>>1;q;q>>=1) pushup(q);
    
}
```
- [P3372 【模板】线段树 1 - 洛谷](https://www.luogu.com.cn/problem/P3372)
```cpp
#include <bits/stdc++.h>
#define ll long long
#define int long long
#define IOS ios::sync_with_stdio(false);cin.tie(nullptr);
#define endl '\n' 
const int inf = 0x3f3f3f3f;
const ll infll = 0x3f3f3f3f3f3f3f3f;
const double PI = acos(-1.0);
using namespace std;
//ifstream fin("input.txt");
//ofstream fout("output.txt");
//#define cin fin
//#define cout fout

int n,m;
const int MAXN = 1e5+5;
int a[MAXN];
int N,H;
struct node {
    int sz;
    ll sum,add;
};
vector<node> t;

void pushup(int x) {
    t[x].sum = t[x<<1].sum + t[x<<1|1].sum;
}

void modify(int p,int x) {
    t[p].sum += t[p].sz * x;
    t[p].add += x;
}

void pushdown(int x) {
    if(!t[x].add) return;
    modify(x<<1,t[x].add);
    modify(x<<1|1,t[x].add);
    t[x].add = 0;
}

void build() {
    N=1;
    while(N<=n+1) N<<=1,H++;
    t.resize(N<<1);
    for(int i=1;i<=n;i++) t[i+N].sum = a[i],t[i+N].sz=1;
    for(int i=N-1;i>=1;i--) pushup(i),t[i].sz=t[i<<1].sz+t[i<<1|1].sz;
}

void update(int l,int r,int x) {
    l+= N-1,r+=N+1;
    for(int i=H;i;i--) pushdown(l>>i),pushdown(r>>i);
    for(int p=l,q=r;p^q^1;p>>=1,q>>=1) {
        if(~p&1) modify(p^1,x);
        if(q&1) modify(q^1,x);
    }
    for(int p=l>>1,q=r>>1;p;p>>=1,q>>=1) {
	    pushup(p);
	    if(p!=q) pushup(q);
    }
}

ll query(int l,int r) {
    l+=N-1,r+=N+1;ll ans=0;
    for(int i=H;i;i--) pushdown(l>>i),pushdown(r>>i);
    for(;l^r^1;l>>=1,r>>=1) {
        if(~l&1) ans+=t[l^1].sum;
        if(r&1) ans+=t[r^1].sum;
    }
    return ans;
}

signed main()
{
    IOS
    cin>>n>>m;
    for(int i=1;i<=n;i++) cin>>a[i];
    build();
    while(m--) {
        int op;cin>>op;
        if(op==1) {
            int x,y,k;cin>>x>>y>>k;
            update(x,y,k);
        }
        else if(op == 2) {
            int x,y;cin>>x>>y;
            cout<<query(x,y)<<endl;
        }
    }
    //fin.close(),fout.close();
    return 0;
}
```


# 例题

- [P3372 【模板】线段树 1 - 洛谷](https://www.luogu.com.cn/problem/P3372)：zkw标记永久化
```cpp
#include <bits/stdc++.h>
#define ll long long
#define int long long
#define IOS ios::sync_with_stdio(false);cin.tie(nullptr);
#define endl '\n'
const int inf = 0x3f3f3f3f;
const ll infll = 0x3f3f3f3f3f3f3f3f;
const double PI = acos(-1.0);
using namespace std;
//ifstream fin("input.txt");
//ofstream fout("output.txt");
//#define cin fin
//#define cout fout
const int MAXN = 1e5+5;
ll a[MAXN];
int n,m;

struct segTree
{
    ll n,N;
    vector<ll> d;
    vector<ll> mark;
    void build(ll n) {
        this->n = n;
        N=1;
        while(N<=n+1) N<<=1;
        d.resize(N<<1);
        mark.resize(N<<1);
        for(int i=1;i<=n;i++) {
            d[i+N]=a[i];
        }
        for(int i=N-1;i>=1;--i) {
            d[i] = d[i<<1] + d[i<<1|1];
        }
    }

    ll query(int l,int r) {
        ll ans=0;
        int len=1,cntl=0,cntr=0;
        for(l+=N-1,r+=N+1;l^r^1;l>>=1,r>>=1,len<<=1) {
            //根据标记更新
            ans += cntl*mark[l] + cntr*mark[r];
            if(~l & 1) ans += d[l^1],cntl+=len; // 左端点是左儿子
            if(r & 1) ans += d[r^1],cntr+=len;  // 右端点是右儿子
        }

        //处理上层标记
        for(;l;l>>=1,r>>=1) {
            ans += cntl*mark[l] + cntr*mark[r];
        }
        return ans;
    }

    void update(int l,int r,ll c) {
        int len=1,cntl=0,cntr=0;
        for(l+=N-1,r+=N+1;l^r^1;l>>=1,r>>=1,len<<=1) {
            d[l]+= cntl*c ,d[r]+= cntr*c; 
            //每次向上走一层时，把覆盖的部分值累加到父节点；
            // mark 表示该节点被整体加了多少；
            if(~l & 1) d[l^1] += c*len , mark[l^1]+=c ,cntl+=len;
            if(r & 1) d[r^1] += c*len, mark[r^1]+=c , cntr+=len;
        }

        for(;l;l>>=1,r>>=1) {
            d[l] += cntl * c;
            d[r] += cntr * c;
        }
    }
} tree;

signed main()
{
    IOS
    cin>>n>>m;
    for(int i=1;i<=n;i++)
    {
        cin>>a[i];
    }
    tree.build(n);
    while(m--) {
        int op;cin>>op;
        if(op==1) {
            int x,y,k;cin>>x>>y>>k;
            tree.update(x,y,k);
        }
        else if(op==2) {
            int x,y;cin>>x>>y;
            cout<<tree.query(x,y)<<endl;
        }
    }
    //fin.close(),fout.close();
    return 0;
}
```
