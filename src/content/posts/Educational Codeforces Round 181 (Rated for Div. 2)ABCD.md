---
title: Educational Codeforces Round 181 (Rated for Div. 2)ABCD
description:  算法题解
category: 算法
published: 2026-01-19
tags:
  - c++
  - 算法
  - 动态规划
---

##  [Problem - A - Codeforces](https://codeforces.com/contest/2125/problem/A)

- 实际上只要对每个字符串里的字符从大到小排序`T`就一定在`F`,`N`之前。
- 赛时考虑复杂了,还用了`KMP`匹配，实际上没必要
```cpp
#include <bits/stdc++.h>
#define ll long long
using namespace std;

void getnext(string& s,vector<int>& next) {
    for(int i=1;i<next.size();i++) {
        int j = next[i-1];
        while(j>0 && s[i]!=s[j]) j = next[j-1];
        if(s[i] == s[j]) j++;
        next[i] = j;
    }
}

void kmp(string& s,string target,vector<int>& ans)
{
    int n1=s.size();int n2=target.size();
    int p1=0,p2=0;
    vector<int> next(target.size());
    getnext(target,next);
    while(p1<n1) {
        if(s[p1] == target[p2]) {
            p1++,p2++;
        }
        else {
            if(p2>0) p2=next[p2-1];
            else p1++;
        }
        if(p2 == n2) {
            ans.push_back(p1-p2);
        }
    }
}

int main()
{
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int t;cin>>t;
    while(t--) {
        string s;cin>>s;
        unordered_map<char,int> vis;
        for(char ch:s) vis[ch]++;
        vector<int> ans;
        kmp(s,"FFT",ans);
        int b1 = ans.size();
        ans.clear();
        kmp(s,"NTT",ans);
        int b2 = ans.size();
        if(b1==0&&b2==0) cout<<s<<"\n";
        else {
            string a;
            for(int i=0;i<vis['T'];i++) {a+="T";}
            vis['T']=0;
            for(auto p:vis) {
                for(int i=0;i<p.second;i++)
                    a += p.first;
            }
            cout<<a<<"\n";
        }
    }
    return 0;
}
```

## [Problem - B - Codeforces](https://codeforces.com/contest/2125/problem/B)

- 由于使用使用过的`(dx,dy)`的代价为0，问题转化为如何使用最少不同的`(dx,dy)`，使得`(a,b)`可以转化为`(0,0)`
- 考虑如果可以只是用一种`(dx,dy)`走了`n`步就到达终点，此时最小总代价为1，且满足
$$n\times dx =a,n\times dy = b$$
- 可以发现$n|a \wedge n|b$，不妨取`n = gcd(a,b)`，则`dx = a/n,dy=b/n`，若能满足`dx<=k && dy<=k`,则最小总代价为1。
- 否则最小总代价至少为2，而使用`(0,1)`，`(1,0)`即可从任意`(a,b)`到达终点，故最小总代价不为1就是2.

```cpp
#include <bits/stdc++.h>
#define ll long long
using namespace std;

ll a,b,k;

ll gcd(ll i,ll j) {
    if(j==0) return i;
    return gcd(j,i%j);
}

int main()
{
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int t;cin>>t;
    while(t--)
    {
        cin>>a>>b>>k;
        ll g = gcd(a,b);
        ll dx = a/g; ll dy = b/g;
        if(dx<=k && dy<=k) cout<<1<<"\n";
        else cout<<2<<"\n";
    }
    return 0;
}
```

## [Problem - C - Codeforces](https://codeforces.com/contest/2125/problem/C)

- 好数是质因数分解后没有两位数以内的质数，如$1111 = 11\times 101$
- 由于$l,r$十分庞大，故不可能列举出全部质数再做题，由于两位数以内的质数就4个，考虑正难则补。
- 好数就是无法被`2,3,5,7`整除的数。
- 用`count(n)`表示`1~n`以内的好数个数，可以用容斥原理计算被`2,3,5,7`至少一个数整除的数的个数，再用n减去这个数。用$A_{i}$表示n以内被$i$整除的数的个数。如下式
$$n-(A_{2}+A_{3}+A_{5}+A_{7}-A_{2\times 3}-A_{2\times 5}-A_{2\times 7}-A_{3\times 5}-A_{3\times 7}-A_{5\times 7}+A_{2\times 3\times 5}++A_{3\times 5\times 7}-A_{2\times 3\times 5\times7})$$

- 于是`l,r`内的好数就化为`count(r) - count(l-1)`

```cpp
#include <bits/stdc++.h>
#define ll long long
using namespace std;

ll l,r;

ll count(ll n) {
    ll n2 = n/2;
    ll n3 = n/3;
    ll n5 = n/5;
    ll n7 = n/7;
    ll n23 = n/(2*3);
    ll n25 = n/(2*5);
    ll n27 = n/(2*7);
    ll n35 = n/(3*5);
    ll n37 = n/(3*7);
    ll n57 = n/(5*7);
    ll n235 = n/(2*3*5);
    ll n237 = n/(2*3*7);
    ll n257 = n/(2*5*7);
    ll n357 = n/(3*5*7);
    ll n2357 = n/(2*3*5*7);
    return n-(n2+n3+n5+n7-n23-n25-n27-n35-n37-n57+n235+n357+n237+n257-n2357);
}

int main()
{
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int t;cin>>t;
    while(t--) {
        cin>>l>>r;
        cout<<count(r) - count(l-1)<<"\n";
    }
    return 0;
}

```

## [Problem - D - Codeforces](https://codeforces.com/contest/2125/problem/D)

- 使用`dp[i]`表示完美覆盖区间`[1,i]`的概率，考虑状态转移方程。
- 对于任意线段$S$，满足其终点$r=i$，则完美覆盖区间$[1,l-1]$的概率为`dp[l-1]`
- 考虑区间$[l,i]$被完美覆盖的概率，即被该线段$S$覆盖，且不被其他线段覆盖的概率。
- 若其他线段能与$[l,i]$有交集，则满足$L<l, l<R<i$，这种情况导致$l$以前的区间被重复覆盖，考虑`dp[l-1]`时不存在这种情况（$[1,l-1]$被完美覆盖）。或满足$l <L< i,R>i$，这种情况需单独处理。
- 我们使用一个数组`pp`来表示：`pp[j]`表示不存在从`j`开始的线段的概率。即
$$\prod_{线段s的起点为j} (1-P_s)$$
- 为了快速进行区间查询，可以维护一个前缀积数组`pre`表示：`pre[j]`表示区间$[1,j]$中任意一点为起点的线段都不存在的概率
- 则区间$[l,i]$之中不存在以任意一点为起点的线段的概率为`pre[i]/pre[l-1]`
- 假设我们选择线段$s$，则在计算不存在以$l_s$为起点的线段的概率时包含了$(1-p_s)$，而我们要选择$s$，故我们要除以一个$(1-p_s)$消去
- 所以
$$dp[i] = \sum_{线段s,r_s = i} dp[l_s-1] \times \frac{pre[i]}{pre[l_s-1]}\times \frac{P_s}{1-P_s}$$
- 初始状态`dp[0]=1`


```cpp
#include <bits/stdc++.h>
#define ll long long
using namespace std;

const int mod = 998244353;
const int M = 2e5+2;
int n,m;

ll basep = 1;

vector<pair<ll,ll>> edgeTo[M]; // (起点，权重)
vector<pair<ll,ll>> edgefrom[M]; // (终点，权重)

ll dp[M];
ll pre[M];

ll power(ll base,ll exp) {
    ll ans = 1;
    base%=mod;
    while(exp) {
        if(exp&1) {
            ans=(ans*base)%mod;
        }
        base = (base*base)%mod;
        exp>>=1;
    }
    return ans;
}


ll inverse(ll k) {
    return power(k,mod-2);
}


int main()
{
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    cin>>n>>m;
    for(int i=0;i<n;i++) {
        ll l,r,p,q;
        cin>>l>>r>>p>>q;
        edgeTo[r].push_back({l,(p*inverse(q))%mod});
        edgefrom[l].push_back({r,(p*inverse(q)%mod)});
    }
    dp[0]=1;
    pre[0]=1;
    for(int i=1;i<=m;i++) {
        int p=1;
        for(auto [u,w]:edgefrom[i]) p = (p*((1-w+mod)%mod))%mod;
        pre[i] = (pre[i-1]*p)%mod;
    }

    for(int i=1;i<=m;i++) {
        for(auto [l,w]:edgeTo[i]) {
            ll p = (pre[i]*inverse(pre[l-1]))%mod;
            p = (p*inverse((1-w+mod)%mod))%mod;
            p = (p*w)%mod;
            dp[i] = (dp[i]+(dp[l-1]*p)%mod)%mod;
        }
    }

    cout<<dp[m]<<endl;

    return 0;
}

```

