# 系统工程笔记

一个由 Django Admin 管理内容、由 Astro 静态生成页面的中文个人博客。文章和分类保存在 Django 数据库中；Astro 在开发和构建时读取只读发布 API，生成频道、专题、文章、RSS 和 Pagefind 搜索索引。

发布、编辑和撤回文章通过 Django Admin 完成。公开站点仍为静态输出，API 不可用时构建会失败。

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

- Astro 7、TypeScript 6、Markdown
- Django 5.2、Django REST Framework、SQLite
- Tailwind CSS 4
- Shiki、Mermaid、PhotoSwipe、Pagefind
- Vitest、Playwright、axe-core

## 环境要求

- Node.js `>=22.12.0`
- pnpm
- Python `>=3.10`

## 本地运行

```powershell
pnpm install
Copy-Item .env.example .env
python -m pip install -r backend/requirements.txt
pnpm django:migrate
pnpm dev
```

`pnpm dev` 会启动 Django 和 Astro，并在 API 健康检查通过后启动 Astro。默认地址为 Django Admin/API `http://127.0.0.1:8000/` 和 Astro `http://127.0.0.1:4321/`。按 `Ctrl+C` 会停止两个服务。

需要登录 Admin 时，运行 `pnpm django:createsuperuser` 创建管理员。`.env` 可调整数据库、媒体目录、监听地址和端口。局域网访问时，将 `ASTRO_HOST` 和 `DJANGO_BIND_HOST` 设为 `0.0.0.0`，把主机的局域网 IPv4 地址加入 `DJANGO_ALLOWED_HOSTS`，并将 `CONTENT_API_URL` 改为 `http://<主机IPv4>:8000/api/publication/v1/`；Windows 防火墙需允许 4321 和 8000 端口的入站连接。仅本机开发可保留 `.env.example` 中的默认 API 地址。

开发模式适合查看页面和编辑内容，但不会重新生成最新的 Pagefind 搜索索引。需要验收搜索时，请使用生产构建和预览：

```powershell
pnpm build
pnpm preview
```

## 常用命令

| 命令                          | 作用                                            |
| ----------------------------- | ----------------------------------------------- |
| `pnpm dev`                    | 等待 Django API 健康后启动 Django 和 Astro      |
| `pnpm django:migrate`         | 应用 Django 数据库迁移                          |
| `pnpm django:check`           | 检查 Django 配置                                |
| `pnpm django:createsuperuser` | 创建 Admin 管理员                               |
| `pnpm django:test`            | 运行 Django 测试                                |
| `pnpm test`                   | 运行 Vitest 单元测试                            |
| `pnpm test:e2e`               | 运行 Playwright 端到端测试                      |
| `pnpm content:check`          | 检查迁移参考 Markdown 中的内容关联              |
| `pnpm check`                  | 运行迁移内容校验、Astro 类型、ESLint 和格式检查 |
| `pnpm build`                  | 检查 API 并构建静态站点和 Pagefind 索引         |
| `pnpm preview`                | 本地预览 `dist/` 中的生产构建                   |

Playwright 回归还包含无 JavaScript 基础能力检查和站点健康检查；发布前应确保核心页面、图片、站内链接和资源请求均无错误。

## 项目架构

项目采用“Django 数据库 -> 只读发布 API -> Astro 视图模型 -> 静态页面”的生成流程：

```text
backend/content/models.py
          │
          ▼
backend/content/api.py         公开文章、专题和健康检查
          │
          ▼
src/data/djangoArticleSource.ts 映射 DTO 并检查 API 健康状态
          │
          ▼
src/utils/content.ts           组织频道、专题、系列和相关推荐
          │
          ├──> dist/            可直接预览或部署的静态文件
          └──> Pagefind         生产构建生成全文搜索索引
```

文章 Markdown 由 Django API 提供，Astro 在构建期渲染；Django 媒体路径会转换为绝对 URL。`src/content/pages/` 仍通过 Astro collection 提供关于页等静态页面。

### 目录结构

```text
web-blog/
├── astro.config.ts                 # Astro、Markdown、Shiki 和 Mermaid 配置
├── astro-paper.config.ts           # 站点信息、分页、主题、搜索和分享配置
├── .env.example                    # Django、API 和 Astro 本地配置
├── backend/                        # Django Admin、SQLite 模型和发布 API
├── public/                         # 保持固定公开路径的资源
├── scripts/
│   ├── dev.mjs                     # 并行启动 Django 和 Astro
│   ├── check-content-api.mjs       # 构建前 API 健康检查
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
│   │   └── posts/                  # 只读迁移参考文章
│   ├── data/taxonomy.ts            # 频道和专题定义
│   ├── layouts/                    # 基础页面和文章布局
│   ├── pages/                      # Astro 文件路由
│   ├── styles/                     # 页面与主题样式
│   ├── content.config.ts           # Content Collections Schema
│   └── utils/content.ts            # 内容查询与关联逻辑
├── tests/
│   ├── unit/                       # 内容模型和分类单元测试
│   └── e2e/                        # 首页、导航、文章、搜索和主题 E2E
└── test/backend/                   # Django Admin/API 和导入测试
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

运行 `pnpm dev` 后访问 `http://127.0.0.1:8000/admin/`。首次使用先运行 `pnpm django:createsuperuser` 创建管理员。

在 Django Admin 中新建或编辑文章，设置频道、一个或多个专题、发布时间、正文 Markdown、图片、系列和关联文章。保存后重启 `pnpm dev` 以重新载入开发服务器中的文章快照；生产静态页面、RSS、sitemap 和搜索索引需重新运行 `pnpm build`。

`src/content/posts/` 中的 Markdown 文件保留为迁移参考和 fixture 输入，不是公开站点的默认数据源。新增、修改或撤回线上可见内容请通过 Django Admin 完成。

频道和专题定义由 Django 数据库维护；Astro 将发布 API 的 `primaryTopic` 用于文章上下文，并将 `topics` 用于多专题归类。

文章仅在 Django 的 `is_draft` 为 `false` 且 `pub_datetime` 不晚于当前时间时公开；更改状态或发布时间后，开发页面会读取 API 当前状态，生产输出需重新构建。

## 内容关联规则

- 一篇文章只能属于一个频道，但可以属于多个专题。
- `primaryTopic` 是文章页上下文和相关推荐使用的主专题。
- 系列仅表达阅读顺序，不代替专题归类。
- `related` 使用文章 ID，不使用完整 URL。
- 延伸阅读优先采用 `related`，不足三篇时从主专题补齐。
- `kind: case-study` 的文章同时出现在常规文章目录和项目复盘页。
- `status: archived` 只显示归档状态；需要撤回文章时应使用 `draft: true`。
- 投资频道和投资文章会固定显示“不构成投资建议”的风险提示。

## 图片与静态资源

- 首页和频道图片位于 `src/assets/images/`。
- 文章图片由 Django 媒体存储管理。
- `public/` 用于无需 Astro 处理、需要保持固定公开路径的文件。
- 文章正文媒体链接会在构建期解析为 Django 的绝对媒体 URL。
- 正文图片会进入图片说明和预览增强；`heroImage` 会显示在文章标题下方并使用 `heroAlt` 作为替代文本。

## 验证与构建

提交内容或代码前建议依次运行：

```powershell
pnpm test
pnpm test:e2e
pnpm check
pnpm build
```

其中 `pnpm build` 会先检查 Django API 健康状态，再执行 Astro 类型检查、生成静态页面和 Pagefind 索引。API 不可用时会在构建开始前以明确错误退出。

测试范围：

- `tests/unit/`：内容发布规则、排序、频道、专题、系列和相关推荐。
- `tests/e2e/`：首页、导航、筛选、文章阅读、搜索、主题持久化和无障碍。
- `tests/e2e/no-js.spec.ts`：关闭 JavaScript 后的首页、频道和文章基础导航。
- `tests/e2e/site-health.spec.ts`：核心页面的控制台、请求、图片和站内链接健康状态。

## 站点配置

- 站点名称、作者、URL、分页、搜索和分享入口：`astro-paper.config.ts`
- Astro、Markdown、MDX、Shiki 和 Mermaid：`astro.config.ts`
- 频道和专题：`src/data/taxonomy.ts`
- Django 模型和 API：`backend/content/`
- Astro 文章 DTO 和渲染：`src/data/`、`src/utils/remoteMarkdown.ts`
- 关于页面：`src/content/pages/about.md`

当前 `site.url` 指向本地地址。若未来部署到线上，需要先改为正式站点 URL，再重新构建 sitemap、RSS、规范链接和分享元信息。

## 当前范围

本地 MVP 暂不包含以下能力：

- 自动发布构建和线上部署流水线
- 用户、角色和权限系统
- 评论、访问统计和邮件订阅
- 远程对象存储
- 自动部署、域名和远程 CI 配置
- PWA 和离线缓存

投资频道内容仅用于个人研究记录与复盘，不构成投资建议。
