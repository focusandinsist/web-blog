---
title: "IM 网关连接治理从生命周期开始"
description: "用连接状态、心跳期限和重连预算整理 IM 网关的连接治理边界。"
pubDatetime: 2026-08-27T08:00:00+08:00
channel: technology
topics: [realtime-systems, concurrency-engineering]
tags: [Go, WebSocket, operations]
kind: article
status: complete
related: [technology/epoll-slow-consumer]
draft: false
revisions: []
---

## 定义连接状态

连接建立、鉴权、活跃、待关闭和已关闭必须有单向状态转换，避免多个协程重复回收同一连接。

## 控制重连成本

断线高峰时使用退避和随机抖动，并为单个用户设置重连预算，避免恢复过程制造新的洪峰。
