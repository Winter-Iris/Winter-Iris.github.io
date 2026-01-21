---
title: KMP字符串匹配
published: 2026-01-21
pinned: false
description: 字符串匹配的KMP算法
image: ""
tags:
  - 字符串
  - 算法
  - KMP
  - 字符串匹配
category: 算法
draft: false
---


# 暴力匹配

- 给定文本串 `t` 和模式串 `s` ，最简单的匹配就是从第一个字符开始，逐个匹配 s 和 t 的每个字符，若不匹配则对文本串的下一个字符进行一样的操作。
```cpp
int str_match(string t, string s) {
	int i=0,j=0;
	int n = t.length();
	int m = s.length();
	while(i<n) {
		if(t[i] == s[j]) {
			i++,j++;
		}
		else {
			i= i-j+1;
			j=0;
		}
		if(j == m) {
			return i-j;
		}
	}
	return -1;
}
```

# KMP 算法

- 我们注意到，当我们在匹配两个串时，若正在判断`t[i]` 和 `s[j]` ，一定有一个不变量前提 `t[i-1] == s[j-1]`,`t[i-2]==s[j-2]`,...,`t[i-j] == s[0]` ，即`t[i-j ~ j-1] == s[0 ~ i-1]`
- 暴力匹配失败的时候，都要重新移动主串指针和模式串的指针并进行重新比对。若我们此时知道`s[0~i-1]`这个前缀串的最长前后缀长度`len`，我们就可以不用回退主串的指针，而是移动模式串的指针到`len`即可，因为
$$s[0,len-1] = s[j-len , j-1] = t[i-len,i-1]$$

- 我们可以建立部分匹配表(next数组)，记录指针不匹配时将指向模式串的指针回退到上一个匹配位置，减少冗余匹配。

```cpp
//求next数组(s[0,1,...,i]的最长公共前后缀长度)
void getNext(string& s,vector<int>& next)
{
	for(int i=1;i<next.size();i++) {
		//j指向前一个匹配的最小前缀的后一项
		int j=next[i-1];
		//不匹配时则继续更新j，使得j指向上一个匹配最小前缀的后一项，直到j=0
		while(j>0 && s[i]!=s[j]) j = next[j-1];
		//如果该位置的字符与前缀的后一个字符匹配，则next[i]=next[j]+1;
		if(s[i]==s[j]) j++;
		next[i]=j;
	}
}

int main()
{
	string s1,s2;
	cin>>s1>>s2;
	int n1=s1.size();
	int n2=s2.size();
	vector<int> next(n2);
	getNext(s2,next);
	int p1=0;int p2=0;int ans=-1;
	while(p1<n1)
	{
		//字符匹配，两个指针均前进
		if(s1[p1]==s2[p2]) {
			p1++;p2++; 
		}
		//字符不匹配
		else {
			//更新p2，指向更小的匹配位置,next数组
			if(p2>0) p2=next[p2-1];
			//否则p1前进
			else p1++;
		}
		//查找到子串
		if(p2==n2) {
			//存储子串第一个字符的位置
			ans=p1-p2;
			break;
		}
	}
	cout<<ans;
	return 0;
}
```