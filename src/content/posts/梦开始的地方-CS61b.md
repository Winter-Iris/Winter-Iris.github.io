---
title: cs61b梦开始的地方
description: CS61b配置经验
category: CS61B
published: 2026-01-19
tags:
  - cs61b
  - java
---
## 环境配置

- 可根据Lab1的文档进行配置

- 配置Git
	- https://git-scm.com/book/zh/v2/%E8%B5%B7%E6%AD%A5-%E5%AE%89%E8%A3%85-Git
- 配置Java
	- https://www.oracle.com/cn/java/technologies/downloads/archive/
- 安装IDEA社区版(付费版本下方)
	- https://www.jetbrains.com/zh-cn/idea/download/?section=windows
	- 安装对应插件（详见Lab1文档）
- **别忘了配置环境变量**
     
## 课程主页（sp21）

- https://sp21.datastructur.es/
- 搭配B站翻译视频效果更佳
	- https://m.bilibili.com/video/BV1hJ4m1M7ZA

## 拉取课程仓库

- 建立新的文件目录，拉取skeleton
	- `git clone --recursive https://github.com/Berkeley-CS61B/skeleton-sp21.git`
	- clone失败可以直接前往 https://github.com/Berkeley-CS61B/skeleton-sp21.git 下载压缩包到本地解压
- 拉取library
	- https://github.com/Berkeley-CS61B/library-sp21
	- clone或下载压缩包

## 配置IDEA

- 在IDEA中打开仓库目录，在文件->项目结构中设置SDK版本(保持最新就行)

![](https://s2.loli.net/2024/11/19/W7Xt6c4uxGvKCmB.png)
- 添加library库
	- 文件 -> 项目结构 -> 左边的项目设置 -> 库 -> +号 -> Kotlin/JS -> 选择拉取的library中的javalib文件夹 -> 导入类和源

![](https://s2.loli.net/2024/11/19/Ne4nopPtsQ1WkvO.png)

- 到这里就可以正常运行Lab1的文件了，别忘了设置源代码根目录(做哪个Lab/Proj时将对应的文件目录标记为源代码根目录就行了)
## 评分机使用

- 建立一个自己的github仓库，将对应的文件夹push上去。
- 进入 https://www.gradescope.com/ 注册账号
	- 课程代码：sp21-MB7ZPY，sp18-MNXYKX
	- 学校写UC Berkeley
	- 邮箱，姓名，学号随便填即可
- 交作业，进入对应的项目，选择github提交，选择刚刚push的仓库即可。

## Welcome to CS61B!!
## 参考文章

- 从0开始的CS61B生活--MingLLuo，Fallenpetal
- 再加上一些个人经验
