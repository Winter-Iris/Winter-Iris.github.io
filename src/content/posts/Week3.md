---
title: CS61b:Week3
description: DLList与AList与继承
category: CS61B
published: 2026-01-19
tags:
  - java    
  - cs61b
---
## DLList

- Double Linked List ：双向链表
- Node组成：
	- 该节点包含的元素
	- 下一个节点的地址
	- 上一个结点的地址

- 从SLList到DLList的改进

![](https://s2.loli.net/2024/10/22/bNiGThQqsMORpDC.png)

### DLList的改进结构

- 单端循环DLList

![](https://s2.loli.net/2024/10/22/hM5zpqiYesjycAZ.png)

- 双端DLList

![](https://s2.loli.net/2024/10/22/Mn7ZJLECAsyjGqh.png)

## Generic List

### 泛化列表

- 类似于C语言的模板，为使用多种类型的列表提供了基础，允许用户选择列表元素的类型。
- 泛化类的创建

```java
public class Classname<sometype> {
	//类似于C语言的模板，可以添加一个作为数据类型的参数。
	/*在该类的内部，想要由用户决定的数据类型都可以用sometype来代替，
	也可以代替函数返回值，函数参数的类型。*/
	
	// Some element & methods ...
}
```

- 泛化类的实例化
	- 传入的参数类型可以是基本类型，也可以是用户自定义类型，etc.
	- 要注意的是尖括号内的有些类型要全称和大写
		- int -> Integer
		- double -> Double
		- char -> Character
		- boolean -> Boolean
		- long -> Long
		- etc.

```java
//实例化时要确定sometype的类型
Classname<Integer> mylist1;
Classname<String> mylist2;
Classname<Walrus> mylist3;

//包括初始化时也需确定
mylist1 = new Classname<Integer>();
mylist2 = new Classname<>();
```

- 示例代码
```java 
public class GenericList<pineapple> {  
  
    private class Intnode {  
        public pineapple item;  
        public Intnode next;  
        public Intnode(pineapple i, Intnode n) {  
            item = i;  
            next = n;  
        }  
    }  
  
    private Intnode sentinel;  
    private int size = 0;  
 
    // getfirst    
    public pineapple getfirst() {  
        return sentinel.next.item;  
    }  
  
    // addfirst  
    public void addfirst(pineapple a) {  
        this.sentinel.next = new Intnode(a, sentinel.next);  
        size += 1;  
    }  
  
    // addlast  
    public void addlast(pineapple a) {  
        Intnode p = this.sentinel.next;  
        while (p.next != null) {  
            p = p.next;  
        }  
        p.next = new Intnode(a, null);  
        size += 1;  
    }  
  
	//size
    public int size() {  
        return this.size;  
    }  
  
    // 创建空列表  
    public GenericList() {  
        sentinel = new Intnode(null,null);  
    }  
  
    public static void main(String[] args){  
        GenericList<String> l = new GenericList<String>();  
        l.addfirst("what");  
        l.addlast("the");  
        l.addlast("dog");  
        l.addlast("doin");  
        System.out.println(l.getfirst());  
        System.out.println(l.size());  
  
    }  
}
```

## Array

### Java中的Array

- Array数组的特点
	- 具有**连续的存储空间**
	- 数组具有**固定的大小**（必须是整数且不会改变）
	- 数组的**各元素**具有**相同类型**
	- 数组可以用下标访问元素，下标索引范围为 $[0,length-1]$ 
	- 数组属于**引用类型**之一

- 数组的创建与使用
```java
// x 和 y 实际上存储的是对应数组的地址
x = new int[3];
y = new int[] {1,2,3,4,5};

//省略了new，但实际上还是有发挥new的效果
int[] z = {9,10,11,12,13}
int[] a = null;

x = new int[] {1,2,3}  //原来x指向的数组没有引用方式，则会被清理掉
//返回数组长度
int xL = x.length

//String也是引用类型，因此b指向的数组中的元素为对应字符串的地址。
String[] b = new String[3];



//数组元素拷贝到其他数组
System.arraycopy(x,0,z,3,2)
//z = [9,10,11,1,2]
//将数组b的第0项元素开始的2个元素复制到z数组从第3项开始的2个元素。
//In Python: z[3:5] = x[0:2]
```

### 2维数组

```java
//声明list是含有int[]作为元素的大小为4的int[]类型
int[][] list;
list = new int[4][];

//赋值
list[0] = new int[]{1};
list[1] = new int[]{1,2};
list[2] = new int[]{1,2,3};
list[3] = new int[]{1,2,3,4};

//创建此数组时，实际上创建了5个引用(1+4)
```

### Array & Class

- 数组可以通过下标`[]` 访问元素（随机访问），而类使用`.`来访问成员
- 数组元素类型相同，而类可以不同
- 占用的内存空间都是固定的，无法更改
- 数组的下标可以用变量代替（运行时评估）(动态索引)，而类不行。

## AList

- LList的随机访问效率极低，而基于数组的列表（AList）则相反。
- 组成：
	- 一个储存元素的数组
	- 一个记录大小的变量
	- 一些可供用户交互的方法

### Resizing AList

- 由于AList是基于数组的列表，而Java中的数组大小是有限的，用户想要一个没有上限的列表，于是AList需要扩大。
- 扩大思路：
	- 创建一个容量更大的新列表
	- 将旧列表的元素拷贝到新列表
	- 将原来指向旧列表的指针指向新列表
- 可能的问题：
	- 若每次只增加元素大小，在原数组元素数量极大的情况下，需要拷贝花费的时间很久。
	- 可能的解决方案，将数组大小每次扩大两倍。但是同样在数量很大的情况下，可能会占用很多的内存空间，造成浪费。时间与空间二者不能兼得。

### 泛化数组

- 需要注意的是泛化数组类型的时候不能直接new。
- 而是要new一个新的对象。
```java
//items = new cheese[100];   -- Wrong
items = (cheese[]) new Object[100];
```

### 代码示例

```java
public class AList<cheese> {  
    //不变量：代码运行时始终为真  
    //储存元素  
    private cheese[] items;  
    //记录大小  
    private int size;  
    //空列表创建  
    public AList(){  
        //容器容量上限为100  
        //泛化类型不能直接实例化数组列表  
        //items = new cheese[100];  --wrong  
        items = (cheese[]) new Object[100];  
        size = 0;  
    }  
  
    //addlast  
    public void addlast(cheese x){  
        if(size == items.length){  
            // 时间花费可能比较大（尤其是数组大小很大的情况）
            //--平方阶复杂度而SLList为线性阶复杂度  
            //resize(size+1);  
            //改善方法：多用空间消耗以减少时间消耗(当数组大小很大的时候内存浪费多)  
            resize(size*2);  
        }  
        items[size] = x;  
        size += 1;  
    }  
    //getlast  
    public cheese getlast(){  
        return items[size-1];  
    }  
    //get  
    public cheese get(int i){  
        return items[i-1];  
    }  
    //size  
    public int size(){  
        return this.size;  
    }  
    //removelast  
    //只需考虑实现，无需关注运行过程，只需保证末端元素无法被访问即可  
    //删除引用类型时，仅减少size不会删去对应元素的引用，
    //该对象在内存中仍然存在，需要设置为null。  
    public cheese removelast(){  
        cheese x = getlast();  
        size -= 1;  
        return x;  
    }  
  
    // 实现数组列表长度的增加--Resizing  
    // 创建一个更大的列表，把原列表已有的元素拷贝过来即可  
    private void resize(int capacity){  
        cheese[] a = (cheese[]) new Object[capacity];  
        System.arraycopy(items,0,a,0,size);  
        items = a;  
    }  
}
```


## Inheritance

- 创建方法时，使用一种列表类型作为参数，而要想使用另一列表类型又要重载一次函数，仅仅换了一种形参类型，把代码重复率直接拉满。
- 实际上他们都属于列表这一类型，为了避免重复，继承是必要的。

### Hypernym&Hyponyms

- Hypernym表示**上位关系**，而Hyponym表示**下位关系**
- 就比如说不同种类的狗都属于狗，狗是上位词，不同种类的各种狗是下位词。
- SSList和AList都属于某种列表，假设为List61b，则List61b为上位词，SSList和AList为下位词。

### Interface

- 关键字**Interface**，说明该类属于Hypernym
- 用法示例
```java
public interface List61b<Item>{

	public void addFirst(Item x);
	public void addLast(Item y);
    public Item getFirst();
    public Item getLast();
    public Item removeLast();
    public Item get(int i);
    public void insert(Item x, int position);
    public int size();
}
```
- Interface类中只声明了该类能使用的方法，而**没有具体实现**。*（Only what but not how）*

### implements

- 关键字**implements**，说明该类属于某种Interface的Hyponym。
- 示例：
```java
public class AList<Item> implements List61B<Item>{
   public void addLast(Item x) {    
	   //some functions implements...
   }
   //......
}
```
- 所有同一Interface的不同implements都为Interface类，都可以作为Interface的类型被函数形参接受，就不必重载函数了。
### override & overload

- 在子类中含有在父类中的函数声明结构一样的函数，这时就发生了函数重写*Overriding*
- 可以使用`@Override` 表明这是重写了父类的方法（就算不使用也可以重写的啦）
- 使用`@Override`,可以提醒我们是否重写了方法（若未重写则会报错）
- 例子
```java
public class interface Animal {
	public void makenoise();
}

@Overeide
public class Dog implements Animal{
	public void makenoise(){
		System.out.println()
	}
}
```

### Interface inheritance

- 使用关键字`implements` 的继承也叫接口继承。
- Interface：接口包含了方法的声明
- Inheritance：表明子类从父类继承
- 子类必须重写接口父类的所有函数方法（否则不通过编译）
- 子类能作为父类的参数传递：因为父类开辟的内存空间可以存放的下子类。


### Implementation Inheritance: Default Methods

- 使用关键字`default` 进行实现继承*Implementation Inheritance*
- 在接口类中使用`default` 实现方法时，可以使用未实现而已声明的方法，而不用研究其具体实现。
- 子类继承时将该方法继承，若无重写，则调用父类实现的方法
- 示例
```java
public class interface List61b<Item>{
	public void addFirst(Item x);
    public void addLast(Item y);
    public Item getFirst();
    public Item getLast();
    public Item removeLast();
    public Item get(int i);
    public void insert(Item x, int position); 
    public int size();
    
	default public void print(){
		for(int i = 0; i< size();i++){
			System.out.print(get(i)+" ");
		}
		System.out.println();
	}
}

//子类重写Default方法
public class SLList<Item> implements List61b<Item>{
	@Override
	public void print(){
		for(Node p = senienel.next;p!=null;p=p.next){
			System.out.print(p.item+" ");
		}
		System.out.println();
	}

}
```

## Static & Dynamic type

- 一个变量类型分为静态和动态两种，静态类型是编译时就确定的类型，动态类型是运行时确定的类型
### Static Type (Compile-time Type)

- 编译时就确定的数据类型。
- 在声明时就已经确定，并无法改变。

### Dynamic(Runtime Type)

- 运行时确定的数据类型。
- 在实例化时（使用new时）确定的数据类型，
```java
public static void main(String[] args){
	Livingthing = lt1;
	lt1 = new Fox();
	Animal a1 = lt1;
	Fox h1 = new Fox();
	lt1 = new Squid();
}

//按自上往下的顺序运行
// 变量名    静态类型      动态类型
// lt1      Livingthing  Fox
// a1       Animal       Fox
// h1       Fox          Fox
// lt1      Livingthing  Squid
```

### Dynamic method selection

- 动态方法选择：
	- 当静态类型与动态类型不同时，若动态类型重写了方法，则使用被重写的方法。
- DMS的两步法
	- 编译时确定了被调用的方法的签名。（仅使用静态类型决定）
	- 运行时，被调用对象的动态类型使用类型内的方法。
```java
public interface Animal {
  default void greet(Animal a) {
    print("hello animal"); }
  default void sniff(Animal a) {
    print("sniff animal"); }
  default void praise(Animal a) {
    print("u r cool animal"); }
}

public class Dog implements Animal {
  default void greet(Animal a)
  @Override  
  void sniff(Animal a) {
    print("dog sniff animal"); }
  default void praise(Animal a)
  //此处发生重载而不是重写，因此父类的praise被继承
  //相当于还有一个函数
  /*
  default void praise(Animal a) {
    print("u r cool animal"); }
  */
  void praise(Dog a) {
    print("u r cool dog"); }
}

public static void main(String[] args){
Animal a = new Dog();
Dog d = new Dog();
	a.greet(d);  // greet(Animal a) ->调用Dog中的greet：hello animal
	a.sniff(d);  // sniff(Animal a) ->调用Dog中的sniff：dog sniff animal
	d.praise(d); // praise(Dog a) -> 调用Dog中的praise：u r cool dog
	a.praise(d); // praise(Animal a) -> 调用Dog中的praise：u r cool animal
}
//最后一个其实调用的是Dog从Animal继承下来的方法，也处于Dog中
```

## Lab3通关！

![](https://img.picui.cn/free/2024/10/23/671883227a568.png)

