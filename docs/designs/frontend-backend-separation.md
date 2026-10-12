# 前后端完全拆分重构方案

## 1. 目标与边界

本次重构把 `web-blog` 变成一个包含两个独立应用的仓库：

- `frontend`：Astro 静态站点，负责页面、样式、客户端交互、构建期内容渲染和 Pagefind 索引。
- `backend`：Django 内容服务，负责数据库、Admin、文章发布规则、只读发布 API 和媒体文件。

两个应用继续放在同一个 Git 仓库中，但必须满足以下条件：

1. 可以只摘出 `frontend/`，使用它自己的 README、依赖文件、环境变量和 Dockerfile 运行或部署。
2. 可以只摘出 `backend/`，使用它自己的 README、依赖文件、环境变量和 Dockerfile 运行或部署。
3. 前端和后端之间只通过已记录的 HTTP API 和媒体 URL 通信，不通过对方的源码、相对文件路径或共享脚本通信。
4. 仓库根目录不再放置应用源码、应用依赖或只服务于单个应用的配置。

本文件描述目标结构和迁移步骤；完成文档不代表已经执行目录迁移。

## 2. 当前结构与需要解除的耦合

当前仓库已经形成了 Astro + Django 的职责分工，但运行入口仍然是单仓库入口：

| 当前耦合 | 具体表现 | 拆分后的处理 |
| --- | --- | --- |
| 前端配置在根目录 | `package.json`、Astro 配置、`src/`、`public/` 和前端测试位于根目录 | 全部迁移到 `frontend/` |
| 后端依赖根目录环境 | `backend/config/settings.py` 从根目录读取 `.env` | 后端只读取 `backend/.env` 或部署环境变量 |
| 统一开发脚本 | `scripts/dev.mjs` 同时启动 Django 和 Astro | 前端和后端分别提供单应用启动命令；根目录 Compose 只作为可选编排入口 |
| 根目录 Dockerfile | 当前 Dockerfile 只构建 Astro | `frontend/Dockerfile` 和 `backend/Dockerfile` 各自可独立构建 |
| 跨目录命令 | 前端脚本通过 `backend/manage.py` 执行 Django 命令 | 应用内命令使用当前项目目录的相对路径 |
| 测试混放 | `test/backend/` 与前端测试共用根目录 | 前端测试放入 `frontend/`，后端测试放入 `backend/` |
| API 契约分散在设计文档、fixture 和后端 README | 前端构建前检查 Django 健康接口，但独立摘取后缺少双方共同入口 | 把已有 API 路由/字段契约、媒体 URL、构建失败条件对齐到双方 README 和契约文档 |

迁移时不得把已有的公开路由、API 字段、文章发布规则和媒体链接行为作为“目录整理”顺手改变。

## 3. 目标目录结构

目标结构如下。省略号表示应用内部的现有文件，文件必须归属于对应应用。

```text
web-blog/
├── frontend/
│   ├── src/
│   ├── public/
│   ├── scripts/
│   ├── tests/
│   ├── test/                         # 仅前端测试
│   ├── package.json
│   ├── pnpm-lock.yaml
│   ├── astro.config.ts
│   ├── astro-paper.config.ts
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── playwright.config.ts
│   ├── .env.example
│   ├── .dockerignore
│   ├── Dockerfile
│   └── README.md
├── backend/
│   ├── config/
│   ├── content/
│   ├── tests/
│   ├── manage.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── .dockerignore
│   ├── Dockerfile
│   └── README.md
├── docs/
│   ├── designs/
│   └── superpowers/
├── .gitignore
├── LICENSE
└── README.md
```

根目录只保留仓库级说明和协作文件。`.github/`、编辑器配置或 CI 配置可以作为仓库级杂项保留，但不得成为前后端运行时的依赖。`node_modules/`、`dist/`、`.astro/`、缓存、测试报告和本地数据库属于生成或本地文件，必须被忽略，不应作为目标结构的一部分提交。

### 3.1 前端归属

以下现有内容迁移到 `frontend/`：

- `src/`、`public/`、`tests/` 以及前端相关的 `test/*.test.ts`。
- `package.json`、`pnpm-lock.yaml`、`pnpm-workspace.yaml`（若不再有工作区，可删除并改用单项目 `package.json`）。
- `astro.config.ts`、`astro-paper.config.ts`、`tsconfig.json`、`vitest.config.ts`、`playwright.config.ts`、ESLint 和 Prettier 配置。
- `scripts/check-content-api.mjs`、`scripts/copy-pagefind.mjs`、`scripts/start-playwright-server.mjs` 等只服务于 Astro 的脚本。
- 前端自己的 `README.md`、`.env.example`、`.dockerignore` 和 `Dockerfile`。

`scripts/dev.mjs` 不再启动 Django。若保留该文件，它只能启动 Astro，并且命令不能隐式访问仓库外的后端源码。

### 3.2 后端归属

以下内容属于 `backend/`：

- `manage.py`、`config/`、`content/`、Django migration、fixture、导入命令和 Django 测试。
- 当前 `test/backend/test_*.py` 迁移为 `backend/tests/` 或对应 Django app 的测试目录。
- `test/backend/read_publication_api.mjs` 改写为 Python/Django API 契约测试并迁移到后端；后端验收不依赖 Node 或 pnpm。
- `requirements.txt`、后端 `.env.example`、`.dockerignore`、`Dockerfile` 和 `README.md`。
- 当前 `src/content/posts/` 及其正文、hero、OG 图片引用迁移为 `backend/content/source/posts/`，作为一次性导入和内容校验的后端输入；前端只保留 `src/content/pages/` 等真正由 Astro 管理的静态页面。
- 文章源文件引用的 `src/assets/images/` 图片不能继续通过前端路径提供；将这些导入所需图片复制到 `backend/content/source/media/`，并把 Markdown 引用改为后端源目录内的相对路径。仍由页面组件直接使用的频道封面等展示资源继续留在前端。
- `scripts/check-content.ts`、`scripts/generate-publication-fixture.mjs`、`scripts/new-article.mjs` 及其测试迁移为后端管理命令或后端工具；从 `backend/` 运行时默认路径使用 `content/source/posts/`，代码内部按 `BASE_DIR / "content" / "source" / "posts"` 解析，不再通过前端源码目录提供内容。
- `publication.json` 和 `publication_api.json` 仅作为 API/导入结果校验快照，不作为 Django 数据库种子；独立后端的初始内容由 `backend/content/source/posts/` 和 `import_publication --apply` 提供。
- 数据库迁移和初始 publication 导入所需的 fixture。`db.sqlite3` 不属于部署产物；当前未跟踪的本地 SQLite 文件应删除，并在忽略规则中明确排除，项目设置继续强制使用 PostgreSQL。

## 4. 应用边界与通信契约

### 4.1 前端职责

前端负责：

- Astro 路由、组件、样式、主题和无 JavaScript 基础能力。
- 在构建期请求后端公开 API，并把 DTO 转换为页面使用的视图模型。
- 渲染远程 Markdown、解析媒体 URL、生成 RSS、sitemap 和 Pagefind 索引。
- 页面、组件、内容映射和浏览器端交互的单元测试与 E2E 测试。

前端不应导入 Django Python 模块、读取 `backend/content/` 文件、直接读取数据库或在容器中启动 Django。

### 4.2 后端职责

后端负责：

- Article、Channel、Topic、Tag、Series、Revision 及关联关系的数据模型。
- Django Admin、发布过滤、字段校验、Markdown 原文保存和媒体存储。
- 面向公开站点的只读 API，以及 `/admin/` 和健康检查接口。
- 数据库迁移、导入命令、API 契约测试和后端服务日志。

后端不应包含 Astro 页面、页面 CSS、Pagefind 资源或前端构建逻辑。

### 4.3 HTTP API 契约

API 前缀继续使用 `/api/publication/v1/`，迁移阶段保持现有字段和状态码：

| 方法 | 路径 | 用途 | 前端失败行为 |
| --- | --- | --- | --- |
| `GET` | `/health/` | 检查服务和数据库连接 | 构建立即失败并显示 API 地址 |
| `GET` | `/articles/` | 获取已发布文章列表 | 构建失败，不生成不完整站点 |
| `GET` | `/articles/{channel}/{slug}/` | 获取文章详情和 Markdown | 路由按 404 处理；其他错误使构建失败 |
| `GET` | `/taxonomy/` | 获取频道和专题 | 构建失败，不使用前端硬编码替代数据 |

`backend/content/fixtures/publication_api.json` 继续作为响应样例。任何字段、路由或发布规则变化都要先更新 API 契约，再同步前端 DTO 和测试。

### 4.4 媒体和浏览器请求

后端序列化器继续返回可从前端部署环境访问的绝对媒体 URL。前端构建期会把正文中的 `/media/...` 链接解析为后端媒体源地址。

- `CONTENT_API_URL` 只表示构建期 API 地址；新增 `CONTENT_MEDIA_ORIGIN` 表示生成页面使用的公开媒体源。构建机可以使用内网 API 地址，但不能把该内网主机名写入导出的图片链接。
- 后端新增 `DJANGO_PUBLIC_ORIGIN`（或等价的公开源配置），序列化器优先用它生成 hero/OG 绝对 URL；正文媒体解析也使用这个公开源。开发环境可回退到当前请求地址。
- 前端静态页面不直接从浏览器请求公开 API，因此构建期 API 地址和运行时媒体源地址必须分别配置清楚。
- 公开 API 不应把数据库凭据、Admin 凭据或写入权限暴露给前端。
- 若未来增加浏览器端动态 API，再单独配置 CORS、CSRF 和认证；不能因为拆分而默认开放所有来源。

## 5. 独立运行约定

### 5.1 Frontend

从 `frontend/` 目录运行：

```powershell
pnpm install --frozen-lockfile
Copy-Item .env.example .env
pnpm dev
```

`CONTENT_API_URL` 必须指向一个可访问的后端 API 前缀，例如：

```text
CONTENT_API_URL=http://127.0.0.1:8000/api/publication/v1/
CONTENT_MEDIA_ORIGIN=http://127.0.0.1:8000
```

前端的 README 必须说明：

- Node.js 和 pnpm 版本要求。
- `pnpm dev`、`pnpm check`、`pnpm test`、`pnpm test:e2e`、`pnpm build` 和 `pnpm preview`。
- 构建时需要 API 可访问；后端可以是本机进程或远程部署服务。
- `CONTENT_MEDIA_ORIGIN` 必须是读者可访问的媒体源，生产环境不能使用只在构建网络内可解析的主机名。
- 前端只生成静态站点，不负责数据库迁移、Admin 或媒体持久化。

### 5.2 Backend

从 `backend/` 目录运行：

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py check
python manage.py test
python manage.py runserver 127.0.0.1:8000
```

后端的 README 必须说明：

- Python、PostgreSQL 和依赖安装要求。
- `DATABASE_URL`、密钥、允许主机、CSRF 来源、静态文件和媒体目录配置。
- `DJANGO_PUBLIC_ORIGIN`、生产静态文件服务和媒体存储/代理配置。
- `migrate`、`import_publication --apply`、`createsuperuser`、`check`、`test` 和服务启动命令。
- Admin、API、健康检查和媒体 URL 的地址。
- 生产环境必须使用 PostgreSQL，并为 `MEDIA_ROOT` 配置持久化存储。

后端配置不得再从仓库根目录查找 `.env`，也不得假设前端目录存在。

## 6. 独立 Docker 部署约定

### 6.1 前端镜像

`frontend/Dockerfile` 使用多阶段构建：

1. Node 构建阶段只复制 `frontend/` 的 package manifest 和源码。
2. 构建阶段通过 `CONTENT_API_URL` 访问远程后端 API，并运行 `pnpm build`。
3. Nginx 或同类静态服务器阶段只复制 `dist/`，暴露静态站点端口。

独立构建命令为：

```powershell
docker build --build-arg CONTENT_API_URL=https://api.example.com/api/publication/v1/ --build-arg CONTENT_MEDIA_ORIGIN=https://api.example.com -f frontend/Dockerfile -t web-blog-frontend ./frontend
```

Dockerfile 必须声明 `ARG CONTENT_API_URL` 和 `ARG CONTENT_MEDIA_ORIGIN`，并在 Node 构建阶段将它们映射为 `ENV CONTENT_API_URL=$CONTENT_API_URL CONTENT_MEDIA_ORIGIN=$CONTENT_MEDIA_ORIGIN`，这样 `pnpm build` 才能通过 `process.env` 读取值。Docker build 不会自动读取构建机的 `.env`。构建镜像不能依赖仓库根目录的 `node_modules`、根目录 `.env` 或后端源码。

### 6.2 后端镜像

`backend/Dockerfile` 使用 Python 运行时：

1. 只复制 `backend/` 的 requirements、Django 源码、migration、fixture 以及 `content/source/posts/` 和 `content/source/media/`。这样后端容器可以独立执行初始导入；若部署平台使用外部 release bundle，必须提供同一份 source bundle，不能重新依赖前端目录。
2. 启动前执行静态文件收集和数据库迁移由部署平台或显式 release command 负责；容器启动命令只启动 WSGI/ASGI 服务。
3. 使用 Gunicorn 或等价生产服务器监听 `0.0.0.0`，并保留健康检查路径。
4. 数据库通过 `DATABASE_URL` 注入，媒体目录挂载持久卷或对象存储；静态文件由 WhiteNoise 或平台反向代理提供，媒体文件由持久化存储对应的公开 URL 提供。不能依赖 `DEBUG` 下的 Django `static()` 路由。

独立构建命令为：

```powershell
docker build -f backend/Dockerfile -t web-blog-backend ./backend
```

后端镜像不能复制前端源码、安装 Node/pnpm 或依赖根目录 lockfile。

### 6.3 可选的仓库级编排

如果保留根目录 `compose.yaml`，它只能是本地联调便利入口，必须声明 `frontend`、`backend` 和数据库的服务关系，并通过环境变量连接两个应用。它不能成为任一应用单独启动或部署的前置条件。生产部署以两个独立镜像和各自的 README 为准。

## 7. 分阶段迁移步骤

### 阶段 0：冻结契约

- 记录当前 API fixture、公开页面路由、构建命令和测试基线。
- 确认前端仍采用“构建期读取 API、运行时提供静态文件”的模式。
- 将 `CONTENT_API_URL`、媒体 URL、健康检查和 404/5xx 行为写入双方 README。

### 阶段 1：建立 `frontend/`

- 创建 `frontend/` 并迁移所有 Astro 源码、静态资源、配置、依赖、前端脚本和前端测试。
- 删除脚本中对 `backend/manage.py`、根目录 `.env` 和根目录 `node_modules` 的路径假设。
- 在 `frontend/` 内验证 `pnpm install --frozen-lockfile`、`pnpm check`、`pnpm test`、`pnpm build`。
- 让 `pnpm dev` 只启动 Astro，并通过 `CONTENT_API_URL` 连接已运行的后端。

### 阶段 2：使 `backend/` 自包含

- 迁移后端 Python 测试、API 契约测试和导入报告。
- 把 `src/content/posts/` 及其图片迁移到 `backend/content/source/posts/`，同步更新导入命令的默认 `--source` 为 `content/source/posts/`（内部解析为 `BASE_DIR / "content" / "source" / "posts"`）、测试中的 source fixture、`publication.json` 的 source 元数据和导入报告。
- 将源文件引用的 `src/assets/images/` 复制到 `backend/content/source/media/`，同步更新相对引用和导入测试；前端展示资源仍留在 `frontend/src/assets/`。
- 将内容校验、fixture 生成和新文章脚手架从根目录脚本改为后端拥有的命令或工具；前端构建只消费 API 返回的内容快照。
- 修改 Django 设置，使环境变量、静态目录和媒体目录均相对于 `backend/` 或部署环境解析。
- 更新序列化器和 Markdown 媒体解析，使用 `DJANGO_PUBLIC_ORIGIN` 与 `CONTENT_MEDIA_ORIGIN`，并验证构建产物中没有内网 API 主机名。
- 为生产静态资源选择并记录 WhiteNoise 或平台反向代理方案；媒体使用持久化存储和公开媒体源。
- 更新后端 README 和命令，使所有命令可以在 `backend/` 目录直接执行。
- 添加后端 Dockerfile 和生产启动命令，确认容器不包含本地数据库文件。

### 阶段 3：完成独立部署

- 添加两个项目各自的 `.dockerignore`，排除依赖、构建产物、缓存、测试报告和密钥。
- 分别构建两个镜像，并在测试环境中验证：前端构建使用远程 API；后端在没有前端目录时仍能迁移、健康检查和提供 API。
- 验证媒体 URL、Admin、健康检查、API 404/503 和前端静态资源。

### 阶段 4：清理根目录

- 删除或迁移根目录的应用级 `package.json`、Astro 配置、脚本、Dockerfile、Compose 绑定路径和根 `.env.example`。
- 根 README 改为仓库导航，只说明两个子项目的职责、链接和联调方式。
- 更新 CI、编辑器任务和部署文档，使工作目录明确为 `frontend/` 或 `backend/`。
- 在 `backend/.gitignore` 中加入 `db.sqlite3`、`*.sqlite3`、`media/` 和 `staticfiles/`，删除当前未跟踪的 `backend/db.sqlite3`，清理本地生成目录，不把构建产物带入提交。

### 7.1 可执行迁移清单

下面的步骤按依赖顺序执行。每一步完成后先运行该步骤的检查，再进入下一步；迁移期间保留一个可回滚分支。步骤 2 至步骤 7 可以保留临时根目录兼容入口，但不要在步骤 8 前删除或清理它们。

#### 步骤 1：建立基线和回滚点（已完成）

**修改范围：** 只读检查，不改代码。

1. 记录当前分支、工作区状态和最近一次可用提交。
2. 启动 PostgreSQL 和 Django API，保存 http://127.0.0.1:8000/api/publication/v1/health/、http://127.0.0.1:8000/api/publication/v1/articles/、http://127.0.0.1:8000/api/publication/v1/taxonomy/ 的响应，以及 pnpm check、pnpm test 和 pnpm build 的结果。
3. 保存现有 backend/content/fixtures/publication.json、publication_api.json 和 backend/content/import-report.json，作为迁移后的对比基线。

**检查：** 基线 API fixture 没有未解释的差异；迁移前的页面路由和文章数量已记录。

**执行记录（2026-10-12）：** 基线提交为 `28f5374e68b5d91023f54d2bf512389269f2961f`。`pnpm check`、`pnpm test`（6 个文件、46 个测试）和 `pnpm build` 均通过；API 健康状态为 `ok`，文章 20 篇，频道 3 个，专题 11 个。API 响应摘要保存在 `.scratch/frontend-backend-separation-baseline-2026-10-12.json`。

#### 步骤 2：创建前端目录并移动 Astro 文件（已完成）

**移动到 frontend/：**

- src/ 中除 src/content/posts/ 外的 Astro 源码（包括 src/content/pages/）、public/、tests/（排除 tests/unit/articleScaffold.test.ts）。
- test/articleSource.test.ts、test/remoteMarkdown.test.ts 等前端测试；tests/unit/articleScaffold.test.ts 随内容脚手架迁移到后端。
- package.json、pnpm-lock.yaml、pnpm-workspace.yaml。
- astro.config.ts、astro-paper.config.ts、tsconfig.json、vitest.config.ts、playwright.config.ts。
- eslint.config.js、.prettierrc、.prettierignore 和前端专用脚本。

src/content/posts/ 在步骤 2 保留于仓库根目录的迁移暂存位置，不放入 frontend/；步骤 3 完成后再删除这个暂存目录。这样后端导入源不会在前端迁移尚未完成时丢失。

可以从仓库根目录使用 git mv，但要保持文件历史；不要把 test/backend/ 或 tests/unit/articleScaffold.test.ts 一起移动到前端。根 package.json、lockfile 和应用配置可以先复制到 frontend/，根目录暂时保留兼容 shim；若直接 git mv，必须立即补上能转发到 frontend/ 的临时根入口，步骤 8 再删除。

**同步修改：**

1. 将 frontend/package.json 的脚本全部改为以 frontend/ 为工作目录解析路径。
2. 将 frontend/tsconfig.json 的别名、Playwright 的 testDir 和 web server 命令改为前端内部路径。
3. 把 .env.example 复制为 frontend/.env.example，删除其中的 Django 启动参数，只保留 CONTENT_API_URL、CONTENT_MEDIA_ORIGIN、站点 URL 和前端端口。

**检查：** 在 frontend/ 执行 pnpm install --frozen-lockfile、pnpm exec astro check 和前端单元测试。完整 pnpm check 暂时等到步骤 4 移走内容校验脚本后再运行，避免过渡期继续读取已迁移的文章源目录。

**执行记录（2026-10-12）：** 已创建 `frontend/`，建立 Astro 源码、静态资源、前端测试和 Astro 专用脚本的独立副本；同时保留根目录兼容副本，直到步骤 8 再清理。`src/content/posts/`、后端测试和内容迁移脚本仍作为根目录暂存。前端 `package.json` 已移除 Django、文章脚手架、fixture 和内容校验等后端命令，`dev` 只启动 Astro；API 健康检查失败时提示单独启动后端。`pnpm install --frozen-lockfile` 成功；`pnpm check` 通过（Astro check 0 errors、0 warnings、0 hints，ESLint 和 Prettier 均通过）；`pnpm exec astro check` 通过（0 errors、0 warnings、0 hints）；前端单元测试通过（5 个文件、37 个测试）。构建生成的 `public/pagefind/` 已加入前端格式检查忽略规则。

#### 步骤 3：迁移后端内容源和测试

1. 创建 backend/content/source/posts/ 和 backend/content/source/media/。
2. 从仓库根目录暂存的 src/content/posts/ 复制 Markdown/MDX 和它们引用的导入图片到后端源目录；仍由页面组件使用的频道封面等展示资源保留在 frontend/src/assets/。
3. 更新 Markdown 中的相对图片引用，使它们只指向 backend/content/source/ 内的文件；确认 frontend/src/content/pages/ 等真正的前端静态内容仍留在前端。
4. 将 test/backend/ 移入 backend/tests/ 或对应 Django app；把 test/backend/read_publication_api.mjs 改写成 Python/Django API 契约测试。
5. 将仓库根目录暂存的 scripts/check-content.ts、scripts/generate-publication-fixture.mjs、scripts/new-article.mjs 及 tests/unit/articleScaffold.test.ts 的能力和测试迁移为 Django management command 或后端工具；publication.json 和 publication_api.json 继续作为校验快照，不作为数据库种子。
6. 更新 backend/.env.example，补齐数据库、公开源地址、媒体目录和生产静态文件配置。

**检查：** 从 backend/ 执行 python manage.py import_publication --source content/source/posts，确认 dry-run 的文章数量、关系和错误列表与步骤 1 基线一致；此时不执行 --apply，避免在 Django 环境变量和媒体路径尚未隔离前写入数据。

**执行记录（2026-10-12）：** 已创建 `backend/content/source/posts/` 和 `backend/content/source/media/`，迁移 21 篇文章源、导入图片和后端测试；导入命令默认从 `backend/content/source/posts/` 读取，并保留 `check_content`、`new_article`、`generate_publication_fixture` 管理命令。`publication.json` 和 `import-report.json` 的 source 元数据已更新为 `content/source/posts`。从 `backend/` 执行 dry-run 得到 21 个文件、21 个计划更新、0 个错误；Django check 和默认 `python manage.py test` 的 32 个后端测试通过。原根目录后端测试已移入 `backend/tests/`。

#### 步骤 4：让前端只通过 HTTP API 获取内容

1. 从 frontend/scripts/ 中移除 backend/manage.py、根目录 .env、根目录 node_modules 和组合启动逻辑。
2. 将 frontend/scripts/dev.mjs 改成只启动 Astro，或删除它并直接使用 astro dev。
3. 保留 frontend/scripts/check-content-api.mjs，让它只检查 CONTENT_API_URL/health/。
4. 在 frontend/src/data/djangoArticleSource.ts 中增加 CONTENT_MEDIA_ORIGIN 配置：API 请求使用 CONTENT_API_URL，Markdown 和页面图片使用公开媒体源。
5. 删除前端对文章 posts、内容校验脚本和 new-article.mjs 的导入；前端只消费 API 返回的内容快照。

**检查：** 后端运行在独立地址时，进入 frontend/ 执行 pnpm build 能生成 dist/；停止后端后再次构建，命令在健康检查阶段失败并显示 API 地址。此时再运行 frontend/ 的完整 pnpm check。

**执行记录（2026-10-12）：** `frontend/scripts/dev.mjs` 已移除，前端开发命令只运行 Astro；`check-content-api.mjs` 只检查 `CONTENT_API_URL/health/`。`DjangoArticleSource` 已将 API 地址和 `CONTENT_MEDIA_ORIGIN` 分开配置，远程 Markdown 的 `/media/` 链接使用公开媒体源。后端 API 独立运行时，`frontend/` 的 `pnpm build` 成功生成 70 个页面和 Pagefind 索引；后端 Python API 契约测试读取 20 篇文章、11 个专题并通过。前端 `pnpm check` 和 37 个单元测试通过。

#### 步骤 5：隔离 Django 配置和公开地址

1. 修改 backend/config/settings.py，从 backend/.env 或部署环境变量读取配置，不再读取仓库根目录 .env。
2. 将导入命令默认路径解析为 BASE_DIR / "content" / "source" / "posts"，同时支持从 backend/ 传入 content/source/posts。
3. 增加 DJANGO_PUBLIC_ORIGIN，让序列化器生成的 hero/OG URL 不受内部反向代理 Host 影响。
4. 配置 DJANGO_ALLOWED_HOSTS、CSRF trusted origins、STATIC_ROOT、MEDIA_ROOT 和公开媒体 URL。
5. 为生产静态文件选定 WhiteNoise 或反向代理；为媒体选定持久卷或对象存储，并验证 DEBUG=0 时 Admin 静态资源和文章媒体仍可访问。

**检查：** 从 backend/ 执行 python manage.py check、python manage.py migrate、python manage.py import_publication --source content/source/posts --apply 和 python manage.py test；用测试域名请求 API，响应中的绝对媒体 URL 使用公开源地址，媒体文件没有写入 backend/backend/media/。

**执行记录（2026-10-12）：** Django 设置已只读取 `backend/.env` 或部署环境变量；相对的 `STATIC_ROOT`、`MEDIA_ROOT` 会解析到 `backend/` 下，支持绝对路径覆盖。已加入 `DJANGO_PUBLIC_ORIGIN`、`DJANGO_CSRF_TRUSTED_ORIGINS`、`DJANGO_MEDIA_URL` 和 PostgreSQL SSL 开关；序列化器在配置公开源时生成公开 hero/OG URL。生产静态文件采用 WhiteNoise，媒体由持久卷和 Nginx 配置提供。`DEBUG=0` 下 API 公开源、Admin 静态 CSS 和媒体路径验证通过。`check`、`migrate`、`import_publication --apply`、`collectstatic` 和 34 个测试均通过。

#### 步骤 6：分别添加 Dockerfile

**Frontend：**

1. 在 frontend/Dockerfile 中声明 ARG CONTENT_API_URL 和 ARG CONTENT_MEDIA_ORIGIN。
2. 在构建阶段将 ARG 映射成 ENV，再执行 pnpm build。
3. 运行时镜像只复制 dist/，不复制后端源码或 .env。

**Backend：**

1. 在 backend/Dockerfile 中复制 requirements、Django 源码、migration、fixture、content/source/posts/ 和 content/source/media/。
2. 生产启动只负责启动 Gunicorn/ASGI；迁移和 collectstatic 由 release command 执行。
3. 数据库、密钥、公开源地址和媒体存储全部通过环境变量或挂载注入。

**检查：** 分别运行：

~~~powershell
docker build --build-arg CONTENT_API_URL=https://api.example.com/api/publication/v1/ --build-arg CONTENT_MEDIA_ORIGIN=https://api.example.com -f frontend/Dockerfile -t web-blog-frontend ./frontend
docker build -f backend/Dockerfile -t web-blog-backend ./backend
~~~

两个构建上下文都不能访问仓库根目录文件；前端镜像构建日志必须显示它使用了显式 API 地址。

**执行记录（2026-10-12）：** 已新增 `frontend/Dockerfile`、`frontend/.dockerignore`、`backend/Dockerfile`、`backend/.dockerignore`，以及后端生产部署说明和 Nginx 媒体代理配置。前端 Dockerfile 显式声明并校验两个 API/媒体构建参数，并安装 Mermaid 构建所需的 Chromium；后端镜像使用 Gunicorn，迁移和静态文件收集由 release command 执行。当前主机 Docker Desktop daemon 未能启动，两个镜像构建命令尚未在本机完成；Dockerfile 和构建上下文已完成静态核对。

#### 步骤 7：重写两个 README 和本地联调入口

1. frontend/README.md 只描述 Node/pnpm、Astro 命令、API 地址、媒体地址和前端 Docker 构建。
2. backend/README.md 只描述 Python/PostgreSQL、Django 命令、导入源、Admin/API、媒体持久化和后端 Docker 构建。
3. 根 README.md 改成导航页，说明两个项目的关系和联调顺序，不再复制应用级安装说明。
4. 若保留根 compose.yaml，只用于本地联调，并明确它不是任一项目的运行前置条件。

**检查：** 分别在只包含 frontend/ 和只包含 backend/ 的临时目录中执行 README 的安装和启动命令；两个目录均不需要读取另一个目录的源码。

**执行记录（2026-10-12）：** 已新增独立的 `frontend/README.md` 和 `backend/README.md`，分别说明所属运行命令、环境变量、API/媒体地址、测试和 Docker 部署。根 README 已改为仓库导航页；根目录 Compose 和兼容脚本已移除，不再作为项目运行入口。

#### 步骤 8：清理根目录并执行最终验收

1. 删除根目录应用级 package.json、Astro 配置、前端脚本、根 Dockerfile 和根 .env.example。
2. 更新 CI、编辑器任务、Compose 挂载路径和部署平台工作目录。
3. 更新 backend/.gitignore，至少包含 db.sqlite3、*.sqlite3、media/、staticfiles/ 和 Python 缓存；删除当前未跟踪的 backend/db.sqlite3。
4. 确认根目录只保留 frontend/、backend/、docs/ 以及仓库级 README、许可证、Git/CI 配置等杂项。
5. 按第 8 节逐项勾选验收标准，并保存前后端独立构建、测试和健康检查结果。

**检查：** git status --short 中不出现构建产物、SQLite 数据库、密钥或根目录应用文件；前端和后端镜像都能从各自目录重新构建。

**执行记录（2026-10-12）：** 已删除根目录应用级 package、Astro 配置、前端源码、脚本、Dockerfile、Compose 和根环境文件；删除未跟踪的 `backend/db.sqlite3`。根目录保留 `frontend/`、`backend/`、`docs/`、README、LICENSE、Git/CI 和其他仓库级杂项。Docker daemon 当前不可用，镜像重建仍需在 Docker daemon 可用的环境补做。

## 8. 验收标准

目录和文档完成后，以下检查必须全部通过：

- [x] `frontend/` 和 `backend/` 各自有 README、环境变量样例和 Dockerfile。
- [x] 从 `frontend/` 执行安装、类型检查、单元测试和构建时，不需要读取后端源码；构建同时需要可访问的 `CONTENT_API_URL` 和读者可访问的 `CONTENT_MEDIA_ORIGIN`。
- [x] 从 `backend/` 执行安装、迁移、Django check、Python API 契约测试和开发服务器启动时，不需要 Node、pnpm 或前端目录。
- [ ] 使用显式 `CONTENT_API_URL` 和 `CONTENT_MEDIA_ORIGIN` 构建前端镜像：`docker build --build-arg CONTENT_API_URL=... --build-arg CONTENT_MEDIA_ORIGIN=... -f frontend/Dockerfile ./frontend` 成功（Docker daemon 不可用，待补验）。
- [ ] `docker build -f backend/Dockerfile ./backend` 成功（Docker daemon 不可用，待补验）。
- [x] 前端构建在后端不可用时以明确的健康检查错误退出，不生成缺少内容的站点。
- [x] API 响应字段、文章发布过滤、媒体绝对 URL 和 404/503 行为与迁移前一致。
- [x] 生产 API 的 Admin 静态资源和文章媒体都能通过公开 URL 访问；`DEBUG=0` 时不依赖 Django 开发静态路由。
- [x] 根目录没有应用源码、应用依赖、应用级 lockfile 或要求同时启动两个服务的隐式入口。
- [x] 根 README、CI、Compose 和部署说明都引用新的工作目录和命令。
- [x] 前端测试、后端测试和 API 契约测试分别在拥有者项目内可独立运行。

## 9. 风险与处理方式

| 风险 | 处理方式 |
| --- | --- |
| 相对路径改变导致 Astro、Playwright 或导入脚本失效 | 迁移每类配置后立即在所属目录运行对应命令；禁止用根目录路径兜底 |
| 前端构建拿不到远程 API | 构建前固定调用 `/health/`，错误信息包含完整 API 地址和启动提示 |
| 后端返回相对媒体 URL | 以绝对媒体 URL 作为 API 契约，并在前端构建测试中检查正文、hero 和 OG 图片 |
| 本地 SQLite 文件误入镜像或提交 | 后端设置继续强制 PostgreSQL；`.gitignore` 和 Docker ignore 同时排除 `db.sqlite3` |
| 共享脚本重新形成隐式耦合 | 脚本按拥有者放入 `frontend/scripts` 或 `backend/`；跨应用联调只通过 HTTP |
| 两个项目的版本漂移 | 各自 README 固定 Node/pnpm 或 Python 版本，并在 CI 中分别安装和验证 |
| 只移动目录但遗漏 CI 和部署配置 | 阶段 4 将 CI、Compose、编辑器任务和部署入口列为必查项 |

## 10. 完成定义

只有当两个子目录都能在脱离对方源码后完成安装、测试、启动和 Docker 构建，且根目录只承担仓库级协作和文档职责时，才认为前后端拆分完成。任何依赖“从根目录执行”“读取对方源码”或“先启动另一个项目的内部脚本”的方案都不满足本重构目标。
