---
title: "存储边界如何影响系统设计"
description: "整理数据所有权、写入路径和恢复目标之间的关系，避免把存储只看成技术选型。"
pubDatetime: 2026-09-05T08:00:00+08:00
channel: technology
topics: [data-systems, concurrency-engineering]
series:
  id: event-loop-diagnostics
  order: 3
---

## 边界

先明确谁拥有数据，再决定由哪个组件持久化。

## 取舍

恢复时间和一致性要求会直接改变写入路径。
