# 系统工程笔记

一个基于 Astro 7 和 Content Collections 的本地中文个人博客 MVP，包含技术记录、生活记录和投资记录三个频道。

## 环境要求

- Node.js `>=22.12.0`
- pnpm

## 本地运行

```powershell
pnpm install
pnpm dev
```

开发服务器默认位于 `http://localhost:4321`。实际端口以终端输出为准。

## 验证与构建

```powershell
pnpm test
pnpm test:e2e
pnpm check
pnpm build
pnpm preview
```

Pagefind 索引由 `pnpm build` 生成。需要检查最新搜索内容时，先构建，再使用 `pnpm preview` 验收生产页面。

## 内容位置

- 文章：`src/content/posts/`
- 页面：`src/content/pages/`
- 频道与专题：`src/data/taxonomy.ts`
- 站点配置：`astro-paper.config.ts`

投资频道内容仅用于个人研究记录与复盘，不构成投资建议。
