---
title: "epoll 与慢消费者：先看就绪队列"
description: "从就绪事件、应用队列和消费速率三个层次定位一次 epoll 服务中的慢消费者问题。"
pubDatetime: 2026-08-29T08:00:00+08:00
modDatetime: 2026-08-30T10:00:00+08:00
channel: technology
topics: [systems-programming, concurrency-engineering]
tags: [Linux, epoll, C++, performance]
kind: article
status: evolving
related: [technology/event-loop-notes, technology/message-surge-degradation]
draft: false
revisions:
  - date: 2026-08-30T10:00:00+08:00
    summary: "补充就绪队列与应用队列的区分。"
---

## 先区分两种堆积

`epoll_wait` 返回得快，不代表请求已经被及时消费。内核就绪队列和应用任务队列需要分别观测[^window]。

```cpp file="consumer.cpp" showLineNumbers
const auto ready = epoll_wait(fd, events, capacity, timeout_ms);
queue_depth.observe(worker_queue.size()); // [!code highlight]
```

## 再限制单次处理量

一次取走过多事件会让其他连接等待。固定批次上限，并在队列持续增长时降低非关键任务的进入速率。

```mermaid
flowchart LR
  Socket --> ReadyQueue
  ReadyQueue --> WorkerQueue
  WorkerQueue --> Consumer
```

[^window]: 两个队列应使用同一采样窗口，否则趋势无法直接比较。
