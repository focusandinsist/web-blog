---
title: "服务器帧循环需要时间预算"
description: "把游戏服务器帧循环拆成输入、模拟和输出阶段，并为每个阶段保留可观测的时间预算。"
pubDatetime: 2026-08-21T08:00:00+08:00
channel: technology
topics: [game-technology, realtime-systems]
tags: [C++, game-server, latency]
kind: case-study
status: evolving
related: [technology/event-loop-notes]
draft: false
revisions: []
---

## 拆分每帧预算

输入处理、世界模拟和网络输出分别计时，才能知道超时来自计算还是等待。

## 避免追赶失控

落后时无限补帧会继续挤压输出。设置最大追赶次数，并记录被跳过的非关键工作。
