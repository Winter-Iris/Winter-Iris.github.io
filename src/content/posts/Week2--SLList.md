---
title: CS61b:Week2
description: SSList的实现
category: CS61B
published: 2026-01-19
tags:
  - java
  - cs61b
  - 数据结构
---

## Java下的赋值法则

- Java的基本数据类型
	- 基本类型：
		- `int,double,boolean,char,bytes,short,long,float`
	- 其他类型(引用类型)：非基本类型（如数组，用户自定义类等等）
- 等号赋值规则
	- 一般赋值：值传递（仅仅将变量名实际储存的内存中的内容复制一份）
	- new关键字：（其他类型的创建）引用传递。（实际储存的是在内存开辟的新的类型的地址）
```java  
    //a与b指向同一个对象  
    // a 实际上储存的是新建对象的地址  
    Walrus a = new Walrus(1000,8.3);  
    Walrus b;  
    //将a储存的地址赋给b，所以a与b指向同一个对象。  
    b = a;  
    b.weight = 5;  
    System.out.println(a.weight);  
    // 5
    
    //x 与 y 是不同的整数    
    //传入参数时的情况也有所不同。  
    int x = 50;  
    int y;  
    y = x;  
    y = 3;  
    System.out.println(x);  
    // 50 
```

## SLList的实现
### “裸SLList”数据结构（节点）

- SLList: Singly Linked List (单向链表)
- 一个类型中含有以下封装：
	- 储存的数据
	- 下一个节点的地址（引用）
	- 方法：添加值（首，尾，中）
	- 方法：返回数组大小
	- 等等
- 节点Node组成：
	- 该节点包含的元素
	- 下一个节点的地址

![](https://s2.loli.net/2024/10/20/DpwBkCxNVyehn1t.png)

#### 示例代码

```java
//简单链表的实现  
public class Intlist {  
    public int first;  
    //实际上储存的是引用  
    public Intlist rest;  
  
    //构造函数  
    public Intlist(int f,Intlist r){  
        this.first = f;  
        this.rest = r;  
    }  
  
    //递归计算数组大小  
    public int size()  
    {  
        if(this.rest == null){  
            return 1;  
        }  
        else {  
            return 1+this.rest.size();  
        }  
    }  
    //迭代法求长度  
    public int iterativesize(){  
        int i = 0;  
        // p 是指向自己的指针  
        Intlist p = this;  
        while (p != null){  
            p = p.rest;  
            i+=1;  
        }  
        return i;  
    }  
  
    //递归法访问元素  
    public int get(int i){  
        if(i == 0){  
            return this.first;  
        }  
        else{  
            return this.rest.get(i-1);  
        }  
    }  
  
    public static void main(String[] args){ 
      // 原始构建方法（十分冗杂） 
//        Intlist L = new Intlist();  
//        L.first = 3;  
      //  L.rest = new Intlist();  
//        L.rest.first = 4;  
//        L.rest.rest = null;  
        // [3 , rest] rest -> [4,rest] rest -> null        
        // Intlist L = new Intlist(10,null);  
        //在列表的前面构建列表  
        L = new Intlist(20,L);  
        L = new Intlist(30,L);  
//        System.out.println(L.size());  
        System.out.println(L.iterativesize());  
        System.out.println(L.get(2));  
    }  
}
```

### 封装后的SSList

- 封装（数据抽象）：只考虑接口函数的使用，不考虑其具体实现。
- 将链表的每一个结点封装在链表类中。
- 第零节点（哨兵节点的使用）：避免了空列表的引入是代码变得冗杂的问题。
```java
//单向链表实现  
//数据抽象的体现，只需了解接口，无需理解运作细节  
public class SSList {  
  // private 防止类外对类内元素的访问，以进行一定程度的保护  
  // 嵌套类，链表节点  
  // 嵌套静态类型，意味着内部类型的实例变量不能访问外部类的元素  
  private class Intnode {  
    public int item;  
    public Intnode next;  
  
    public Intnode(int i, Intnode n) {  
      item = i;  
      next = n;  
    }  
  }  
  
//  private Intnode first;  
  
  // getfirst  
  public int getfirst() {  
    return sentinel.next.item;  
  }  
  
  // addfirst  
  public void addfirst(int a) {  
    this.sentinel.next = new Intnode(a, sentinel.next);  
    sentinel.item += 1;  
  }  
  
  // addlast  
  public void addlast(int a) {  
    Intnode p = this.sentinel.next;  
    while (p.next != null) {  
      p = p.next;  
    }  
    p.next = new Intnode(a, null);  
    sentinel.item += 1;  
  }  
  
  // size(可以分为两部分：外部接口和内部实现)  
  // private int size(Intnode i) {  
	  // if (i.next == null) {  
		  // return 1;  
	  // } else {  
		  // return 1 + size(i.next);  
	  // }  
  // }  
  
  // public int size() {  
	  // return size(first);  
  // }  
  
  // size的改善，引入计数变量  
  // private int size = 0;  
  
  public int size() {  
    return this.sentinel.item;  
  }  
  
  // 创建空列表  
  public SSList() {  
    sentinel = new Intnode(0,null);  
  }  
  
  // 解决引入空列表的方法--引入零节点（哨兵节点）  
  //第一个节点位于哨兵结点之后  
  //哨兵节点的值存放元素个数  
  private Intnode sentinel ;  
  
  // main method test  
  public static void main(String[] args) {  
    SSList l = new SSList();  
    l.addfirst(1);  
    l.addlast(2);  
    int sizel = l.size();  
    System.out.println("size:" + sizel);  
    System.out.println("firstitem:" + l.getfirst());  
  }  
}
```

### 链表数据结构的特点

- 节点分散在各自不同的内存空间中
- 节点不需要连续地存储在一块地方，增加和删除节点非常方便
- 访问元素只能通过一个节点一个节点遍历，效率低

## Proj0通关！

- cs61b著名的2048proj通过啦，感觉全英文理解题意就花了好久。
- 预估完成时间：5h左右

![](https://s2.loli.net/2024/10/21/rKZALNgeHQkiya9.png)

## Lab2通关！

- 居然还有万恶的Hidden test,第一次真是没看到。

![](https://s2.loli.net/2024/10/21/DkRK3pHmoUT5bM7.png)

