---
title: AC 自动机
published: 2026-01-21
pinned: false
description: 多模式串的字符串匹配-AC自动机
image: ""
tags:
  - 字符串
  - 字符串匹配
  - AC自动机
  - 算法
  - 数据结构
category: 算法
draft: false
---


AC（Aho–Corasick）自动机是 **以 Trie 的结构为基础**，结合 **KMP 的思想** 建立的自动机，用于解决多模式匹配等任务。

- AC 自动机本质上是 Trie 上的自动机。

# 基本思想

## 建立Trie树

将所有模式串一起构建一棵Trie树，这个Trie树实际上将所有的模式串的公共前缀合并了，这使得我们在Trie树上面进行字符串匹配和状态转移时，是一次性和多个模式串一起匹配。

- 假设我们要查 "she", "shit", "shoe"。
- 在 Trie 树上，它们共享同一个 "sh" 的路径。
- 当我们读入文本串中的 's' 然后 'h' 时，我们**同时**在验证这三个单词的开头。

## 失配指针

借用KMP算法的思想，字符串匹配失败时，不回退主串的指针，而是将模式串的指针移动到特定位置进行下一次匹配，大大减少算法开销。类比之，Trie树上的失配指针就是这个特定位置，当字符串匹配失败时，当前状态通过失配指针进行转移。

而KMP中这个特定位置就是由最长公共前后缀计算得出，在Trie树上同理，不过在Trie上已经合并了公共前缀，于是我们只要找到最长公共后缀即可。

## 多模式匹配

遍历文本串，在Trie上实时跟踪状态：如果失配，则借助失配指针进行跳转，直到匹配成功或回到根节点；如果匹配成功，直接转移到对应的节点。然后更新计数：利用 fail 指针找出所有匹配的模式串，并累加到答案中。


# 构建

- 建立一个 AC 自动机有两个步骤：
	1. 基础的 Trie 结构：将所有的模式串构成一棵 Trie；
	2. KMP 的思想：对 Trie 树上所有的结点构造失配指针。
- 建立完毕后，就可以利用它进行多模式匹配。

## 构建Trie

- Trie结构
```cpp
struct Node
{
	map<char,int> son; // 构建树形结构，通过边char找到节点编号int
	int fail;          
	int cnt;           // 记录，是否有字符串在此结束
	Node() {
		fail=0;
	}
	// 辅助函数，用于判断是否存在字符ch对应的子结点
	bool exist_child(const char& ch) {
		if(son.find(ch) == son.end()) {
			return false;
		}
		return true;
	}
};

vector<Node> Trie;
```


- 构建函数
```cpp
void insert(const string& s) {
	// 指向根节点的指针，用于跟踪状态
	int p = 0;
	for(char ch:s) {
		// 如果不存在对应的节点
		if(!Trie[p].exist_child(ch)) {
			// 创建节点，分配节点编号
			Trie[p].son[ch] = Trie.size();
			Trie.emplace_back();         
		}
		// 从当前节点通过字符ch转移到对应的状态
		p=Trie[p].son[ch];
	}
	// 标记当前节点处有一个字符串结束，并计数
	Trie[p].cnt++;
}
```

## 构建失配指针

- AC 自动机利用一个 fail 指针来辅助多模式串的匹配。
- 状态 $u$ 的 `fail` 指针指向另一个状态 $v$，且 $v$ 是 $u$ 的最长后缀（即在若干个后缀状态中取最长的一个作为 `fail` 指针）。
- 根据最长后缀的状态转移：假设`a[i,j]`为串`s1,s2`的最长公共后缀的长度，显然有状态转移 
$$\text{if }s1[i]=s2[j]\text{ : }a[i,j] = a[i-1,j-1]+1 $$
- 因为fail指针指向的就是当前状态字符串的最长后缀，我们要更新u节点时，就可以用其父节点p的失配指针，假设p.fail指向节点v，p通过字符c转移到u。
- 我们使用`trie[i].son[j]`表示节点 `i` 通过字符 `j` 的边指向的子节点，不难得到
$$trie[trie[u].son[c]].fail = trie[trie[u].fail].son[c]$$
- 即，如果该节点`u`与其父节点fail指针指向的节点`v`有相同的字符`c`的边，分别指向`i,j`，则`i`的`fail`指针指向`j`
- 如果没有对应的子结点，就再次通过失配指针跳转，重复上述操作，直到转移到根节点。
- 因为我们求当前节点的fail指针时，用到之前的节点的fail指针，显然我们要按照BFS的顺序构建fail指针，保证更新当前节点时，其依赖的fail指针已全部被更新。

```cpp
void build() {
	// BFS构建fail指针
	queue<int> q;
	for(auto [_,i]:Trie[0].son) {
		q.push(i);
	}
	while(!q.empty()) {
		int u = q.front();q.pop();
			// 通过fail指针找到最长后缀对应的节点
			int p = Trie[u].fail;
			while (p>0 && !Trie[p].exist_child(ch))
			{
				p=Trie[p].fail;
			}
			// 更新fail指针
			if(Trie[p].exist_child(ch))
				Trie[i].fail = Trie[p].son[ch];
			// 别忘了入队BFS
			q.push(i);
		}
	}
}
```

## 多模式查询

```cpp
int match(const string& str) {
	int ans;
	int p=0;
	for(int i=0;i<str.length();i++) {
		// 若匹配失败根据fail指针跳转
		while(p>0 && !Trie[p].exist_child(str[i])) {
			p=Trie[p].fail;
		}
		// 若匹配成功在Trie上转移
		if(Trie[p].exist_child(str[i])) {
			p = Trie[p].son[str[i]];
		}
		
		// 遍历fail指针（找到所有可能匹配的模式串）更新计数
		for(int j=p;j>0;j=Trie[j].fail) {
			ans+=Trie[p].cnt;
		}
	}
	return ans;
}
```

# Trie图优化构建与查询

- Trie 图优化的本质是将 **“树（Tree）”** 改造为 **“确定性有限状态自动机（DFA / Graph）”**。
- 如果已经知道字符集的大小，即知道一个节点的所有可能子结点状态是有限的，而且个数就是字符集的大小。这里假设所有字符串以小写字母构成，字符集大小为26.
- 这样我们可以将不存在的字典树的状态链接到失配指针的对应状态。在原字典树中，每一个结点代表一个字符串$S$，是某个模式串的前缀。而在修改字典树结构后，尽管增加了许多转移关系，但结点（状态）所代表的字符串是不变的。
- 这样可以避免很多向上循环跳转fail指针的操作，**即路径压缩**。具体如下。
## 构建

- 将结点按 BFS 顺序入队，依次求 fail 指针。这里的字典树根结点为 `0`，我们将根结点的子结点一一入队。
- BFS：
	- 取出队首节点`u`，遍历字符集。
	- 如果`trie[u].son[i]`存在，更新`fail`指针，`trie[trie[u].son[i]].fail = trie[trie[u].fail].son[i]`，入队.
	- 如不存在，将不存在的字典树的状态链接到了失配指针的对应状态。`trie[u].son[i] = trie[trie[u].fail].son[i]`

```cpp
void build() {
	queue<int> q;
	for(int i=0;i<26;i++) {
		if(tr[0].son[i]) q.push(tr[0].son[i]);
	}
	while(!q.empty()) {
		int u=q.front();
		q.pop();
		for(int i=0;i<26;i++) {
			if(tr[u].son[i]) {
				tr[tr[u].son[i]].fail = tr[tr[u].fail].son[i];
				q.push(tr[u].son[i]);
			}
			else {
				// 将不存在的字典树的状态链接到了失配指针的对应状态
				tr[u].son[i] = tr[tr[u].fail].son[i];
			}
		}
	}
}
```

## 查询

- 循环遍历匹配串，在字典树上跟踪当前字符。利用 fail 指针找出所有匹配的模式串，并累加到答案中。
- 防止重复匹配，将匹配过的状态标记即可。
```cpp
int query(string s) {
	int u=0,res=0;
	for(char ch:s) {
		u = tr[u].son[ch-'a'];
		for(int j=u; j && tr[j].cnt!=-1; j=tr[j].fail) {
			res+=tr[j].cnt; // 记录答案
			tr[j].cnt=-1; // 防止重复匹配
		}
	}
	return res;
}
```

## 模板

- [P3808 AC 自动机（简单版） - 洛谷](https://www.luogu.com.cn/problem/P3808)
```cpp
#include <bits/stdc++.h>
#define ll long long
//#define int long long
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

const int N = 1e6+6;

namespace AC {
    struct Node {
        int son[26];
        int cnt;   //尾为该结点的串的个数
        int fail;

        Node() {
            memset(son,0,sizeof(son));
            cnt = fail = 0;
        }
    } tr[N];

    int tot; // 节点总数

    void init() {
        tot=0;
    }

    void insert(string s) {
        int u=0;
        for(char ch:s) {
            int &son = tr[u].son[ch-'a'];
            if(!son) son=++tot;
            u=son;
        }
        tr[u].cnt++;
    }

    void build() {
        queue<int> q;
        for(int i=0;i<26;i++) {
            if(tr[0].son[i]) q.push(tr[0].son[i]);
        }
        while(!q.empty()) {
            int u=q.front();
            q.pop();
            for(int i=0;i<26;i++) {
                if(tr[u].son[i]) {
                    tr[tr[u].son[i]].fail = tr[tr[u].fail].son[i];
                    q.push(tr[u].son[i]);
                }
                else {
                    tr[u].son[i] = tr[tr[u].fail].son[i];
                    // 将不存在的字典树的状态链接到了失配指针的对应状态
                }
            }
        }
    }

    int query(string s) {
        int u=0,res=0;
        for(char ch:s) {
            u = tr[u].son[ch-'a'];
            for(int j=u; j && tr[j].cnt!=-1; j=tr[j].fail) {
                res+=tr[j].cnt;
                tr[j].cnt=-1;
            }
        }
        return res;
    }

}
int n;
string s;
signed main()
{
    IOS
    cin>>n;
    AC::init();
    while(n--) {
        cin>>s;
        AC::insert(s);
    }
    AC::build();
    cin>>s;
    cout<<AC::query(s);

    //fin.close(),fout.close();
    return 0;
}
```

# 拓补排序优化

- 计算最终答案时，时间主要浪费在在每次都要跳 fail。如果我们可以预先记录，最后一并求和，那么效率就会优化。
- 因此我们如果单独看Trie图上面的节点和失配指针，剩下的这个结构一定是一棵树。按照 fail 树，做一次失配树上的拓扑排序，就能一次性求出所有模式串的出现次数。
```cpp
void build() {
	queue<int> q;
	int p=0;
	for(int i=0;i<26;i++) {
		if(tr[p].son[i]) q.push(tr[p].son[i]);
	}
	while(!q.empty()) {
		int u = q.front(); q.pop();
		for(int i=0;i<26;i++) {
			if(tr[u].son[i]) {
				tr[tr[u].son[i]].fail = tr[tr[u].fail].son[i];
				q.push(tr[u].son[i]);
				// 增加入度统计，方便拓补排序
				tr[tr[tr[u].fail].son[i]].id++;
			}
			else {
				tr[u].son[i] = tr[tr[u].fail].son[i];
			}
		}
	}
}

void query(string s)
{
	int p=0;
	for(char ch:s) {
		p = tr[p].son[ch-'a'];
		// 只要给出现的模式串标记即可。
		tr[p].cnt++;
	}
}
// 拓补排序计算最终答案
void topu() {
	queue<int>q;
	for(int i=0;i<=tot;i++) {
		if(tr[i].id == 0) q.push(i);
	}
	while(!q.empty()) {
		int u = q.front();
		q.pop();
		int v = tr[u].fail;
		
		ans[tr[u].idx] += tr[u].cnt;
		// 如果一个串出现了，他的最长后缀串也一定出现
		tr[v].cnt += tr[u].cnt;
		if(--tr[v].id ==0) { q.push(v); }
	}
}
```

# 时间复杂度

定义几个变量：

- $L$：所有模式串（字典中的词）的总长度（也就是Trie树的节点总数上限）。
- $∣T∣$：文本串（用来匹配的主串）的长度。
- $∣\Sigma∣$：字符集大小（通常是26）。

## Insert

- 将所有模式串插入Trie，时间复杂度
$$O(L)$$

## build

- 如果进行Trie图优化，BFS遍历Trie树上的每一个节点。对于每个节点，我们需要遍历字符集（例如 'a'-'z'）来处理它的所有子节点，建立失配指针或进行路径压缩。
$$O(L\times |\Sigma|)$$
- 如果不进行优化，在 BFS 构建 Fail 指针时，我们需要通过 `while` 循环不断向上跳 Fail 指针来寻找匹配的节点。常数因子会变大，且逻辑变复杂。复杂度仍为
$$O(L\times |\Sigma|)$$

## query

- 朴素AC自动机，不进行任何优化，每扫描文本串的一个字符，就沿着 Fail 指针一直跳到根节点来统计答案。
$$O(L|T|)$$
- Trie优化后，将 Trie 树变成了一个 **确定性有限状态自动机 (DFA)**，它保证了在匹配文本串 $T$ 时，无论当前字符匹配还是失配，状态转移（找到下一个节点）的时间永远是 $O(1)$。
$$O(|T|)$$

- 拓补排序优化后扫描结束后，按照拓扑序（或者直接逆序遍历 BFS 序），将子节点的计数累加到父节点（Fail 指向的节点）。
$$O(|T|+L)$$
- 如果连了 trie 图，时间复杂度就是 $O(\sum|s_i|+n|\Sigma|+|S|)$，其中 $n$ 是 AC 自动机中结点的数目，并且最大可以达到 $O(\sum|s_i|)$。如果不连 trie 图，并且在构建 fail 指针的时候避免遍历到空儿子，时间复杂度就是 $O(\sum|s_i|+|S|)$。