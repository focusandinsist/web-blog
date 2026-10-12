---
title: "协议调试先确认事实"
description: "记录如何用最小抓包和状态对照定位协议问题，并把猜测收敛为可以验证的假设。"
pubDatetime: 2026-09-02T08:00:00+08:00
channel: technology
topics: [systems-programming]
series:
  id: event-loop-diagnostics
  order: 1
---

## 现象

协议故障的日志通常只展示了链路的一侧。

## 方法

对齐时间、请求标识和状态转换后，再判断错误发生在哪一层。
