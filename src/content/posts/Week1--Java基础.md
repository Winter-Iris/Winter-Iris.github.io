---
title: CS61b:Week1
description: java的初级入门
category: CS61B
published: 2026-01-19
tags:
  - java    
  - cs61b
---


## Hello,world的实现

- 在文件`helloworld.java`中实现输出hello,world
```JAVA
public class Helloworld{
	d:\Study\notes\LinearAlgebra\向量与向量组.mdpublic static void main(String[] args){
		System.out.println("hello,world");
	}
}
```
- py中的实现
```python
print("hello,world")
```
- cpp中的实现
```c++
#include<iostream>
using namespace std;
int main()
{
	cout<<"hello,world";
	return 0;
}
```

{% note info modern %} Tips
 Java是面向对象的语言，所有的代码都要包含在一个类中。
 Java与C语言类似，语句结束都要以分号结尾。
 我们需要运行的函数都要放在主方法中运行。
 主方法为`public static void main(String[] args){}`
{% endnote %}
  

## 基础知识

- Java的基础语法与C类似，使用变量前要**先声明变量类型，变量名**。
- Java与C类似，是**静态编译语言**，这意味着我们不能将变量匹配到错误的数据类型，变量类型一旦声明就**无法更改**。
- 在Java运行代码前，Java会**先检查所有的变量类型是否匹配，再运行程序**，若不匹配则一整个程序都不会运行。
- Java是面向对象的编程语言，**所有代码都要放在一个类中**。

## 函数定义

- 首先，定义函数必须要在一个类中。在Java中，函数也称为方法(method)
- **函数的返回值类型，与参数类型都需要声明**与C语言类似。
- Java的函数只返回一个值。
```java
// 默认放在一个类型中
public static int max(int a , int b){
	if(a<b){
		return b;
	} else {
		return a;
	}
}

public static void main(String[] args){
	System.out.println(max(1,3));
}
```

## 控制语句

- 语法与C语言类似

## 数组的创建

- java
```java
int[] numbers = new int[3];
numbers[0] = 1;
numbers[1] = 3;
numbers[2] = 5;
int[] numbers2 = new int[] {1,3,5};
```
- c++
```c++
int* numbers = new int[3];
numbers[0] = 1;
numbers[1] = 3;
numbers[2] = 5;
delete[] numbers;
int* numbers2 = new int[3] {1,3,5};
delete [] numbers2;
```

## static关键字

### 静态变量

- 所有的同一个类的实例**共有**静态变量。
- 可以**通过类名访问**。
- 静态变量相当于常量。

### 静态方法

- 调用时**使用类名调用**，不能通过类的实例调用。
- 而非静态方法则只能通过类的示例调用，不能通过类名来调用。

### 代码示例

```java
public class Dog {  
    public int weightinpounds;  
    // 静态变量所有狗共用一个学名
    public static String binomen = "Canis familiaris";
    //构造函数  
    public Dog(int w){  
        this.weightinpounds = w;  
    }  
    public void makeNoise(){  
        if(weightinpounds <10){  
            System.out.println("yipyipyip!");  
        } else if (weightinpounds < 30){  
            System.out.println("bark!");  
        }else {  
            System.out.println("acrooooo!");  
        }  
    }
    // 静态方法  
    public static Dog maxDog(Dog d1,Dog d2){  
        if(d1.weightinpounds > d2.weightinpounds){  
            return d1;  
        }else{  
            return d2;  
        }  
    }  
    //非静态方法
    public Dog maxDog(Dog d){  
        if(this.weightinpounds < d.weightinpounds){  
            return d;  
        }  
        else{  
            return this;  
        }  
    }  
  
    public static void main(String[] args){  
	    //实例化
        Dog chester = new Dog(17);  
        Dog yusof = new Dog(150);  
        //静态方法的调用
        Dog larger = Dog.maxDog(chester,yusof);  
        larger.makeNoise();  
        //非静态方法的调用
        Dog larger2 = chester.maxDog(yusof);  
        larger2.makeNoise();
        //静态变量的使用  
        System.out.println(Dog.binomen);  
        System.out.println(chester.binomen);  
  
    } 
}
```

## Lab1通关!

![](https://s2.loli.net/2024/10/21/KrcxCTy9P8vUoRZ.png)