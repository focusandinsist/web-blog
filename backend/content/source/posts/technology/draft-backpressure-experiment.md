---
title: "未发布的背压实验"
description: "用于验证生产搜索索引不会包含草稿内容的内部测试记录。"
pubDatetime: 2026-08-30T08:00:00+08:00
channel: technology
topics: [concurrency-engineering]
tags: [testing]
kind: article
status: evolving
related: []
draft: true
revisions: []
---

## 实验标识

draft-backpressure-token 只用于自动化验证，不应出现在生产搜索结果中。

## 预期

草稿不会生成公开文章路由，也不会进入 Pagefind 索引。
