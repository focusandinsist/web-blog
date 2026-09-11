---
title: "PostgreSQL 热点行不是索引问题"
description: "从锁等待、写入所有权和数据模型三个角度记录 PostgreSQL 热点行的处理方法。"
pubDatetime: 2026-08-25T08:00:00+08:00
channel: technology
topics: [data-systems]
tags: [PostgreSQL, database, performance]
kind: case-study
status: complete
related: [technology/storage-boundaries]
draft: false
revisions: []
---

## 先确认锁等待

慢查询只说明耗时，事务等待关系才能说明是否存在同一行上的串行竞争。

## 改变写入边界

将高频计数拆成分片记录，再异步归并，可以缩短锁持有时间，但需要明确读取一致性的取舍。
