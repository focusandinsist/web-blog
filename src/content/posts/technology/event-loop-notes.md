---
title: "事件循环中的延迟从哪里来"
description: "从任务排队、阻塞调用和调度抖动三个角度记录一次延迟问题的定位过程。"
pubDatetime: 2026-09-08T08:00:00+08:00
modDatetime: 2026-09-09T09:30:00+08:00
channel: technology
topics: [concurrency-engineering]
tags: [TypeScript, performance]
status: complete
series:
  id: event-loop-diagnostics
  order: 2
related:
  - life/reading-with-questions
  - investment/decision-journal
revisions:
  - date: 2026-09-09T09:30:00+08:00
    summary: "补充延迟排查步骤与关键指标。"
---

## 问题

一次延迟尖峰往往由多个很小的等待叠加而成。先确认现象发生在哪一层，再决定需要增加哪些观测点[^queue]。

**现象边界：**

不要从平均值开始。尾延迟、队列深度和超时分布更容易暴露慢消费者。

## 测量

下面的最小采样同时保留队列深度和等待阈值。

```ts file="latency.ts" showLineNumbers
const queueDepth = sampleQueueDepth(); // [!code highlight]
const timeoutMs = 30; // [!code --]
const timeoutMs = 50; // [!code ++]
```

### 关键指标

| 指标     | 用途                   |
| -------- | ---------------------- |
| 队列深度 | 判断生产与消费是否失衡 |
| 尾延迟   | 观察少量慢请求的影响   |

```mermaid
flowchart LR
  Producer --> Queue
  Queue --> Consumer
```

![蓝灰色频道配色](../../../assets/images/channel-technology.webp "频道配色占位图")

## 结论

先测量队列等待，再逐段排除阻塞调用和调度抖动。

[^queue]: 队列数据应在同一采样窗口内比较，避免时间范围不一致。

## 参考资料

- Node.js, _The Node.js Event Loop_, https://nodejs.org/，访问于 2026-09-09。
