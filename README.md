# 系统工程笔记

一个基于 Astro 7 和 Content Collections 的本地中文个人博客 MVP。站点以 Markdown/MDX 文件作为内容源，提供技术记录、生活记录和投资记录三个频道，以及专题、系列、项目复盘、全文搜索和亮暗主题。

当前项目是静态站点，不包含 Web 管理后台、数据库、账户或在线发布工作流。文章可以自由增删改查，但需要直接编辑仓库中的内容文件并重新构建站点。

## 主要能力

- 首页封面和三频道内容大厅
- 文章、频道、专题和项目复盘目录
- 按频道和专题筛选文章
- Pagefind 本地全文搜索，支持频道、专题和标签过滤
- 文章目录、同专题文章、系列进度、延伸阅读和修订记录
- Shiki 代码高亮、Mermaid、表格、脚注和图片预览
- 亮色、暗色、跟随系统三种主题
- 响应式布局、键盘操作和基础无障碍支持

## 技术栈

- Astro 7、TypeScript 6
- Astro Content Collections、Markdown、MDX
- Tailwind CSS 4
- Shiki、Mermaid、PhotoSwipe、Pagefind
- Vitest、Playwright、axe-core

## 环境要求

- Node.js `>=22.12.0`
- pnpm

## 本地运行

```powershell
pnpm install
pnpm dev
```

开发服务器默认位于 `http://localhost:4321`，实际地址和端口以终端输出为准。

开发模式适合查看页面和编辑内容，但不会重新生成最新的 Pagefind 搜索索引。需要验收搜索时，请使用生产构建和预览：

```powershell
pnpm build
pnpm preview
```

## 常用命令

| 命令                 | 作用                                          |
| -------------------- | --------------------------------------------- |
| `pnpm dev`           | 启动 Astro 开发服务器                         |
| `pnpm test`          | 运行 Vitest 单元测试                          |
| `pnpm test:watch`    | 监听文件变化并运行单元测试                    |
| `pnpm test:e2e`      | 运行 Playwright 端到端测试                    |
| `pnpm article:new`   | 创建一篇默认未发布的本地文章草稿              |
| `pnpm content:check` | 检查频道、专题、关联文章和系列引用完整性      |
| `pnpm lint`          | 运行 ESLint                                   |
| `pnpm check`         | 运行内容完整性、Astro 类型、ESLint 和格式检查 |
| `pnpm format`        | 使用 Prettier 格式化项目                      |
| `pnpm build`         | 检查并构建静态站点，同时生成 Pagefind 索引    |
| `pnpm preview`       | 本地预览 `dist/` 中的生产构建                 |

Playwright 回归还包含无 JavaScript 基础能力检查和站点健康检查；发布前应确保核心页面、图片、站内链接和资源请求均无错误。

## 项目架构

项目采用“内容文件 -> 内容集合 -> 纯 TypeScript 查询 -> Astro 页面”的静态生成流程：

```text
src/content/posts/*.{md,mdx}
          │
          ▼
src/content.config.ts          校验 Frontmatter 和内容类型
          │
          ▼
src/utils/content.ts           过滤草稿和定时文章，组织频道、专题、系列和相关推荐
          │
          ▼
src/pages/**/*.astro           在构建阶段生成首页、目录页和文章页
          │
          ├──> dist/           可直接预览或部署的静态文件
          └──> Pagefind        生产构建生成全文搜索索引
```

页面只负责组合和渲染，内容筛选、排序及关联关系集中在 `src/utils/content.ts`。首页、目录、文章上下文和搜索因此基于同一份 Content Collections 数据。

### 目录结构

```text
web-blog/
├── astro.config.ts                 # Astro、Markdown、Shiki 和 Mermaid 配置
├── astro-paper.config.ts           # 站点信息、分页、主题、搜索和分享配置
├── public/                         # 保持固定公开路径的资源
├── scripts/
│   └── copy-pagefind.mjs           # 同步构建后的搜索资源
├── src/
│   ├── assets/                     # 本地图片和 SVG 图标
│   ├── components/
│   │   ├── article/                # 文章目录、移动阅读栏、系列和延伸阅读
│   │   ├── directory/              # 文章目录列表
│   │   ├── home/                   # 首页封面和频道内容大厅
│   │   ├── navigation/             # 桌面及移动导航
│   │   └── theme/                  # 三态主题切换
│   ├── content/
│   │   ├── pages/                  # 关于等独立内容页
│   │   └── posts/                  # Markdown/MDX 文章源文件
│   ├── data/taxonomy.ts            # 频道和专题定义
│   ├── layouts/                    # 基础页面和文章布局
│   ├── pages/                      # Astro 文件路由
│   ├── styles/                     # 页面与主题样式
│   ├── content.config.ts           # Content Collections Schema
│   └── utils/content.ts            # 内容查询与关联逻辑
└── tests/
    ├── unit/                       # 内容模型和分类单元测试
    └── e2e/                        # 首页、导航、文章、搜索和主题 E2E
```

### 主要路由

| 路由                          | 内容                               |
| ----------------------------- | ---------------------------------- |
| `/`                           | 首页封面与三频道内容大厅           |
| `/articles/`                  | 全部已发布文章，支持频道和专题筛选 |
| `/articles/[channel]/[slug]/` | 文章正文                           |
| `/channels/`                  | 频道总览                           |
| `/channels/[channel]/`        | 指定频道的专题和文章               |
| `/topics/`                    | 专题总览                           |
| `/topics/[topic]/`            | 指定专题、系列和文章               |
| `/projects/`                  | `case-study` 类型的项目复盘        |
| `/search/`                    | Pagefind 全文搜索                  |
| `/about/`                     | 关于页面                           |

## 管理文章

### 内容存放规则

文章位于以下三个目录：

```text
src/content/posts/technology/
src/content/posts/life/
src/content/posts/investment/
```

建议文件名使用英文小写和连字符。例如 `src/content/posts/technology/epoll-slow-consumer.md` 会生成：

```text
/articles/technology/epoll-slow-consumer/
```

文件目录和文件名决定 URL；Frontmatter 中的 `channel` 决定频道归类。两者应保持一致，避免 URL 和频道归类表达不同含义。重命名或移动文件会改变文章 URL，也需要同步更新其他文章中的 `related` 引用。

### 新增文章

推荐使用本地命令创建初始草稿：

```powershell
pnpm article:new -- --channel technology --slug io-backpressure --title "I/O 背压记录" --topic systems-programming
```

命令会创建 `src/content/posts/<channel>/<slug>.md`，并默认设置 `draft: true`。它只是本地文件脚手架，不是 Web 管理后台，也不会自动发布文章。

也可以继续手工创建 Markdown/MDX：

1. 在对应频道目录中创建 `.md` 或 `.mdx` 文件。
2. 填写 Frontmatter，并至少指定一个专题。
3. 在 Frontmatter 下方编写 Markdown/MDX 正文。
4. 运行 `pnpm content:check` 校验频道、专题、关联文章和系列引用。
5. 运行 `pnpm check` 校验字段、类型和格式。
6. 运行 `pnpm build` 检查静态路由和搜索索引。

最小文章模板：

```md
---
title: "文章标题"
description: "用于目录、搜索和页面元信息的文章摘要，长度需要在 20 到 180 个字符之间。"
pubDatetime: 2026-09-14T10:00:00+08:00
channel: technology
topics: [systems-programming]
tags: [Linux]
draft: true
---

## 问题

正文内容。

## 结论

正文内容。
```

新文章建议先设置 `draft: true`。确认内容和页面无误后，将其改为 `false` 或删除该字段，再执行生产构建。

### 查询文章

- 浏览全部文章：访问 `/articles/`。
- 按频道浏览：访问 `/channels/[channel]/`。
- 按专题浏览：访问 `/topics/[topic]/`。
- 全文搜索：先运行 `pnpm build` 和 `pnpm preview`，再访问 `/search/`。
- 在源码中查找：直接在 `src/content/posts/` 中按文件名、标题或正文搜索。

首页每个频道先按 `featuredRank` 推荐顺序排列，未设置推荐顺序的文章再按“最后修改时间优先，否则按发布时间”倒序排列；目录和专题中的文章始终按该更新时间规则倒序排列。

### 修改文章

直接编辑对应的 `.md` 或 `.mdx` 文件。修改已经发布的文章时，建议同时：

- 将 `modDatetime` 更新为本次修改时间。
- 在 `revisions` 中记录有实质意义的修订。
- 检查 `topics`、`tags`、`series` 和 `related` 是否仍然有效。
- 执行 `pnpm content:check`、`pnpm check` 和 `pnpm build`。

修订记录示例：

```yaml
modDatetime: 2026-09-14T16:00:00+08:00
revisions:
  - date: 2026-09-14T16:00:00+08:00
    summary: "补充故障边界和验证结果。"
```

### 删除文章

1. 删除对应的 `.md` 或 `.mdx` 文件。
2. 搜索并移除其他文章 `related` 中对该文章 ID 的引用。
3. 如果文章属于系列，检查剩余文章的 `series.order` 是否仍然连续。
4. 重新运行 `pnpm content:check`、`pnpm check` 和 `pnpm build`。

文章 ID 是相对于 `src/content/posts/` 的无扩展名路径，例如 `technology/epoll-slow-consumer`。删除源文件并重新构建后，对应静态页面和搜索记录才会从最新构建产物中消失。

### 发布、撤回与定时文章

- `draft: true`：不生成公开文章页，也不进入首页、目录、RSS 和搜索索引。
- `draft: false` 或省略 `draft`：允许发布。
- `pubDatetime` 晚于构建时间：视为定时文章，在到达发布时间后的下一次构建中发布。
- 临时撤回文章：将 `draft` 改为 `true` 并重新构建。

这是静态站点，不会在时间到达时自动构建。定时文章仍需要届时手动或由外部自动化重新执行 `pnpm build`。

### Frontmatter 字段

| 字段           | 必填 | 说明                                                               |
| -------------- | ---- | ------------------------------------------------------------------ |
| `title`        | 是   | 文章标题                                                           |
| `description`  | 是   | 20 到 180 个字符的摘要                                             |
| `pubDatetime`  | 是   | 发布时间                                                           |
| `channel`      | 是   | `technology`、`life` 或 `investment`                               |
| `topics`       | 是   | 至少一个专题 ID；第一个专题用于文章上下文                          |
| `author`       | 否   | 默认使用站点作者                                                   |
| `modDatetime`  | 否   | 最后修改时间，存在时也参与文章排序                                 |
| `tags`         | 否   | 标签数组，默认空数组                                               |
| `kind`         | 否   | `article` 或 `case-study`；后者进入项目复盘页                      |
| `status`       | 否   | `complete`、`evolving` 或 `archived`；仅表示内容状态，不控制发布   |
| `featuredRank` | 否   | 1 到 99 的首页频道推荐顺序；数值越小越靠前，未设置时按更新时间倒序 |
| `series`       | 否   | `{ id, order }`，用于生成系列顺序和上一篇/下一篇                   |
| `related`      | 否   | 最多 3 个文章 ID，延伸阅读会优先使用这些文章                       |
| `heroImage`    | 否   | 本地头图；显示在文章标题下方                                       |
| `heroAlt`      | 条件 | 设置 `heroImage` 时必填的替代文本                                  |
| `draft`        | 否   | 是否为草稿，默认 `false`                                           |
| `revisions`    | 否   | `{ date, summary }` 数组，默认空数组                               |
| `ogImage`      | 否   | 文章分享图；未设置时使用站点默认分享图                             |
| `canonicalURL` | 否   | 规范 URL                                                           |

频道和预定义专题维护在 `src/data/taxonomy.ts`。新增频道时还需要同步扩展 Content Schema、频道类型、页面和样式；新增专题通常只需添加一条专题定义并在文章中引用其 ID。

## 内容关联规则

- 一篇文章只能属于一个频道，但可以属于多个专题。
- `topics[0]` 是文章页上下文使用的主专题。
- 系列仅表达阅读顺序，不代替专题归类。
- `related` 使用文章 ID，不使用完整 URL。
- 延伸阅读优先采用 `related`，不足三篇时从主专题补齐。
- `kind: case-study` 的文章同时出现在常规文章目录和项目复盘页。
- `status: archived` 只显示归档状态；需要撤回文章时应使用 `draft: true`。
- 投资频道和投资文章会固定显示“不构成投资建议”的风险提示。

## 图片与静态资源

- 首页和频道图片位于 `src/assets/images/`。
- 文章图片建议放在 `src/assets/` 下，并使用相对路径引用。
- `public/` 用于无需 Astro 处理、需要保持固定公开路径的文件。
- 核心页面不应依赖远程图片地址。
- 正文图片会进入图片说明和预览增强；`heroImage` 会显示在文章标题下方并使用 `heroAlt` 作为替代文本。

## 验证与构建

提交内容或代码前建议依次运行：

```powershell
pnpm test
pnpm test:e2e
pnpm check
pnpm build
```

其中 `pnpm build` 会先执行 Astro 类型检查，然后生成静态页面和 Pagefind 索引。搜索验收必须基于最新生产构建，不能只检查开发服务器。

测试范围：

- `tests/unit/`：内容发布规则、排序、频道、专题、系列和相关推荐。
- `tests/e2e/`：首页、导航、筛选、文章阅读、搜索、主题持久化和无障碍。
- `tests/e2e/no-js.spec.ts`：关闭 JavaScript 后的首页、频道和文章基础导航。
- `tests/e2e/site-health.spec.ts`：核心页面的控制台、请求、图片和站内链接健康状态。

## 站点配置

- 站点名称、作者、URL、分页、搜索和分享入口：`astro-paper.config.ts`
- Astro、Markdown、MDX、Shiki 和 Mermaid：`astro.config.ts`
- 频道和专题：`src/data/taxonomy.ts`
- 文章数据约束：`src/content.config.ts`
- 关于页面：`src/content/pages/about.md`

当前 `site.url` 指向本地地址。若未来部署到线上，需要先改为正式站点 URL，再重新构建 sitemap、RSS、规范链接和分享元信息。

## 当前范围

本地 MVP 暂不包含以下能力：

- Web 内容管理后台
- 用户、角色和权限系统
- 评论、访问统计和邮件订阅
- 数据库和远程对象存储
- 自动部署、域名和远程 CI 配置
- PWA 和离线缓存

投资频道内容仅用于个人研究记录与复盘，不构成投资建议。
