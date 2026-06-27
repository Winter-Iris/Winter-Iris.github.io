---
title: Web与HTTP协议
description: HTTP协议的工作原理与Web应用架构
published: 2026-06-27
category: 计算机网络
tags:
    - 计算机网络
---

# HTTP

- Web的应用层协议是**超文本传输协议**(HyperText Transfer Protocol,HTTP),它是Web的核心，在[RFC1945]和[RFC2616]中进行了定义。
- HTTP由两个程序实现：**一个客户程序和一个服务器程序**。客户程序和服务器程序运行在不同的端系统中，通过交换 HTTP报文进行会话。
- HTTP定义了这些报文的结构以及客户和服务器进行报文交换的方式。
- Web页面(Web page)(也叫文档)是由对象组成的。一个**对象**(object)只是一个文件，诸如一个HTML文件、一个JPEG图形、一个Java小程序或一个视频片段这样的文件，且它们**可通过一个URL地址寻址**。
- 多数Web页面含有一个HTML基本文件(base HTML fle)以及几个引用对象。
- HTML基本文件**通过对象的URL地址引用页面中的其他对象**。
- HTTP定义了Web客户向Web服务器请求Web页面的方式，以及服务器向客户传送Wb页面的方式。
```
协议名://用户名:密码@主机名/路径:端口号
Prot://user:psw@www.someschool.edu/someDept/pic.gif:port
```
- HTTP**建立在TCP链接之上**
- 客户向它的**套接字接口**发送HTTP请求报文并从它的套接字接口接收HTTP响应报文。类似地，服务器从它的**套接字接口**接收HTTP请求报文和向它的套接字接口发送HTTP响应报文。
- HTTP是一个**无状态协议**(stateless protocol)。*服务器向客户发送被请求的文件，而不存储任何关于该客户的状态信息。*

# （非）持续连接

- **非持续连接**：每个请求/响应对是经一个**单独**的TCP连接发送
- **持续连接**：所有的请求及其响应经**相同**的TCP连接发送

## 非持续连接的HTTP

1. HTTP客户进程在端口号80**发起**一个到服务器www.someSchool.edu的**TCP连接**，该端口号是HTTP的默认端口。在客户和服务器上分别有一个套接字与该连接相关联。
2. 位于www.someSchool.edu的HTTP服务器在80端口等待连接，**接受链接，通知客户端**
3. HTTP客户经它的套接字**向该服务器发送一个HTTP请求报文**。请求报文中包含了路径名/someDepartment/home.index（请求文件）
4. HTTP服务器进程经它的套接字**接收该请求报文**，从其存储器(RAM或磁盘)中检索出对象www.someSchool.edu/someDepartment/home.index,**在一个HTTP响应报文中封装对象，并通过其套接字向客户发送响应报文**。
5. HTTP服务器进程通知TCP断开该TCP连接。
6. 客户从响应报文中提取出该文件，检查该HTML文件，得到对10个JPEG图形的引用。对每个引用的JPEG图形对象重复前5个步骤。

- 特点：其中**每个TCP连接在服务器发送一个对象后关闭**，即该连接并不为其他的对象而持续下来。

```mermaid
sequenceDiagram
    participant Client as HTTP客户进程
    participant Server as www.someSchool.edu<br/>HTTP服务器

    Note over Client,Server: 步骤1-5: 请求主页 home.index
    Client->>Server: TCP SYN (发起连接，端口80)
    Server-->>Client: TCP SYN+ACK (接受连接)
    Client->>Server: TCP ACK (连接建立，套接字关联)
    Client->>Server: HTTP GET /someDepartment/home.index
    Note over Server: 检索对象 /someDepartment/home.index
    Server-->>Client: HTTP 200 OK (包含 home.index 文件)
    Server->>Client: TCP FIN (通知断开连接)
    Client-->>Server: TCP ACK
    Client->>Server: TCP FIN
    Server-->>Client: TCP ACK

    Note over Client: 解析HTML，提取10个JPEG图形引用

    loop 对每个JPEG图形对象 (共10个)
        Note over Client,Server: 重复步骤1-5 (获取一个JPEG)
        Client->>Server: TCP SYN (发起连接，端口80)
        Server-->>Client: TCP SYN+ACK (接受连接)
        Client->>Server: TCP ACK (连接建立)
        Client->>Server: HTTP GET /someDepartment/图片X.jpg
        Note over Server: 检索JPEG对象
        Server-->>Client: HTTP 200 OK (包含JPEG图形)
        Server->>Client: TCP FIN (通知断开连接)
        Client-->>Server: TCP ACK
        Client->>Server: TCP FIN
        Server-->>Client: TCP ACK
    end
```

# RTT往返时间

- RTT是指**一个短分组从客户到服务器然后再返回客户**所花费的时间
- 浏览器在它和 Web 服务器之间发起一个 TCP 连接，这涉及一次“三次握手”过程， 
	- 即客户向服务器发送一个小 TCP 报文段，服务器用一个小 TCP 报文段做出确认和响应，
	- 最后，客户向服务器返回确认。
	- 三次握手中前两个部分所耗费的时间占用了一个 RTT 。完成了三次握手的前两个部分后，客户结合三次握手的第三部分（确认）向该 TCP 连接发 送一个 HTTP 请求报文 
	- 一旦该请求报文到达服务器，服务器就在该 TCP 连接上发送 HTML文件。
	- 该 HTTP 请求 响应用去了另一个 RTT 
	- 因此，粗略地讲，总的响应时间就是 两个 RTT 加上服务器传输 HTML 文件的时间

$$非持久HTTP响应时间=2RTT+对象传输时间（每个对象）$$
# 持久HTTP

- 服务器在传输完一个对象之后，仍然保留着TCP连接
- 后续的HTTP响应报文（被请求的对象在一个服务器之上）在该TCP连接上陆续传输
- 流水线方式：客户端在遇到每个被引用的对象时立即在TCP连接上发出请求 
- 流水线方式：所有的被引用对象 会在一个RTT时间内被获取（减少一半的响应时间） 
![](Pasted%20image%2020260428140357.png)

# HTTP报文格式

## 请求报文

- HTTP 请求报文的第一行叫作**请求行** （request line) , 其后继的行叫作**首部行** (header line)

1. **请求行**（Request Line）  
    格式：`方法 请求URI 版本`
    - 方法：如 GET、POST、PUT、DELETE 等
    - 请求URI：资源路径，如 `/someDepartment/home.index`
    - 版本：如 HTTP/1.0、HTTP/1.1、HTTP/2
2. **请求头部**（Request Headers）  / 首部行
    - 零个或多个键值对，每行格式 `字段名: 值`，用于传递附加信息（如 Host、User-Agent、Accept、Connection 等）。
    - `Host`:对象所在的主机
    - `Connection`:是否建立持续连接
    - `User-agent`:用户代理（向服务器发送请求的浏览器类型）

```
GET /someDepartment/home.index HTTP/1.1
Host: www.someSchool.edu
User-Agent: Mozilla/5.0
Accept: text/html
Connection: close
```

- HTTP通用格式
![](Pasted%20image%2020260428140956.png)

- GET方法 (用于发送数据到服务器上)
	- 在HTTP GET请求消息的URL字段中包括着用户数据（后面跟着一个“？”）
- POST方法
	- Web网页通常包含有表单输入
	- 包含在HTTP POST请求报文的实体中的用户输入 从客户端发向服务器
- HEAD 方法
	- 仅仅请求URL对象的头部，而 HTTP GET方法中会请求URL对象的全部
- PUT方法
	- 向服务器上载文件（对象） 
	- 用PUT HTTP请求消息实体体中的内容完全替换指定URL处存储的文件

## 响应报文

```
HTTP/1.1 200 OK 
Date: Tue, 08 Sep 2020 00:53:20 GMT 
Server: Apache/2.4.6 (CentOS) OpenSSL/1.0.2k-fips PHP/7.4.9 mod_perl/2.0.11 Perl/v5.16.3 
Last-Modified: Tue, 01 Mar 2016 18:57:50 GMT 
ETag: "a5b-52d015789ee9e" 
Accept-Ranges: bytes 
Content-Length: 2651 
Content-Type: text/html; 
charset=UTF-8 
\r\n 
data data data data data ...
```

1. 第一行为：**响应行**（Status Line）/状态行
	格式：`HTTP版本 状态码 状态描述`
	- **HTTP版本**：如 `HTTP/1.0`、`HTTP/1.1`、`HTTP/2`
	- **状态码**：三位数字，表示请求的处理结果
	- **状态描述**：状态码的文本解释，如 `OK`、`Not Found`

#### 常见状态码分类：

| 分类  | 说明    | 例子                                      |
| --- | ----- | --------------------------------------- |
| 1xx | 信息性   | 100 Continue                            |
| 2xx | 成功    | 200 OK, 201 Created                     |
| 3xx | 重定向   | 301 Moved Permanently, 304 Not Modified |
| 4xx | 客户端错误 | 404 Not Found, 403 Forbidden            |
| 5xx | 服务器错误 | 500 Internal Server Error               |

2. 响应头部（Response Headers）
	- 键值对形式：`字段名: 值`  
	- 用于告知客户端关于服务器、响应内容、连接等方面的元信息。

#### 常见响应头部字段：

| 字段名              | 作用               | 示例                              |
| ---------------- | ---------------- | ------------------------------- |
| `Content-Type`   | 响应体的媒体类型         | `text/html; charset=utf-8`      |
| `Content-Length` | 响应体的大小（字节）       | `3487`                          |
| `Location`       | 重定向的目标URL        | `https://example.com/newpage`   |
| `Server`         | 服务器软件信息          | `Apache/2.4.41`                 |
| `Date`           | 响应生成的日期时间        | `Tue, 28 Apr 2026 10:00:00 GMT` |
| `Set-Cookie`     | 服务端要求客户端保存Cookie | `sessionId=abc123; Path=/`      |
| `Cache-Control`  | 缓存策略             | `no-cache, max-age=3600`        |
| `Connection`     | 连接管理（保持或关闭）      | `close` 或 `keep-alive`          |
3. 空行
	- 一个单独的 `CRLF`（回车换行，即 `\r\n`）。  
	- **作用**：通知客户端“响应头部已结束，接下来是响应体”。即使没有响应体，也必须有这个空行。

4. 响应体
	- 承载被请求的资源数据，或者错误说明页面。
	- **GET 请求成功**：返回 HTML、图片、JSON、CSS 等文件内容
	- **POST 请求成功**：可能返回处理结果（如 JSON 数据）
	- **错误响应**：返回错误页面文本（如 404 页面）

# Cookie

- **Cookie** 是服务器发送到用户浏览器并保存在本地的一小块数据。它是由于 HTTP 协议本身是无状态（Stateless）的，为了**让服务器能够“记住”用户**而诞生的。
- Web服务站点和客户端浏览器使用 cookies在它们之间的事务上**维持状态**

- 四组成部分
	- 包含在**响应报文**的头部行中Cookie
	- 包含在**请求报文**头部行中的Cookie 
	- Cookie文件被保存在**用户的端系统**中，被用户的浏览器管理 
	- 在Web服务站点的**后台数据库**中

## 流程

```mermaid
sequenceDiagram
    autonumber
    participant B as 浏览器 (Browser)
    participant S as 服务器 (Server)

    Note over B, S: 第一阶段：初次访问（无状态）
    B->>S: HTTP GET /index.html (无 Cookie)
    S-->>B: HTTP 200 OK (返回页面)

    Note over B, S: 第二阶段：身份识别与颁发
    B->>S: HTTP POST /login (提交凭据)
    Note right of S: 验证通过，生成 Session ID
    S-->>B: HTTP 200 OK
    Note right of S: 响应头包含 Set-Cookie: ID=abc123
    
    Note left of B: 浏览器解析属性并存入本地<br/>(HttpOnly, Secure, Max-Age等)

    Note over B, S: 第三阶段：后续请求（自动携带）
    B->>S: HTTP GET /profile
    Note left of B: 自动在 Header 加入 Cookie: ID=abc123
    S-->>B: HTTP 200 OK (识别 ID 后返回个人数据)

    Note over B, S: 第四阶段：失效/过期
    Note left of B: 超过 Max-Age 或手动清除
    B->>S: HTTP GET /index.html (不再携带 Cookie)
    Note right of S: 服务器识别为匿名用户
```
1. 初次见面，浏览器向服务器发送一个标准的 **HTTP GET 请求**。此时，请求头（Request Headers）中没有任何关于该网站的 Cookie。
2. 服务器收到请求后，发现你是一个新客（或者你还没登录）。它会根据你的身份（如登录成功后）生成一些数据。服务器在发回网页内容的同时，会在 **HTTP 响应头**中加入一个 `Set-Cookie` 字段。
3. 浏览器收到响应后，解析 `Set-Cookie` 字段，并将这些数据保存在本地的存储空间中（通常是一个名为 `Cookies` 的小型数据库文件）。
	- 如果设置了 `Expires` 或 `Max-Age`，它就是**持久 Cookie**，存在硬盘里；   
	- 如果没有设置过期时间，它就是**会话 Cookie**，存在内存里，浏览器一关就没了。
- 当你点击该网站的下一个页面（或刷新页面）时，浏览器会先检查本地存储。如果发现有属于该域名的、且未过期的 Cookie，它会**自动**将其放入 **HTTP 请求头**的 `Cookie` 字段中。
- 服务器收到请求，看到 `Cookie` 字段里的 ID。它通过查自己的数据库或内存，瞬间想起：“哦，这是 ID 为 abc123xyz 的用户，他刚才已经登录过了。”于是直接返回你的个人主页。

# Web缓存

- 目标：满足用户的请求，但是不会访问原始服务器
- 浏览器将HTTP请求发向缓存
	- 如果被请求对象在缓存中：缓存直接返回给客户端被请求的对象 
	- 否则：向原始服务器请求对象， 缓存接收并缓存下来，将该对象返回给客户端
```mermaid
sequenceDiagram
    autonumber
    participant B as 浏览器 (Browser)
    participant C as 缓存 (Cache/CDN)
    participant S as 源服务器 (Server)

    Note over B, S: 第一次请求 (获取缓存)
    B->>S: GET /style.css
    S-->>B: 200 OK (包含 Cache-Control: max-age=3600, Etag: "v1")
    Note left of B: 浏览器将文件存入本地

    Note over B, S: 第二次请求 (强缓存生效)
    Note left of B: 检查发现未超过 3600 秒
    B->>B: 直接从内存/硬盘读取 (from disk cache)

    Note over B, S: 第三次请求 (强缓存过期，发起协商)
    Note left of B: 时间已过，发起校验
    B->>S: GET /style.css (If-None-Match: "v1")
    
    alt 内容未修改
        S-->>B: 304 Not Modified (不传正文，极快)
        Note left of B: 继续放心使用本地缓存
    else 内容已修改
        S-->>B: 200 OK (传回最新内容, Etag: "v2")
        Note left of B: 更新本地缓存
    end
```

- 时延的计算
$$T_{avg} = H \cdot T_c + (1 - H) \cdot T_m$$
- **$H$ (Hit Rate)：** **缓存命中率**。即请求的资源直接在缓存中找到的概率（通常为 0 到 1 之间的小数）。
- **$T_c$ (Cache Time)：** **缓存访问时延**。指从缓存设备（如本地内存或就近的 CDN 节点）读取数据所需的时间。
- **$T_m$ (Miss Time / Main Memory Time)：** **源服务器访问时延**。当缓存未命中时，请求必须转发给原始服务器（Origin Server）并传回数据的时间。
- **$(1 - H)$：** **缺失率（Miss Rate）**。

# 条件GET

- 目标: 如果缓存侧具有最新的对象， 无需访问服务器

## 基于最后修改时间 (Last-Modified)

1. **初次请求：** 服务器响应 `Last-Modified: Fri, 10 Apr 2026 10:00:00 GMT`。
2. **条件 GET：** 浏览器下次请求时带上 `If-Modified-Since`，值就是上次的那个时间。
3. **结果：** 服务器对比时间。如果没变，返回 **304**；变了，返回 **200** 和新内容。

```mermaid
sequenceDiagram
    autonumber
    participant B as 浏览器 (已存有旧副本)
    participant S as 服务器

    B->>S: GET /logo.png <br/> If-None-Match: "xyz789" <br/> If-Modified-Since: Wed, 01 Apr 2026
    
    Note over S: 检查资源状态...

    alt 内容未变动
        S-->>B: 304 Not Modified
        Note left of B: 极速！直接从本地读取旧文件
    else 内容已更新
        S-->>B: 200 OK (包含新 ETag)
        Note left of B: 下载新文件并更新缓存
    end
```
