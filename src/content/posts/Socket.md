---
title: Socket套接字
description: Socket套接字的抽象层原理与编程接口
published: 2026-06-27
category: 计算机网络
tags:
    - 计算机网络
---

**Socket（套接字）** 是应用层与传输层之间的一个**抽象层**。
从编程的角度来看，Socket 是一个**通信端点**。要实现网络通信，通常需要一对 Socket：一个运行在客户端，一个运行在服务端。

## Socket 的主要类型

根据传输层协议的不同，Socket 主要分为两类：
### A. 流式套接字 (Stream Sockets - TCP)

- **特点：** 面向连接、可靠传输、保证顺序、无差错。
- **比喻：** 打电话。双方必须先建立连接，通话过程中数据按顺序传输，挂断前连接一直存在。
- **场景：** 网页浏览（HTTP）、文件传输（FTP）、邮件（SMTP）。

### B. 数据报套接字 (Datagram Sockets - UDP)

- **特点：** 无连接、不可靠传输、不保证顺序、但速度快。
- **比喻：** 发短信或寄明信片。你只管发出去，不保证对方一定收到，也不保证接收顺序。
- **场景：** 视频会议、在线游戏、实时监控（丢失一两帧没关系，但延迟要低）

# Sockaddr_in

它主要用于 IPv4 地址的表示，Socket 需要知道 **“往哪儿发”** 或 **“在哪儿等”**。这就需要 IP 地址和端口号。`sockaddr_in` 就是在 **IPv4 (AF_INET)** 协议族下，用来存储这些信息的特定结构体。

- 表示IP地址和port捆绑关系的数据结构（标示进程间通信的一个端节点）
- 结构
```c
struct sockaddr_in {
    short            sin_family;   // 协议族，通常设置为 AF_INET (代表 IPv4)
    unsigned short   sin_port;     // 16位端口号 (必须是网络字节序)
    struct in_addr   sin_addr;     // 32位 IP 地址结构体
    char             sin_zero[8];  // 填充位，为了让结构体大小与通用的 sockaddr 对齐
};
```

# hostent
- **`hostent`** 是一个专门用于存储**主机信息**的结构体。它的名字是 **"host entry"** 的缩写。
- `hostent` 主要用于 **DNS 解析（Domain Name Resolution）**。
- 结构
```c
struct hostent {
    char  *h_name;       // 主机的正式名称 (Canonical Name)
    char **h_aliases;    // 主机的别名列表 (多个域名可能指向同一台机器)
    int    h_addrtype;   // 地址类型 (通常是 AF_INET，即 IPv4)
    int    h_length;     // 地址的长度 (IPv4 通常是 4 字节)
    char **h_addr_list;  // 指向主机的 IP 地址列表 (一个域名可能有多个 IP)
};
```

# APIs


### `socket()`：创建套接字

**原型：** `int socket(int domain, int type, int protocol);`
- **`domain` (协议族)：** 决定了通信的范围。
    - `AF_INET`：IPv4 网络通信（最常用）。
    - `AF_INET6`：IPv6 网络通信。
    - `AF_UNIX`：同一台机器上的进程间通信（IPC）。
- **`type` (套接字类型)：**
    - `SOCK_STREAM`：面向连接的流（对应 **TCP**）。
    - `SOCK_DGRAM`：无连接的数据报（对应 **UDP**）。
- **`protocol` (协议)：**
    - 通常传 `0`，让系统根据 `type` 自动选择（如 `SOCK_STREAM` 默认选 TCP）。
- **返回值：** 成功返回一个**文件描述符**（一个整数），失败返回 `-1`。

### `bind()`：绑定地址

**原型：** `int bind(int sockfd, const struct sockaddr *addr, socklen_t addrlen);`
- **`sockfd`**：`socket()` 函数返回的那个整数 ID。
- **`addr`**：指向地址结构体的指针。虽然参数类型是通用的 `sockaddr`，但你实际传入的是你之前填好的 **`sockaddr_in`** 的指针。
- **`addrlen`**：地址结构体的长度，通常用 `sizeof(struct sockaddr_in)`。
- **意义：** 告诉内核：“如果有发往这个 IP 和端口的数据，请传给这个 `sockfd`。”

### `listen()`：开启监听

**原型：** `int listen(int sockfd, int backlog);`
- **`sockfd`**：已经绑定的套接字。
- **`backlog` (积压队列长度)：**
    - 这是最关键的参数。它规定了**已完成三次握手、但尚未被程序 `accept` 的连接**最大数量。
    - 如果队列满了，新的客户端连接会收到拒绝或超时。通常设置为 5、10 或 128

### `accept()`：接受连接

**原型：** `int accept(int sockfd, struct sockaddr *addr, socklen_t *addrlen);`
- **`sockfd`**：监听套接字（那个“总机”）。
- **`addr`** (输出参数)：传入一个空的 `sockaddr_in` 结构体地址，内核会把**客户端的 IP 和端口**填进去。
- **`addrlen`** (输入输出参数)：传入结构体大小的指针，函数返回时会修改为实际写入的大小。
- **返回值：** 成功则返回一个**全新的套接字**，专门用于和这个客户聊天。

### `connect()`：发起连接 (客户端)

**原型：** `int connect(int sockfd, const struct sockaddr *addr, socklen_t addrlen);`
- **参数与 `bind` 类似**，但 `addr` 里填的是**服务器的地址**。
- **动作：** 调用此函数会触发 TCP 的三次握手。


### `send()` 与 `recv()`：传输数据

**原型：** 
`ssize_t send(int sockfd, const void *buf, size_t len, int flags);`
`ssize_t recv(int sockfd, void *buf, size_t len, int flags);`

- **`buf`**：存储待发送数据或接收数据的缓冲区。
- **`len`**：缓冲区的大小。
- **`flags`**：通常传 `0`。
    - 可选标志如 `MSG_DONTWAIT`（非阻塞模式）或 `MSG_PEEK`（查看数据但不从缓冲区取走）。

### `getsockopt()`/`setsockopt()`

这两个函数分别用于**读取**和**设置**套接字的各种属性（Options）：
- **`getsockopt`**：从内核中**读取**当前套接字的某个配置值。
- **`setsockopt`**：向内核**写入**一个新的配置值，改变套接字的行为。

```c
int getsockopt(int sockfd, int level, int optname,       void *optval, socklen_t *optlen);
int setsockopt(int sockfd, int level, int optname, const void *optval, socklen_t  optlen);
```

- **`sockfd`**：你要操作的那个套接字变量（文件描述符）。
- **`level` (级别)**：指定你要操作协议栈的哪一层。
    - `SOL_SOCKET`：通用套接字选项（与协议无关，如缓冲区大小）。
    - `IPPROTO_TCP`：TCP 协议特有选项（如禁用 Nagle 算法）。
    - `IPPROTO_IP`：IP 层选项（如设置 TTL 生存时间）。
- **`optname` (选项名)**：具体要修改哪个参数。例如 `SO_REUSEADDR`（地址重用）。
- **`optval`**：指向存放选项值的缓冲区。
    - 在 `setsockopt` 中，这是**输入**，你把要设置的值传给内核。
    - 在 `getsockopt` 中，这是**输出**，内核把查到的值写到这里。
- **`optlen`**：`optval` 指向的空间长度。



# TCP:CS例子


- Server
1. 创建监听套接字变量
```c
int listen_fd = socket(AF_INET, SOCK_STREAM, 0);
```
2. 绑定变量到特定地址（在这个端口上等待用户请求）
```c
bind(listen_fd, &serv_addr, sizeof(serv_addr));
```
3. 开启监听
```c
listen(listen_fd, 10);
```
4. 接受连接，创建新的连接Socket
```c
struct sockaddr_in client_addr; // 用于存储对方的信息 
socklen_t addr_len = sizeof(client_addr); 
int conn_fd = accept(listen_fd, &client_addr, &addr_len);
```
5. 此处会阻塞，直到有客户端请求
6. 使用返回的新的socket进行交换
7. 收发
```c
recv(conn_fd, buffer, 1024, 0); 
send(conn_fd, "Hello", 5, 0);
```
8. 关闭
```c
close(conn_fd); 
close(listen_fd);
```


- Client
1. 创建CLientSocket
```c
int client_fd = socket(AF_INET, SOCK_STREAM, 0);
```
2. 绑定端口（操作系统自动完成）
```c
bind(client_id,&client_addr,sizeof(client_addr));
```
3. 连接至服务器地址（发起TCP请求）
```c
connect(client_fd, &dest_addr, sizeof(dest_addr));
```
4. 收发
```c
send(client_fd, "Hi", 2, 0);
recv(client_fd, buffer, 1024, 0);
```
5. 关闭
```c
close(client_fd);
```

# 网络字节顺

- 在计算机网络中，**字节序（Byte Order）** 解决的是“多字节数据在内存中如何排列”的问题。

- 当一个数字超过 1 个字节（比如 `u16` 或 `u32`）时，它在内存里有两种存储方式：
- **小端序 (Little-Endian)**：低位字节存储在内存的低地址。
    - **特点**：Intel (x86) 和 AMD 处理器主要使用这种方式。
    - **直观理解**：数字是“倒着”存的。
- **大端序 (Big-Endian)**：高位字节存储在内存的低地址。
    - **特点**：这更符合人类的阅读习惯（从左到右）。
    - **直观理解**：数字是“正着”存的。

- 为了让全世界的计算机能互相理解，TCP/IP 协议栈强制规定：**在网络上传输的数据必须使用大端序。**
- **网络字节序 (Network Byte Order)** = **大端序 (Big-Endian)**
- **主机字节序 (Host Byte Order)** = **该机器自身的存储方式**（对于你的开发环境，通常是小端序）。

### C 语言中的转换函数：

- **`htons()`**: **h**ost **t**o **n**etwork **s**hort (主机字节序 -> 网络字节序，16位，用于端口)
- **`htonl()`**: **h**ost **t**o **n**etwork **l**ong (主机字节序 -> 网络字节序，32位，用于 IP)
- **`ntohs()`**: **n**etwork **t**o **h**ost **s**hort (反向转换)
- **`ntohl()`**: **n**etwork **t**o **h**ost **l**ong (反向转换)

- 只要这个数据是给“**网络协议栈**”看的，或者**需要跨机器传输多字节数值，就需要转换。**
- 当你准备调用 `bind`、`connect` 或 `sendto` 时，你需要填写 `sockaddr_in` 结构体。其中的 **端口号（Port）** 和 **IP 地址** 是给操作系统内核和网络路由器看的。
- **端口号**：它是 `u16`（2字节）。必须用 `htons()`。 
- **IP 地址**：它是 `u32`（4字节）。通常用 `htonl()` 或 `inet_addr()`（后者内部会自动处理字节序）。


# UDPSocket


UDP 编程最显著的特点是：**没有 `listen` 和 `accept`，也没有 `connect`（通常情况下）。**

### 服务端（Receiver）的动作：

1. **创建（socket）**：领到一个信箱，指定类型为 `SOCK_DGRAM`。
2. **绑定（bind）**：给信箱挂上门牌号（IP 和端口）。
3. **接收（recvfrom）**：守在信箱旁等着收信。由于没有连接，它必须在收信的同时记住对方的地址。
4. **回复（sendto）**：按照刚才记下的地址回信。


### 客户端（Sender）的动作：

1. **创建（socket）**：领到一个信箱。
2. **发送（sendto）**：写好信件，并在信封上写好目标的 IP 和端口，直接投递。
3. **接收（recvfrom）**：等待对方的回信。

## `sendto()`：发送数据报

这是 UDP 最核心的发送接口，它比 TCP 的 `send` 多了目标地址信息。
**原型：**
```c
ssize_t sendto(int sockfd, const void *buf, size_t len, int flags,
               const struct sockaddr *dest_addr, socklen_t addrlen);
```

- **`buf` & `len`**：要发送的数据及其长度。
- **`dest_addr`**：**关键参数**。指向目标主机 IP 和端口的结构体指针。因为没有连接，每次发包都必须指明“寄往哪里”。
- **`addrlen`**：地址结构体的长度。
- **特性**：`sendto` 成功返回并不代表对方收到了，只代表数据已经成功拷贝到了内核的发送缓冲区。


## `recvfrom()`：接收数据报

接收数据的同时，能够获取发送方的身份。
**原型：**
```c
ssize_t recvfrom(int sockfd, void *buf, size_t len, int flags,
                 struct sockaddr *src_addr, socklen_t *addrlen);
```

- **`buf` & `len`**：存放接收数据的缓冲区及其最大容量。
- **`src_addr`** (输出参数)：这是一个空瓶子，内核会把**发送方的 IP 和端口**装进去。这样你才能知道是谁发的消息，并能回信。
- **`addrlen`** (输入输出参数)：预设缓冲区大小，返回时为实际地址大小。
- **特性**：这是一个阻塞函数。如果没有数据包到来，程序会一直停在这里。
