# Astro + Django 内容后端改造方案

## 1. 结论

本项目继续使用 Astro 作为公开站点和界面层，使用原生 Django 作为内容后端、管理后台和后续动态能力的承载层。

不引入 DjangoBlog。DjangoBlog 是一个完整的博客产品，包含自己的模板、数据模型、插件和部署约束；本项目已经有明确的信息架构、路由、视觉系统和文章阅读体验，直接套用会让内容模型和界面都围绕第三方产品重新适配。

目标架构如下：

```text
                    build-time fetch
Astro 页面与组件  <---------------------  Django 公共只读 API
       │                                      │
       │                                      ├── Django Admin
       │                                      ├── Article / Topic / Tag / Series
       │                                      ├── 发布规则与内容校验
       │                                      └── 数据库与媒体文件
       │
       └── 静态 HTML、CSS、JS、图片和 Pagefind
```

公开文章默认仍由 Astro 在构建期生成静态页面。Django 不参与每次公开页面请求，后续只有评论、登录、浏览量等确实需要实时状态的功能才通过 API 或 SSR 接入。

## 2. 改造目标

- 保留现有视觉风格、页面结构、路由和阅读交互。
- 让 Django 成为文章、专题、标签、系列和修订记录的唯一内容源。
- 让作者可以通过 Django Admin 创建、编辑和发布文章。
- 让 Astro 构建时从 Django API 获取已发布内容。
- 保留现有 SEO、Pagefind、无 JavaScript 基础能力和站点健康门禁。
- 为后续评论、登录和浏览量提供独立的动态 API 边界。

## 3. 明确不做的事情

- 不迁移到 DjangoBlog 的模板、插件系统或数据模型。
- 不为 `/posts/` 或旧 API 保留兼容路由；项目尚未上线，不需要兼容历史客户端。
- 不把当前页面改写成 Django Template。
- 不在第一阶段引入评论、账户、点赞、浏览量或复杂权限。
- 不因为引入 Django 就把公开页面改成全量 SSR。
- 不把站点视觉重新设计成 Django 管理后台的风格。

## 4. 当前基线

当前 Astro 项目的关键边界如下：

| 区域 | 当前职责 | 改造后的职责 |
| --- | --- | --- |
| `src/content.config.ts` | Markdown/MDX 内容字段校验 | 迁移期作为字段契约参考，最终由 Django 模型和校验承担 |
| `src/utils/content.ts` | 发布、排序、频道、专题、系列和相关推荐查询 | 保留纯查询接口，输入改为 Django API DTO |
| `src/pages/**/*.astro` | 静态生成公开路由 | 路由和页面组合方式保持不变 |
| `src/components`、`src/styles` | 视觉和交互实现 | 保持现有组件、CSS 类名和设计令牌 |
| Pagefind | 构建期全文搜索 | 继续索引 Astro 生成的 `/articles/` 页面 |
| `tests/e2e` | 用户路径和视觉行为回归 | 继续作为改造期间的主要 UI 验收门禁 |

当前内容字段必须先固化为 API 契约，尤其是 `channel`、`topics`、`tags`、`kind`、`status`、`featuredRank`、`series`、`related`、`heroImage`、`ogImage`、`draft` 和 `revisions`。

## 5. 目标技术栈

### Django 后端

- Python 3.12+
- Django 5.2 LTS
- Django REST Framework，用于只读 API 和后续动态 API
- 本地开发和部署统一使用 PostgreSQL，通过 `DATABASE_URL` 配置连接
- Django Admin 作为第一版内容编辑界面
- `ImageField` 或对象存储适配层管理文章图片

### Astro 前端

- 保留当前 Astro 7、TypeScript、Tailwind、Shiki、Mermaid、PhotoSwipe 和 Pagefind
- 继续使用现有页面路由和组件
- 通过 `CONTENT_API_URL` 指定 Django API 地址
- 构建期使用 Node `fetch` 获取内容，不让浏览器在首屏依赖 Django API

## 6. Django 数据模型

模型名称使用项目自己的领域语言，不复制 DjangoBlog 的模型命名。

### `Channel`

- `slug`：`technology`、`life`、`investment`
- `name`
- `description`
- `accent`
- `is_active`

`slug` 是稳定标识，显示名称不参与路由判断。第一阶段可以用数据迁移预置三个频道，避免 Admin 用户随意创建不受前端支持的频道。

### `Topic`

- `slug`
- `name`
- `description`
- `channel`：外键到 `Channel`
- `is_active`

`Topic.slug` 全局唯一。文章只能选择与自身频道一致的专题；文章的主专题单独记录，不能依赖普通多对多关系的查询顺序。

### `Tag`

- `slug`
- `name`

文章与标签使用多对多关系。编程语言、数据库和更窄的技术概念继续作为标签，而不是频道或专题。

### `Series`

- `slug`
- `title`
- `description`

系列顺序放在独立的 `SeriesArticle` 关联记录中，而不是放在文章正文或 `Article.series` 外键里。数据库约束保证同一系列的 `order` 唯一且为正整数，service 校验保证每个系列从 1 开始连续递增。

### `SeriesArticle`

- `series`
- `article`
- `order`

`(series, article)` 和 `(series, order)` 均唯一，且 `article` 本身唯一。`Article` 通过这个关联模型加入至多一个系列；API 再将关联记录序列化为当前前端使用的 `{ id, order }` 对象。

### `Article`

建议字段如下：

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `slug` | `SlugField` | 在频道内唯一，用于 `/articles/[channel]/[slug]/` |
| `title` | `CharField` | 文章标题 |
| `description` | `CharField` | 20 到 180 个字符 |
| `body_markdown` | `TextField` | 原始 Markdown/MDX 内容；第一阶段先禁用任意可执行 MDX |
| `channel` | 外键 | 文章所属频道 |
| `topics` | 多对多 | 至少一个专题 |
| `primary_topic` | 外键 | 文章页上下文使用的主专题，必须属于 `topics` |
| `tags` | 多对多 | 跨频道发现标签 |
| `kind` | 选择字段 | `article` 或 `case-study` |
| `status` | 选择字段 | `complete`、`evolving` 或 `archived` |
| `featured_rank` | 可空整数 | 首页频道推荐顺序，范围 1 到 99 |
| `series_membership` | 可空关联 | 通过 `SeriesArticle` 保存系列和文章序号 |
| `related` | `ArticleRelated` 关联 | 最多 3 篇有序延伸阅读，禁止关联自身 |
| `hero_image` | 可空图片 | 文章头图 |
| `hero_alt` | 可空字符串 | 有头图时必填 |
| `og_image` | 可空图片 | 文章分享图 |
| `canonical_url` | 可空 URL | 自定义规范 URL |
| `is_draft` | 布尔值 | 草稿状态 |
| `pub_datetime` | 日期时间 | 发布时间 |
| `mod_datetime` | 可空日期时间 | 最后修改时间 |

### `Revision`

- `article`
- `date`
- `summary`

修订记录使用独立模型，Admin 可以单独编辑，API 再序列化为当前前端使用的数组。

### `ArticleRelated`

- `article`
- `related_article`
- `position`

`(article, related_article)` 和 `(article, position)` 均唯一，`position` 只允许 1 到 3。API 按 `position` 升序返回 `related`，保持作者在 Admin 中设定的延伸阅读顺序。

### 数据库级约束

- `(channel, slug)` 唯一。
- `featured_rank` 在 1 到 99 之间或为空。
- 系列序号为正整数，`(series, order)` 唯一；每个 `article` 最多有一条 `SeriesArticle` 记录。
- 文章必须属于至少一个专题，且 `primary_topic` 必须属于这些专题。
- `hero_image` 存在时 `hero_alt` 非空。
- 文章不能关联自身。
- 文章专题的频道必须等于文章频道。
- 同一系列的文章序号必须从 1 开始连续递增，不允许重复或断档。

涉及跨行或多对多关系的校验放在 Django service 和 Admin 表单中；数据库约束负责兜底，不能只依赖页面提示。

## 7. API 契约

第一阶段只提供公开只读接口。公开接口只返回已发布文章，不返回草稿、未来文章或管理字段。后端数据库字段使用 `is_draft`，公开 DTO 统一使用与当前 Astro 内容契约一致的 `draft`；公开文章的值固定为 `false`。

### 基础地址

```text
/api/publication/v1/
```

### 文章 DTO

```json
{
  "id": "technology/event-loop-notes",
  "slug": "event-loop-notes",
  "title": "事件循环中的延迟从哪里来",
  "description": "文章摘要",
  "bodyMarkdown": "## 问题\n\n正文内容。",
  "pubDatetime": "2026-09-08T00:00:00Z",
  "modDatetime": "2026-09-09T01:30:00Z",
  "channel": "technology",
  "topics": ["concurrency-engineering"],
  "primaryTopic": "concurrency-engineering",
  "tags": ["TypeScript", "performance"],
  "kind": "article",
  "status": "complete",
  "draft": false,
  "featuredRank": null,
  "series": { "id": "event-loop-diagnostics", "order": 2 },
  "related": ["life/reading-with-questions"],
  "heroImage": { "url": "http://127.0.0.1:8000/media/articles/event-loop-notes/hero.webp", "alt": "技术频道头图", "width": 1600, "height": 900 },
  "ogImage": "http://127.0.0.1:8000/media/articles/event-loop-notes/og.webp",
  "canonicalURL": null,
  "revisions": []
}
```

### 端点

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| `GET` | `/articles/` | 获取全部已发布文章，用于 Astro 构建期生成目录、搜索和聚合页面 |
| `GET` | `/articles/{channel}/{slug}/` | 获取一篇已发布文章 |
| `GET` | `/taxonomy/` | 获取频道和专题显示信息 |
| `GET` | `/health/` | 后端健康检查，不包含业务数据 |

第一版不分页 `/articles/`，因为 Astro 构建需要完整内容集合。文章量明显增长后再增加分页或按构建批次拉取，但必须先保持构建结果稳定。

### 发布规则

Django 提供一个共享的 `PublishedArticleQuery`：

```text
is_draft = false
AND pub_datetime <= now()
ORDER BY (mod_datetime OR pub_datetime) DESC
```

首页推荐排序仍由前端领域查询适配器处理：同频道内先按 `featuredRank` 升序，未设置推荐顺序的文章再按更新时间倒序。若后续希望把首页编排完全交给后端，再增加专门的 `/home/` DTO，不在普通文章接口中混入首页布局字段。

### 构建触发规则

Django Admin 的保存或发布不会自动改变已经生成的 Astro HTML。第一阶段采用明确的构建触发流程：

1. Admin 保存文章后，作者运行 `pnpm build`；构建从 Django API 读取最新已发布内容。
2. `draft`、撤回或修改发布时间后，必须重新运行 `pnpm build` 才会更新公开页面、RSS、站点地图和 Pagefind。
3. `pubDatetime` 到达后不会自动发布；需要在发布时间之后再次运行构建。未来若接入 CI 或计划任务，只增加构建触发，不改变发布规则。
4. Astro 构建前请求 `/health/` 和文章 API；API 不可用时构建失败，不生成半更新的公开产物。

## 8. Astro 接入方式

### 内容源抽象

新增一个很窄的内容源接口，例如：

```ts
interface ArticleSource {
  getPublishedArticles(): Promise<RemoteArticle[]>;
  getArticle(id: string): Promise<RemoteArticle | null>;
  getTaxonomy(): Promise<TaxonomySnapshot>;
}
```

迁移期可以有 `DjangoArticleSource` 和一次性导入脚本使用的本地读取器，但公开构建完成切换后只保留 Django 数据源。这个接口是迁移边界，不是长期双写或兼容层。

### 页面改造

1. 将各页面中的 `getCollection("posts")` 替换为统一的 `getArticleSource()`。
2. 将 Django DTO 映射为新的 `RemoteArticle` 视图模型；不把远程 DTO 伪装成 Astro Content Collection Entry。
3. 保留 `src/utils/content.ts` 的频道、专题、系列和延伸阅读查询接口，改为接收远程 DTO。
4. 文章页继续使用当前 `ArticleLayout.astro`、`ArticleHeader.astro`、`ContextRail` 和移动阅读栏。
5. `getStaticPaths()` 在构建期请求 Django 的已发布文章集合，继续生成当前 `/articles/` 路由。
6. Pagefind 继续对 Astro 生成的 HTML 建索引，搜索行为不改。

### Markdown 渲染策略

这是迁移中风险最高的部分，必须单独验收。

- Django 保存 `body_markdown`，不在第一阶段保存最终 HTML。
- Astro 在构建期使用与当前配置等价的 unified/remark/rehype 管线，将 API 返回的 Markdown 编译为页面内容。
- 新增 `renderRemoteMarkdown()`，返回文章正文组件和 headings；文章页不再调用只能处理本地 Content Collection Entry 的 `render(article)`。
- 先迁移普通 Markdown、代码块、表格、脚注，再迁移 Mermaid、callout、图片说明和 PhotoSwipe。
- 不执行任意 MDX。需要交互组件时，必须先定义允许的组件白名单和输入来源。
- 文章中的图片路径改为 API 返回的绝对媒体 URL，并增加统一的 `media` URL 解析器。文章正文和头图使用带尺寸与替代文本的远程图片渲染；站点封面仍使用 Astro `Image`。
- 站点封面和频道图片仍保留在 Astro `src/assets`，不迁移到 Django 媒体库。

如果远程 Markdown 无法在 Astro 构建期达到现有渲染效果，暂停切换内容源，先完成渲染原型；不要通过直接注入未清洗 HTML 来绕过差异。

## 9. Django Admin 设计

Admin 只服务单作者内容维护，界面不需要复刻公开站点风格。公开站点必须保持当前视觉风格，Admin 可以使用 Django 默认后台并通过字段分组降低填写错误。

文章编辑页按以下分组：

1. 基本信息：标题、摘要、频道、专题、标签。
2. 发布信息：草稿、发布时间、更新时间、状态、推荐顺序。
3. 正文：Markdown 编辑器。
4. 关系：系列、系列序号、延伸阅读。
5. 图片与 SEO：头图、替代文本、分享图、规范 URL。
6. 修订记录：可添加多条 `Revision`。

Admin 保存时执行和 `content:check` 等价的校验。发布按钮只允许通过校验的文章变为非草稿状态。

## 10. 分阶段改造步骤

### 阶段 0：冻结界面契约

交付物：

- 当前路由清单和 API 需要的字段清单。
- 当前首页、目录页、文章页的 Playwright 回归基线。
- 一份由现有 Markdown 内容生成的 JSON fixture，用于 Django API 合同测试。

验收：现有 `pnpm test`、`pnpm test:e2e`、`pnpm check` 和 `pnpm build` 通过。

### 阶段 1：创建 Django 项目和内容模型

交付物：

- `backend/` Django 项目。
- `content` Django app。
- 模型、迁移、预置频道和专题。
- `python manage.py check`、模型约束测试和 Admin smoke test。

验收：可以在 Admin 创建一篇草稿文章，错误的频道/专题、主专题、头图替代文本和系列序号会被拒绝。第一阶段不承诺公开草稿预览；预览能力另列为后续需求。

### 阶段 2：实现内容导入和 Admin 编辑

交付物：

- 一次性 Markdown/Frontmatter 导入命令。
- 文章、专题、标签、系列、关联文章和修订记录导入报告。
- 导入命令默认 dry-run，并且明确报告无法自动转换的 MDX 内容。

验收：现有示例文章全部进入 Django，数量、slug、频道、专题、系列和发布时间与 fixture 一致。阶段 4 的 Astro API 切换完成并通过全量验收前，旧 Markdown 文件保留为只读迁移参考；切换通过后再移除公开构建对它的依赖。

### 阶段 3：实现只读 API 和合同测试

交付物：

- `/api/publication/v1/` 端点。
- DTO serializer 和已发布查询服务。
- API 响应 JSON fixture。
- 草稿、未来文章、无效文章和未授权管理字段的测试。

验收：API 输出只包含公开文章，并能被独立 Node 脚本读取；相同输入产生稳定字段和排序。

### 阶段 4：让 Astro 在构建期读取 Django

交付物：

- `DjangoArticleSource`。
- DTO 到当前前端视图模型的映射。
- 所有页面去除直接 `getCollection("posts")` 的生产调用。
- 远程 Markdown 渲染器和图片 URL 处理。
- 绝对媒体 URL 和 Open Graph URL 的构建测试，确保生成页面不会把 Django 媒体解析到 Astro 不存在的相对路径。

验收：Astro 的所有公开路由、文章上下文、RSS、Pagefind 和 Open Graph 输出与迁移前一致；现有 E2E 全部通过。

### 阶段 5：切换默认开发流程

交付物：

- Django `runserver` 和 Astro `dev` 的并行启动说明。
- `.env.example` 中的 `CONTENT_API_URL`、Django 数据库和媒体目录配置。
- `pnpm dev` 或一个明确的并行启动脚本。
- 后端健康检查和 Astro 构建前 API 可用性检查。

建议的本地端口：

```text
Django API/Admin  http://127.0.0.1:8000/
Astro            http://127.0.0.1:4321/
```

当前 Astro 开发命令使用 `--host 0.0.0.0`，因此同一局域网可通过主机的实际 IPv4 地址访问，例如 `http://10.10.0.171:4321/`。需要局域网访问时，Windows 防火墙还必须允许对应端口的入站连接；只在本机开发时可以继续使用 `127.0.0.1`。

验收：API 不可用时构建直接失败并给出明确错误；API 可用时公开页面正常生成。发布、修改、撤回和到期定时文章都通过重新构建验证，生成的页面、RSS、站点地图和 Pagefind 与当前 API 状态一致。

### 阶段 6：按需求增加动态能力

按实际需求逐项增加，不预先建设：

1. 评论：独立 `comments` app、审核状态、限流和垃圾评论处理。
2. 登录：仅在确实需要作者或评论用户身份时增加认证。
3. 浏览量：异步写入，不阻塞文章页面；先明确隐私和统计口径。
4. SSR：只有页面必须读取实时状态时才把对应路由改为 SSR，其余页面继续静态生成。

动态功能不得把公开文章构建强耦合到登录、评论或统计服务。

## 11. 测试策略

### Django 测试

- 模型字段和数据库约束。
- `PublishedArticleQuery` 的草稿、未来发布时间和更新时间排序。
- API serializer 字段白名单。
- 草稿和管理字段不会出现在公开 API。
- Admin 表单可以阻止频道/专题错位、无头图替代文本和重复系列序号。
- 导入命令的 dry-run、防重复和错误报告。

### Astro 测试

- DTO 映射和内容查询单测。
- API 不可用时构建失败信息。
- 首页、目录、文章、SEO、搜索和无 JS E2E 继续使用现有用例。
- 站点健康检查继续检查 API 变更后的图片、站内链接和控制台错误。

### 合同测试

Django 和 Astro 共享一份版本化 JSON fixture，至少覆盖：

- 三个频道。
- 一个专题和多专题文章。
- 系列前后文章。
- 相关推荐。
- 草稿和未来文章。
- 头图、分享图和修订记录。

合同测试只验证字段名、类型和公开语义，不把数据库内部实现暴露给 Astro。

## 12. 风险与处理方式

| 风险 | 处理方式 |
| --- | --- |
| 远程 Markdown 渲染与当前 Astro 输出不一致 | 先做渲染原型和 HTML fixture，对比通过后再切换 |
| API 构建时不可用 | 构建前健康检查，失败时停止构建并打印 API 地址 |
| 图片 URL 和 Astro `Image` 处理方式不同 | 统一媒体 DTO；先使用稳定媒体 URL，再单独优化图片处理 |
| Django Admin 允许产生前端无法展示的数据 | Admin 表单、service 校验和数据库约束三层限制 |
| 数据库内容和 Git 内容同时存在 | 迁移完成后确定 Django 为唯一内容源，不长期双写 |
| 为了展示 Django 而提前增加动态功能 | 每个动态能力必须先有用户场景、数据模型和测试，再实现 |

## 13. 完成标准

改造完成需要同时满足：

1. 现有页面的路由、视觉风格、响应式行为和主要 E2E 结果保持一致。
2. Django Admin 可以完整维护文章、专题、标签、系列、关联文章和修订记录。
3. Astro 构建完全从 Django 公共 API 获取公开内容。
4. 草稿、未来文章、排序和关联校验只有一套后端规则。
5. Pagefind、RSS、canonical、Open Graph 和站点健康检查继续通过。
6. 不保留 DjangoBlog 的模型、模板、插件或兼容层。
7. 评论、登录、浏览量和 SSR 只有在对应需求出现后才进入后续任务。

## 14. 每阶段英文提交摘要格式

本项目不在本设计任务中创建提交。后续每个实现任务完成后，在交付说明中附上一个英文提交摘要，使用动词开头并描述结果，例如：

```text
Add Django content models and admin validation
```

```text
Connect Astro build to the Django publication API
```
