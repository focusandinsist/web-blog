# 个人博客本地 MVP 实现计划

> **面向执行者：** 实施时必须按任务顺序执行；每个任务使用测试驱动开发，完成一个任务后再进入下一个任务。本计划不包含 Git、远程部署和域名操作。

**目标：** 基于 AstroPaper 实现一个可在本地完整浏览的中文个人博客 MVP，同时满足“对外展示”和“自我记录复盘”两条使用路径。

**架构：** 使用 Astro 7 静态站点和 Content Collections 管理 Markdown/MDX 内容，以 AstroPaper 6.1 为博客基础。首页使用“沉浸式封面 + 三频道内容大厅”，文章页使用稳定正文列和主题上下文侧栏；所有内容查询集中在纯 TypeScript 模块中，页面只负责组合与渲染。

**技术栈：** Astro 7、TypeScript 6、Tailwind CSS 4、Markdown/MDX、Shiki、Pagefind、Vitest、Playwright。

**规格来源：** `.scratch/blog-architecture/map.md`、`.scratch/blog-architecture/issues/01-choose-astro-foundation.md`、`.scratch/blog-architecture/issues/02-define-information-architecture.md`、`.scratch/blog-architecture/issues/03-choose-home-visual-direction.md`、`.scratch/blog-architecture/issues/04-define-reading-experience.md`。

## 全局约束

- 不执行 Git 初始化、提交、分支、合并或推送；版本控制由项目所有者处理。
- 本阶段只要求本地开发、构建和预览，不配置 Cloudflare、Netlify、域名或远程 CI。
- UI 文案以中文为主，URL slug 使用英文小写和连字符。
- 首页必须同时提供探索路径和直接访问路径；封面不能成为强制点击的独立路由。
- 技术记录、生活记录、投资记录是三个频道；系统编程、并发工程、实时系统、数据系统、游戏技术是技术频道下的专题。
- Go、C、C++、Python、Linux、PostgreSQL 等属于标签，不作为一级频道。
- 正文页优先保证阅读和复盘，装饰性效果不得进入正文排版区域。
- 亮色、暗色和系统主题三种模式从第一版实现，不留到后续返工。
- 核心图片、字体和图标必须保存在项目内；页面不能依赖远程图片地址。
- 首版不实现评论、统计、账户、邮件订阅、PWA、离线缓存和远程部署。
- 实施时必须先写失败测试并确认失败原因，再编写对应生产代码。

---

## 一、实现范围

### 1. 首页展示路径

首页 `/` 包含两个连续区域：

1. 封面首屏：一张本地全幅图片、站点名称“系统工程笔记”、一句定位文案、向下入口和固定导航。
2. 内容大厅：三张不同尺寸的频道卡片，每张卡展示频道简介和 3 至 5 篇文章预览。

点击封面或继续向下滚动进入 `#content-lobby`。频道卡标题进入频道目录；卡片内部文章标题直接进入文章，不能让整张复合卡只有一个含糊的点击目标。

### 2. 直接检索路径

右上角导航固定为：

- 文章：`/articles/`
- 频道：`/channels/`
- 专题：`/topics/`
- 项目：`/projects/`
- 关于：`/about/`
- 搜索图标：`/search/`
- 主题图标：亮色、暗色、跟随系统

站点标识始终返回首页。移动端使用菜单图标展开同一组入口。

### 3. 内容目录

- `/articles/`：所有已发布文章，支持按频道和专题筛选。
- `/channels/`：三个频道的总览。
- `/channels/[channel]/`：频道介绍、专题入口和该频道文章。
- `/topics/`：全部专题索引。
- `/topics/[topic]/`：专题介绍、文章列表和系列入口。
- `/projects/`：匿名化项目复盘列表。

### 4. 文章阅读

桌面端正文与右侧上下文栏并列：正文是唯一主要阅读区域；右侧栏上半部分是本文目录，下半部分是同专题文章。移动端侧栏消失，滚动离开文章页头后出现紧凑阅读栏，点击目录图标打开“本文 / 专题”两个标签的抽屉。

文章支持代码高亮、文件名、复制、重点行、增删行、可选行号、图片说明、表格、Mermaid、脚注、参考资料、修订记录、系列进度、上一篇/下一篇和延伸阅读。

### 5. 主题与无障碍

- 初次访问跟随 `prefers-color-scheme`。
- 用户选择保存到 `localStorage`，在页面绘制前恢复，避免主题闪烁。
- 暗色不是简单反色，需要独立定义背景、正文、边框、代码、频道强调色。
- 所有交互可用键盘操作，焦点清晰，图片有替代文本。
- 动效遵守 `prefers-reduced-motion`；多个频道卡不能同时自动滚动。

## 二、验收标准

- `pnpm dev` 启动后可从首页进入三个频道、任一专题和任一示例文章。
- 封面与内容大厅位于同一页面；直接导航不要求用户经过封面。
- 首页至少展示三个频道，每个频道至少展示三篇真实结构的示例内容。
- 文章正文、本文目录、同专题文章和前后导航使用同一份 Content Collections 数据。
- 桌面宽度 1280px 时正文和右侧栏无重叠；390px 宽度时不出现横向页面滚动。
- 主题切换刷新后保持；清除本地选择后重新跟随系统主题。
- 页面禁用 JavaScript 后，文章正文、频道目录和基础导航仍可使用。
- `pnpm test`、`pnpm lint`、`pnpm astro check`、`pnpm build` 全部通过。
- Playwright 覆盖首页主路径、导航捷径、文章侧栏、移动端目录和主题持久化。
- 本地预览使用 `pnpm preview`，不需要任何远程服务或密钥。

## 三、目标文件结构

```text
web-blog/
├── astro.config.ts
├── astro-paper.config.ts
├── package.json
├── playwright.config.ts
├── vitest.config.ts
├── public/
│   └── fonts/
├── src/
│   ├── assets/images/
│   │   ├── home-cover.webp
│   │   ├── channel-technology.webp
│   │   ├── channel-life.webp
│   │   └── channel-investment.webp
│   ├── components/
│   │   ├── home/CoverHero.astro
│   │   ├── home/ContentLobby.astro
│   │   ├── home/ChannelCard.astro
│   │   ├── navigation/SiteHeader.astro
│   │   ├── navigation/MobileMenu.astro
│   │   ├── theme/ThemeToggle.astro
│   │   └── article/
│   │       ├── ArticleHeader.astro
│   │       ├── ContextRail.astro
│   │       ├── MobileReadingBar.astro
│   │       ├── SeriesProgress.astro
│   │       ├── FurtherReading.astro
│   │       └── RevisionHistory.astro
│   ├── content/posts/
│   │   ├── technology/
│   │   ├── life/
│   │   └── investment/
│   ├── data/taxonomy.ts
│   ├── layouts/ArticleLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── articles/[...page].astro
│   │   ├── articles/[...slug]/index.astro
│   │   ├── channels/index.astro
│   │   ├── channels/[channel]/index.astro
│   │   ├── topics/index.astro
│   │   ├── topics/[topic]/index.astro
│   │   ├── projects/index.astro
│   │   ├── about.astro
│   │   └── search.astro
│   ├── scripts/theme.ts
│   ├── styles/global.css
│   ├── styles/home.css
│   ├── styles/article.css
│   ├── utils/content.ts
│   └── content.config.ts
└── tests/
    ├── unit/content.test.ts
    ├── unit/taxonomy.test.ts
    └── e2e/
        ├── home.spec.ts
        ├── navigation.spec.ts
        ├── article.spec.ts
        └── theme.spec.ts
```

## 四、内容数据契约

`src/data/taxonomy.ts` 提供稳定标识，显示文案不参与路由判断：

```ts
export type ChannelId = "technology" | "life" | "investment";

export interface ChannelDefinition {
  id: ChannelId;
  name: string;
  description: string;
  href: `/channels/${ChannelId}/`;
  accent: "signal" | "warm" | "value";
}

export const CHANNELS: readonly ChannelDefinition[] = [
  {
    id: "technology",
    name: "技术记录",
    description: "系统、并发、协议、存储与游戏工程中的判断和取舍。",
    href: "/channels/technology/",
    accent: "signal",
  },
  {
    id: "life",
    name: "生活记录",
    description: "阅读、体验和十年开发生活之外的观察。",
    href: "/channels/life/",
    accent: "warm",
  },
  {
    id: "investment",
    name: "投资记录",
    description: "只记录假设、过程与复盘，不构成投资建议。",
    href: "/channels/investment/",
    accent: "value",
  },
] as const;
```

`src/content.config.ts` 在 AstroPaper 原有文章 Schema 上增加以下字段：

```ts
const articleSchema = ({ image }: SchemaContext) =>
  z.object({
    title: z.string().min(1),
    description: z.string().min(20).max(180),
    pubDatetime: z.date(),
    modDatetime: z.date().optional(),
    channel: z.enum(["technology", "life", "investment"]),
    topics: z.array(z.string()).min(1),
    tags: z.array(z.string()).default([]),
    kind: z.enum(["article", "case-study"]).default("article"),
    status: z.enum(["complete", "evolving", "archived"]).default("complete"),
    featuredRank: z.number().int().min(1).max(99).optional(),
    series: z
      .object({ id: z.string(), order: z.number().int().positive() })
      .optional(),
    related: z.array(z.string()).max(3).default([]),
    heroImage: image().optional(),
    heroAlt: z.string().optional(),
    draft: z.boolean().default(false),
    revisions: z
      .array(z.object({ date: z.date(), summary: z.string().min(1) }))
      .default([]),
  })
  .refine(data => !data.heroImage || data.heroAlt, {
    message: "设置 heroImage 时必须提供 heroAlt",
  });
```

内容规则：一篇文章必须属于一个频道并至少属于一个专题；系列只表达阅读顺序，不替代专题；`related` 引用文章 slug；投资频道页面和文章页固定显示风险提示。

## 五、分步实施计划

### 任务 1：引入 AstroPaper 并建立本地质量门禁

**文件：**

- 从 `.scratch/astropaper-source/astro-paper-main/` 引入基础工程文件
- 修改 `package.json`
- 创建 `vitest.config.ts`
- 创建 `playwright.config.ts`
- 创建 `tests/unit/taxonomy.test.ts`

**产出接口：** `pnpm dev`、`pnpm test`、`pnpm test:e2e`、`pnpm lint`、`pnpm astro check`、`pnpm build`。

- [x] 将 AstroPaper 源码复制到项目根目录，保留其 `LICENSE`，不复制 `.git`，不覆盖 `.scratch/`、`.superpowers/`、`docs/` 和 `CONTEXT.md`。
- [x] 删除 AstroPaper 示例文章和演示图片，只保留可复用的布局、图标、RSS、Pagefind、Shiki 和主题基础。
- [x] 安装依赖，并增加 `vitest`、`@playwright/test`、`rehype-mermaid`、`photoswipe`。
- [x] 先创建引用尚不存在的 `CHANNELS` 的单元测试，运行 `pnpm test tests/unit/taxonomy.test.ts`，确认因模块不存在而失败。
- [x] 创建最小 `src/data/taxonomy.ts`，让频道标识、名称和路径测试通过。
- [x] 运行 `pnpm lint && pnpm astro check && pnpm build`，确认基础工程能产生 `dist/`。

`package.json` 增加：

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test",
    "check": "astro check && eslint . && prettier --check ."
  }
}
```

### 任务 2：实现内容 Schema 与查询层

**文件：**

- 修改 `src/content.config.ts`
- 创建 `src/utils/content.ts`
- 创建 `tests/unit/content.test.ts`

**产出接口：**

```ts
getPublishedArticles(entries, now): ArticleEntry[]
getChannelArticles(entries, channel): ArticleEntry[]
getTopicArticles(entries, topic): ArticleEntry[]
getHomeChannels(entries, limit): HomeChannel[]
getTopicContext(entries, currentSlug): TopicContext
getSeriesContext(entries, currentSlug): SeriesContext | null
getFurtherReading(entries, currentSlug): ArticleEntry[]
```

- [x] 为草稿过滤、未来发布时间过滤、更新时间排序分别写失败测试并逐个确认失败。
- [x] 实现 `getPublishedArticles`，只返回当前时间已经发布的非草稿文章。
- [x] 为频道、专题和首页每频道数量限制写失败测试。
- [x] 实现频道、专题和首页聚合函数，首页每频道默认返回 5 篇。
- [x] 为专题上下文“前两篇 + 当前篇 + 后两篇”写边界测试，包括专题首篇和末篇。
- [x] 实现 `getTopicContext`，保证最多返回 5 篇且标识当前文章。
- [x] 为人工 `related` 优先和专题回退写失败测试，再实现 `getFurtherReading`，最多返回 3 篇。
- [x] 为系列顺序写失败测试，再实现 `getSeriesContext`。
- [x] 运行 `pnpm test tests/unit/content.test.ts` 和 `pnpm astro check`。

### 任务 3：实现全局导航、主题系统与视觉令牌

**文件：**

- 修改 `src/layouts/Layout.astro`
- 创建 `src/components/navigation/SiteHeader.astro`
- 创建 `src/components/navigation/MobileMenu.astro`
- 创建 `src/components/theme/ThemeToggle.astro`
- 修改 `src/scripts/theme.ts`
- 修改 `src/styles/global.css`
- 创建 `tests/e2e/theme.spec.ts`
- 创建 `tests/e2e/navigation.spec.ts`

**产出接口：** HTML 根元素使用 `data-theme="light|dark"`；本地存储键固定为 `blog-theme`，值为 `system|light|dark`。

- [x] 先写 Playwright 测试，验证桌面导航六个入口、移动菜单展开和主题刷新持久化；运行并确认现有页面失败。
- [x] 在 `<head>` 最前方加入同步主题初始化脚本，优先级为用户选择、系统主题、亮色回退。
- [x] 实现三态主题菜单，按钮使用太阳、月亮和显示器图标，并提供可访问名称。
- [x] 定义中性背景、正文、弱化文字、边框、代码背景及三个频道强调色的亮暗映射。
- [x] 实现桌面导航与移动菜单，保持元素尺寸稳定，避免主题图标切换引发布局位移。
- [x] 加入跳到正文链接、清晰焦点样式和 `prefers-reduced-motion` 分支。
- [x] 运行两个 E2E 文件、`pnpm astro check` 和 `pnpm lint`。

### 任务 4：制作本地图片资产并实现首页

**文件：**

- 创建 `src/assets/images/home-cover.webp`
- 创建三个 `src/assets/images/channel-*.webp`
- 创建 `src/components/home/CoverHero.astro`
- 创建 `src/components/home/ChannelCard.astro`
- 创建 `src/components/home/ContentLobby.astro`
- 修改 `src/pages/index.astro`
- 创建 `src/styles/home.css`
- 创建 `tests/e2e/home.spec.ts`

**产出接口：** `ContentLobby` 接收 `HomeChannel[]`；`ChannelCard` 分别暴露频道链接和文章链接。

- [x] 先写首页 E2E 测试：同页存在 `#cover` 与 `#content-lobby`、三个频道卡、每卡至少三篇文章、封面入口移动到内容大厅、频道标题和文章标题使用不同 URL。
- [x] 运行 `pnpm test:e2e tests/e2e/home.spec.ts`，确认首页结构测试失败。
- [x] 生成无文字、无 logo、无水印的宽幅封面：真实机房与工作台在自然夜色中连接，构图清晰，中心偏下保留标题可读区域，避免赛博朋克霓虹和抽象渐变。（按用户要求，本地 MVP 使用极简纯色占位图。）
- [x] 为技术、生活、投资频道分别生成可辨认的本地摄影风格图片；压缩为 WebP，并为每张图片编写具体替代文本。（按用户要求，先使用带准确替代文本的纯色 WebP。）
- [x] 实现封面首屏，保证常见桌面和移动视口仍能看到下一段内容的视觉提示。
- [x] 实现 A 方向的非对称内容大厅：技术卡最大，生活和投资卡为次级尺寸；卡片圆角不超过 8px。
- [x] 文章预览使用水平滚动与 scroll snap，不启用多卡自动滚动。
- [x] 使用 `astro:assets` 输出响应式图片尺寸，禁止远程图片 URL。
- [x] 运行首页 E2E、移动端截图和 `pnpm astro check`。

### 任务 5：实现文章、频道、专题与项目目录

**文件：**

- 创建 `src/pages/articles/[...page].astro`
- 创建 `src/pages/channels/index.astro`
- 创建 `src/pages/channels/[channel]/index.astro`
- 创建 `src/pages/topics/index.astro`
- 创建 `src/pages/topics/[topic]/index.astro`
- 创建 `src/pages/projects/index.astro`
- 创建 `tests/e2e/navigation.spec.ts`

**产出接口：** 所有目录页只调用 `src/utils/content.ts`，不各自重复过滤和排序。

- [x] 先写路由测试，验证所有固定目录返回 200、三个频道页存在、未知频道返回 404。
- [x] 实现文章总目录，提供频道和专题筛选；筛选结果为空时显示清晰空状态。
- [x] 实现频道总览及三个频道详情页，投资频道固定显示风险提示。
- [x] 实现专题总览和专题详情页，技术频道预置五个专题定义。
- [x] 实现项目目录，只展示 `kind: case-study` 的内容。
- [x] 验证从顶部导航可以绕过首页直接进入任一目录。
- [x] 运行导航 E2E、单元测试和 `pnpm astro check`。

### 任务 6：实现文章页与桌面上下文栏

**文件：**

- 创建 `src/layouts/ArticleLayout.astro`
- 创建 `src/components/article/ArticleHeader.astro`
- 创建 `src/components/article/ContextRail.astro`
- 创建 `src/components/article/SeriesProgress.astro`
- 创建 `src/components/article/FurtherReading.astro`
- 创建 `src/components/article/RevisionHistory.astro`
- 创建 `src/pages/articles/[...slug]/index.astro`
- 创建 `src/styles/article.css`
- 创建 `tests/e2e/article.spec.ts`

**产出接口：** `ArticleLayout` 接收文章数据、Astro headings、`TopicContext`、`SeriesContext` 和延伸阅读。

- [x] 先写文章 E2E：面包屑、元数据、正文、本文目录、当前标题高亮、同专题文章、系列进度、上一篇/下一篇、延伸阅读、修订记录和投资提示。
- [x] 运行文章 E2E，确认现有 AstroPaper 文章布局不能满足断言。
- [x] 实现统一文章页头和 `频道 / 专题 / 文章` 路径。
- [x] 实现桌面双区 Context Rail：目录只收录 H2/H3，同专题列表最多 5 篇。
- [x] 使用 IntersectionObserver 更新当前标题的 `aria-current`；无 JavaScript 时目录锚点仍可点击。
- [x] 实现系列进度、文末上一篇/下一篇、最多三篇延伸阅读和可选修订记录。
- [x] 配置 Shiki 文件名、复制、重点行、diff 和可选行号；代码默认横向滚动。
- [x] 配置构建期 Mermaid、语义化表格、图片说明和 PhotoSwipe 渐进增强。
- [x] 增加打印媒体样式，隐藏导航和上下文栏但保留正文、代码、图片及引用。
- [x] 运行文章 E2E、`pnpm astro check` 和打印预览检查。

### 任务 7：实现移动端阅读栏与目录抽屉

**文件：**

- 创建 `src/components/article/MobileReadingBar.astro`
- 修改 `src/layouts/ArticleLayout.astro`
- 修改 `src/styles/article.css`
- 扩展 `tests/e2e/article.spec.ts`

**产出接口：** 移动抽屉有 `article` 和 `topic` 两个面板；关闭后不改变正文滚动位置。

- [x] 先写 390x844 视口测试：桌面栏隐藏、文章页头离开视口后阅读栏出现、目录按钮打开抽屉、Tab 可切换、Escape 可关闭、滚动位置保持。
- [x] 运行移动端用例并确认失败。
- [x] 实现阅读栏和阅读进度，使用固定高度避免出现/隐藏时推动正文。
- [x] 实现带焦点圈定和焦点归还的抽屉；背景内容打开期间不可聚焦。
- [x] 处理超长目录：只显示 H2/H3，当前 H2 分支展开，其余 H3 折叠。
- [x] 验证 320px、390px、768px 宽度下无正文遮挡和水平页面滚动。
- [x] 运行文章 E2E 和无障碍扫描。

### 任务 8：加入示例内容、搜索并完成本地验收

**文件：**

- 在 `src/content/posts/technology/` 创建 5 篇示例文章
- 在 `src/content/posts/life/` 创建 3 篇示例文章
- 在 `src/content/posts/investment/` 创建 3 篇示例文章
- 修改 `src/pages/search.astro`
- 更新 `README.md`

**示例内容主题：**

- 技术：epoll 与慢消费者、IM 网关连接治理、PostgreSQL 热点行、消息洪峰降级、服务器帧循环。
- 生活：十年开发后的学习方式、一次长途步行记录、如何维护个人知识系统。
- 投资：一次错误假设的复盘、仓位规则记录、如何区分观点与证据。

- [x] 每篇示例文章使用完整 Schema，并至少包含两个 H2；技术文章至少一篇包含代码、Mermaid、脚注和修订记录。
- [x] 先写搜索构建断言，验证 Pagefind 索引包含已发布文章且排除草稿。
- [x] 执行生产构建并生成 Pagefind 索引，确认频道、专题和标签可作为搜索过滤元数据。
- [x] 删除所有 AstroPaper 演示文案、失效社交链接和远程示例图片。
- [x] 在 README 写明 Node `>=22.12.0`、`pnpm install`、`pnpm dev`、`pnpm test`、`pnpm build`、`pnpm preview`。
- [x] 运行完整验证：`pnpm test && pnpm test:e2e && pnpm check && pnpm build`。
- [x] 使用 Playwright 截取桌面 1440x900 和移动端 390x844 的首页、频道页、文章页亮暗主题截图。
- [x] 检查浏览器控制台、失效链接、图片加载、键盘导航、正文溢出和布局遮挡。

## 六、本地运行流程

```powershell
pnpm install
pnpm dev
```

开发服务器启动后以终端显示的本地 URL 为准。生产构建的本地检查流程：

```powershell
pnpm test
pnpm test:e2e
pnpm check
pnpm build
pnpm preview
```

Pagefind 搜索只在执行生产构建后生成，因此搜索验收应使用 `pnpm build` 加 `pnpm preview`，不能只看开发服务器。

## 七、明确延期事项

以下内容不阻塞本地 MVP，也不在本计划中实施：

- Cloudflare Pages、Netlify、GitHub Pages 或其他远程部署。
- 自定义域名、DNS、ICP 与中国大陆加速。
- Giscus 评论、访问统计和隐私页面的第三方服务配置。
- 邮件订阅、用户账户、收藏、稍后阅读、PWA 和离线缓存。
- 完整中英文双语内容。
- 将 `.scratch/` 或 `.superpowers/` 原型目录纳入正式站点。

## 八、完成定义

只有同时满足以下条件，才能认为本地 MVP 实现完成：

1. 两条核心路径都可用：新访客可以从封面探索，老访客可以从导航直接检索。
2. 三个频道、五个技术专题、文章和项目复盘之间的关系由 Schema 校验，不依赖页面硬编码。
3. 文章页在桌面与移动端都能同时解决“本文读到哪里”和“专题还有什么”两个问题。
4. 亮暗主题、减少动效、键盘操作、打印和 JavaScript 失效场景均有可验证结果。
5. 示例内容足够填满首页和目录，页面呈现的是一个真实出版物，而不是空模板。
6. 所有自动化检查通过，本地生产预览无控制台错误、资源失败或布局重叠。
