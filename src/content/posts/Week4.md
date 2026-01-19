---
title: CS61b:Week 4
description: Java面向对象的编程特点
category: CS61B
published: 2026-01-19
tags:
  - java    
  - cs61b
---
## `Extends`关键字

- 当类是一个*Interface*接口的*Hyponym*时，使用`implements`关键字
- 类似地，当类是其他类的*Hyponym*时，使用`extends`关键字
- extends 继承了父类的所有实例变量，方法，嵌套类.

```java
public class List61b interface{//...
}
public class SLList implements List61b{}
public class RotatingSLList extends SLList {}

```
## `super`关键字

- 在子类引用父类中的元素时，可以使用`super`关键字
```java
public class VengefulSLList<Item> extends SLList<Item>{
	private SLList<Item> deletedItems;
	public Item removeLast(){
		Item oldBack = super.removeLast(); //使用父类的removeLast函数
		deletedItems.addLast(oldBack);
		return oldBack
	}
}
```
- 在子类调用构造函数时，也会调用父类的构造函数。
	- 注意没有`super`关键字时，隐式调用的是父类的默认构造函数(不带形参)
	- 若想要调用父类的有参构造函数则需加上super关键字。

```java
//正确的有参构造函数
public VengefulSLList(Item x){
	super(x);  // 调用SLList(Item x)
	deletedItems = new SLList<Item>();
}
//
public VengefulSLList(Item x){
	//调用SLList()
	deletedItems = new SLList<Item>();
}
```

## Object类

- 在Java中任何创建的对象都是Object类的子类，可以使用Object中的方法。

## 接口继承vs实现继承

- Interface Inheritance 实际上提供了(What 方式的继承)
	- 只提供方法的原型，不提供具体实现
- Implementation Inheritance 实际上提供了(How 方式的继承)
	- 提供了默认的用法，当然可以重写
- 这两种继承都是*is-a*的上下级关系，而不是*has-a*的关系。
	- 如：SLList is a List61b.

## Stack

- 数据结构栈只有两种用法：
	- `push()`: 在栈的顶部添加元素
	- `pop()`: 从栈顶弹出元素
- 栈和列表的关系
	- Stack is a List ? 错误，这样栈就多出了许多没用的方法（List中的方法）
	- Stack has a List.正确，栈用一个列表储存元素，而只有属于自己的两种用法.

## *Encapsulation*

- 封装(*Encapsulation*)，面向对象编程的三大特性之一。
- 封装提供了一个数据抽象层次。（不关心方法的具体实现，只关心方法的用法和效果，类比为一个黑箱）
- 封装有利于模块化编程。
- 实现继承破坏了封装。实现继承重写了父类封装中的方法，破坏了父类的封装性。
```java
//Dog.java
public void bark(){
	barkMany(1);
}
public void barkMany(int N){
	for (int i = 0;i < N ; i+=1){
		System.out.println("bark");}
}
//VerboseDog.java(继承自Dog)
public void barkMany(int N) {
	System.out.println("As a dog,I say: ");
	for(int i = 0; i < N;i += 1){
		bark()}
}
/*当我们调用VerboseDog的barkmany()时，会调用继承自父类Dog的bark()函数，而调用bark()函数时，会调用自身的barkmany()函数，造成无限循环。*/
```


## 类型检查和类型转换

### 类型检查

- Java编译器在编译程序时会进行类型检查(静态类型)，确保程序中每个语句的**静态类型**相匹配，否则不会通过编译。
- 表达式，函数等也具有编译时类型，编译器会检查是否匹配。
```java
//Example1.
//VengefulSLList是SLList的子类之一
//可以通过编译，右边表达式静态类型为VengefulSLList 可以与SLList匹配
SLList<Integer> sl = new VengefulSLList<Integer>();
//不行通过编译，右边表达式静态类型SLList不一定能与VengefulSLList匹配
VengefulSLList<Integer> vsl = new SLList<Integer>();

//Example2.
//Poodle是Dog的子类
public static Dog maxDog(Dog d1 , Dog d2) {...}
Poodle frank = new Poodle();
Poodle frankJt = new Poodle();
//不会通过编译，右边的Dog不能匹配左边的Poodle
Poodle largerPoodle = maxDog(frank,frankJr);
```
### 类型转换

- 类型转换十分强大，但同时也十分危险，使用时要非常小心。
```java
//举上面的例子为例
//类型转换，可以通过编译
Poodle largerPoodle = (Poodle)maxDog(frank,frankJr);
```

## 高阶函数(*Higher Order Funtion*)

- 将函数作为参数传递或返回的函数称为高阶函数(*Higher Order Funtion*)

### 在Java中的实现

- 将函数封装在类中作为参数进行传递即可。
- 缺点：要新建多个文件，来仅仅实现一个高阶函数。
```java
//jaca中抽象函数的实现，将函数封装在类中进行传递，以实现传递参数的行为
//f(f(x))的实现示例
//定义函数接口
//IntUnaryFuntion.java
public interface IntUnaryFuntion {
	int apply(int x);
}
//将乘以十倍的函数封装在类中
//TenX.java
public class TebX implements IntUnaryFuntion{
	@Override
	public int apply(int x){
		return 10*x;
	}
}
//将类进行传递，实现高阶函数
//Demo.java
public class Demo {
	public static doTwice(IntUnaryFuntion f ,int x){
		return f.apply(f.apply(x))
	}
}
```

## 子类型多态(*Subtype Polymorphism*)

### 子类型与子类

 - 只要是A类运用了extends关键字实现了对B类的继承，那么我们就可以说Class A是Class B的子类，只要满足继承的语法，就存在子类关系。
- 子类型比子类有更严格的要求，它不仅要求有继承的语法，同时要求如果存在子类对父类方法的改写（override），那么改写的内容必须符合父类原本的语义，其被调用后的作用应该和父类实现的效果方向一致。

### 子类型多态性

- *Polymorphism*多态：为不同类型的实体提供一个统一的接口。
- 派生类对象可以替代基类对象，从而实现多态性。它是面向对象编程中的一个重要特征。
- 子类型多态性，在面向对象编程的上下文中几乎被称为多态性，是一种类型的能力，A，像另一种类型B一样出现和使用。
- 多态通常有两种实现方法：
	- 子类继承父类（extends）
	- 类实现接口（implements）
- 核心之处在于对父类方法的改写或对接口方法的实现，以取得在运行时不同的执行效果。

### 内置`Comparable`接口和`Comparator`接口

- 重写比较接口：实现自定义类型的比较函数

- 内置可比较对象接口
```java
public interface Comparable<T>{
	public compareTo(T obj);
}
```
- 内置比较器接口
```java
public interface Comparator<T>{
	public int compare(T o1,T o2)
}
```

- 例子
```java
import java.util.Comparator;  
  
public class Dog1 implements Comparable<Dog1> {  
    public String name;  
    private int size;  
    public Dog1(String n ,int s){  
        name = n;  
        size = s;  
    }  
    public void bark(){  
        System.out.println(name + "bark");  
    }  
  
    public int size(){  
        return this.size;  
    }  
    //重写比较方法  
    @Override  
    public int compareTo(Dog1 o){  
        return this.size()-o.size();  
    }  
    //嵌套比较器类型  
    private static class Namecomparator implements Comparator<Dog1>{  
        @Override  
        public int compare(Dog1 d1,Dog1 d2){  
            return d1.name.compareTo(d2.name);  
        }  
    }  
    //获得比较器的接口函数  
    public static Comparator<Dog1> getNamecomparator(){  
        return new Namecomparator();  
    }  
  
    public static void main(String[] args){  
        Dog1 d1 = new Dog1("puppy",100);  
        Dog1 d2 = new Dog1("hashiqi",200);  
        if(d1.compareTo(d2)>0){  
            d1.bark();  
        } else {  
            d2.bark();  
        }  
        Comparator<Dog1> nc = Dog1.getNamecomparator();  
        Dog1 d3 = new Dog1("Oski",200);  
        Dog1 d4 = new Dog1("Cerebus",999999);  
        int cmp = nc.compare(d3,d4);  
        if(cmp > 0){  
            d3.bark();  
        } else {  
            d4.bark();  
        }  
    }  
}
```


### Enhanced For Loops

```java
Set<Integer> S = new HashSet<>();
S.add(5);
S.add(12);
S.add(23);
//增强的for循环遍历集合中的每一个元素。
for(int i : S){
	System.out.println(i);
}
```

### 迭代器Iterator

- 内置迭代器接口
```java
public interface Iterator<T>{
	boolean hasnext(); //迭代器指向的元素是否为空
	T next();          //返回迭代器指向的元素，并把迭代器向后推移
}
```

- 增强for循环的内在实现
```java
for(int i : S){
	System.out.println(i);
}

//增强for循环的实现是利用迭代器来实现的。
Iterator<Integer> seek = new S.iterator();
while(seek.hasnext()){
	System.out.println(seek.next());
}
```

- 实现迭代器方法
	- `hasnext()`
		- 若迭代器指向的对象不为空，则返回真，否则返回假
	- `next()`
		- 返回迭代器当前指向的对象，将迭代器的指向向后推移（使其指向下一个元素）

- 内置可迭代对象(具有迭代器的类)接口
```java
public interface Iterable<T>{
	Iterator<T> iterator(); //获取迭代器的方法
}
```

- 自定义类要想正常使用增强for循环的条件
	- 实现可迭代对象接口
	- 要有类内有迭代器（接口）的实现

- 示例代码
```java
import java.util.Iterator;  
  //使用数组实现集合实现可迭代对象
public class Arrayset<T> implements Iterable<T> {  
    private T[] items;  
    private int size = 0;  
    //构造函数
    public Arrayset(){  
	    //创建列表的方法
        items = (T[]) new Object[100];  
        size = 0;  
    }  
    //返回大小
    public int size(){  
        return this.size;  
    }  
    //返回是否包含该元素
    public boolean contain(T x){  
        for(int i = 0;i<size;i++){  
            if(items[i] == x){  
                return true;  
            }  
        }  
        return false;  
    }  
	//添加元素
    public void add(T x){  
	    //检查是否重复
        if(!contain(x)){  
            items[size] = x;  
            size+=1;  
        }  
    }  
  
    //嵌套迭代器类  
    private class ArraysetIterator implements Iterator<T>{  
        //实现接口函数重写  
        //记录迭代器当前指向的位置
        private int curpos = 0;  
        @Override  
        public boolean hasNext(){  
            return curpos<size;  
        }  
        @Override  
        public T next(){  
	        //得到当前指向的元素
            T returnitem = items[curpos];  
            //将迭代器向后移动
            curpos+=1;  
            return returnitem;  
        }  
    }  
  
    //返回迭代器的接口  
    @Override
    public Iterator<T> iterator(){  
        return new ArraysetIterator();  
    }  
  
	//测试
    public static void main(String[] args){  
        Arrayset<Integer> set = new Arrayset<>();  
        set.add(5);  
        set.add(13);  
        set.add(23);  
        for (int i : set){  
            System.out.println(i);  
        }  
    }  
}
```

### `Object:toString`

- 函数原型
```java
public String toString();
```

- java中的所有类都是Object的子类，因此继承了Object的方法
- 在使用Java的`System.out.print`时，实际上隐式调用了`toString`方法
- `toString`方法的重写
```java
@Override
public String toString(){  
        String output = "[";  
        //注意这里使用this的增强for循环，而不是items的  
        for(T i :this){  
            output += i.toString() + " ";  
        }  
        output += "]";  
return output;
}
```
- 使用内置的字符串构建类构建字符串来加快运行速度（前一种方法构建时会创建原字符串的副本，处理大型数据时耗时大）
```java
@Override
public String toString(){
	StringBuilder op = new StringBuilder();  
	op.append("[");  
	for (T i : this){  
	    op.append(i);  
	}  
	op.append("]");  
	return op.toString();
}
```

### `Object:equals`

- 原型
```java
public class Object{
	...
	public boolean equals(Object obj) {
		return (this == obj);
	}
}
```

- 使用Object内置的`equal`函数可以比较两个对象是否相同
	- **仅仅比较内存中存储的比特位**，如果存储的是引用类型，只比较储存的对象的地址是否相同，而不比较对象的属性。
- 用户可以重写`equal`函数使其满足个性化的需要
```java
@Override  
public boolean equals(Object o){  
    //判断对象的类型，如果是的话则会创建一个对应类型的变量otherarrayset  
    if(o instanceof Arrayset otherarrayset){  
        if(this.size != otherarrayset.size){  
            return false;  
        }  
        for (T i : this){  
            if(!otherarrayset.contain(i)){  
                return false;  
            }  
        }  
    }  
    return true;  
}
```

- `instanceof` 方法
	- 用来检查对象是否为相应的类型，例子如上所述
	- 如果o为对应类型则返回真，且将o转化为对应类型的变量，名为otherarrayset
	- 如果o不为对应类型则返回假
```java
if(o instanceof Arrayset otherarrayset){  
        //......
    } 
```

### Lab4 & Proj1 通关！