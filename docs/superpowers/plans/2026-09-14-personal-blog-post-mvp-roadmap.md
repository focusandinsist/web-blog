# 个人博客 Post-MVP 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不引入企业级管理后台的前提下，消除 MVP 的发布一致性和 SEO 技术债，建立可靠的文章校验与创建流程，再为真实内容和未来上线做好准备。

**Architecture:** 继续使用 Markdown/MDX、Astro Content Collections 和静态构建。所有公开性判断集中到 `src/utils/content.ts`，文章完整性由独立校验模块保证，作者操作优先通过本地命令完成；只有文件管理确实成为持续阻力时，才评估本地轻量内容界面。

**Tech Stack:** Astro 7、TypeScript 6、Content Collections、Vitest、Playwright、Pagefind、Node.js 22。

**Spec:** `docs/superpowers/plans/2026-09-10-personal-blog-mvp.md`、`CONTEXT.md`、`README.md`。

## 全局约束

- 延续当前本地优先范围，不执行 Git 初始化、提交、分支、合并或推送。
- 未经项目所有者确认，不配置远程部署、域名、账户、评论、统计或邮件订阅。
- `/articles/` 是唯一公开文章路径；文章文件仍保存在 `src/content/posts/`。
- 内容判断必须集中在纯 TypeScript 模块中，页面不重复实现草稿、定时发布、排序或关联规则。
- 新功能先写失败测试并确认失败原因，再实现最小生产代码。
- 每个任务结束时运行对应单测和 `pnpm astro check`；全部任务结束后运行 `pnpm test`、`pnpm test:e2e`、`pnpm check` 和 `pnpm build`。

---

## 一、MVP 审查结论

### Standards

1. **P1 - 重复的发布管线。** `src/utils/content.ts` 的 `getPublishedArticles(entries, now)` 与 `src/utils/postFilter.ts` / `src/utils/getSortedPosts.ts` 都负责过滤和排序，但开发模式、生产模式及 15 分钟发布时间边界不同。`/articles/`、频道、专题和项目页使用前者，归档、标签、RSS 和遗留 `/posts/` 使用后者，属于重复逻辑并可能产生同一文章在不同入口可见性不一致。
2. **P2 - 继承字段与自定义页面之间存在失配。** `featuredRank`、`featured`、`heroImage`、`ogImage` 等字段仍被 Schema 接受，但当前首页查询或自定义文章布局没有消费它们。README 已注明现状，后续应明确实现或删除，避免长期保留无效果配置。

### Spec

1. **P1 - 公开文章存在双路由。** 构建产物同时生成 `/articles/.../` 和 `/posts/.../`，两者 canonical URL 也分别指向自身；`sitemap-0.xml` 同时收录两套地址。虽然 `/posts/` 已从 Pagefind 排除，但上线后仍会形成重复内容和分散链接权重，不符合 `/articles/` 作为文章公开路径的目标。
2. **P2 - 内容引用完整性依靠人工维护。** Schema 会校验字段形状，但不会检查文件目录与 `channel` 是否一致、专题是否存在、`related` 是否指向有效文章、系列顺序是否重复。文章数量增加后容易在构建成功的情况下产生失效关系。
3. **P2 - 无 JavaScript 验收缺少自动回归。** 本次人工验证确认首页、频道页和文章页禁用 JavaScript 后仍能返回正文与基础导航，但现有 Playwright 配置没有固定的无 JavaScript 用例。

MVP 的首页、导航、频道、专题、项目、文章阅读、移动目录、主题和搜索主路径均已实现。后续应先偿还上述 P1 项，而不是立刻建设类似企业后台的权限和菜单系统。

---

## 二、建议执行顺序

1. 任务 1：移除重复公开路由。
2. 任务 2：统一发布与排序规则。
3. 任务 3：建立内容完整性检查。
4. 任务 4：提供本地文章创建命令。
5. 任务 5：收敛或实现预留内容字段。
6. 任务 6：补齐发布前质量门禁。
7. 任务 7：达到明确触发条件后再评估轻量管理界面。

任务 1 至任务 4 是近期工作；任务 5 和任务 6 在准备公开上线前完成；任务 7 是可选决策，不是当前必做项。

---

### 任务 1：移除 `/posts/` 重复公开路由

**Files:**

- Delete: `src/pages/posts/[...page].astro`
- Delete: `src/pages/posts/[...slug]/index.astro`
- Delete: `src/pages/posts/[...slug]/index.png.ts`
- Delete: `src/pages/posts/[...slug]/_components/*.astro`
- Modify: `src/utils/getPostPaths.ts`
- Modify: `tests/e2e/navigation.spec.ts`
- Create: `tests/e2e/seo.spec.ts`

**Interfaces:**

- 保留：`getPostUrl()` 始终返回 `/articles/.../`。
- 产出：站点只生成一套文章详情 URL，站点地图不再包含 `/posts/`。

- [ ] **Step 1: 写失败的唯一路由测试**

  在 `tests/e2e/seo.spec.ts` 中请求同一篇示例文章，断言 `/articles/technology/event-loop-notes/` 返回 200、canonical 指向自身，并断言 `/posts/technology/event-loop-notes/` 返回 404。

- [ ] **Step 2: 运行测试并确认失败原因**

  Run: `pnpm test:e2e tests/e2e/seo.spec.ts --workers=1`

  Expected: `/posts/technology/event-loop-notes/` 当前返回 200，测试因此失败。

- [ ] **Step 3: 删除遗留页面和仅被遗留页面使用的组件**

  删除 `src/pages/posts/` 路由树；保留仍被 `ArticleLayout.astro` 使用的 `src/layouts/PostLayout.astro`。同时把 `src/utils/getPostPaths.ts` 注释中的 `/posts/` 示例改为 `/articles/`。

- [ ] **Step 4: 验证路由和构建产物**

  Run: `pnpm test:e2e tests/e2e/seo.spec.ts tests/e2e/navigation.spec.ts --workers=1`

  Run: `pnpm build`

  Expected: 测试通过，构建成功，`dist/` 与 `dist/sitemap-0.xml` 均不再包含 `/posts/`。

---

### 任务 2：统一发布、定时与排序规则

**Files:**

- Modify: `src/utils/content.ts`
- Delete: `src/utils/postFilter.ts`
- Delete: `src/utils/getSortedPosts.ts`
- Modify: `src/utils/getUniqueTags.ts`
- Modify: `src/pages/archives/index.astro`
- Modify: `src/pages/tags/[tag]/[...page].astro`
- Modify: `src/pages/rss.xml.ts`
- Modify: `astro-paper.config.ts`
- Modify: `src/types/config.ts`
- Modify: `tests/unit/content.test.ts`

**Interfaces:**

- 统一入口：`getPublishedArticles(entries: readonly ArticleEntry[], now: Date): PublishedArticleEntry[]`。
- 输入：原始 Content Collection 文章和明确的当前时间。
- 输出：排除草稿和未来文章，并按 `modDatetime ?? pubDatetime` 倒序排列的已发布文章。

- [ ] **Step 1: 写跨入口一致性失败测试**

  在 `tests/unit/content.test.ts` 增加同一组已发布、草稿、未来文章和最近修订文章，断言统一入口只返回当前已发布内容并保持更新时间排序。补充边界断言：`pubDatetime === now` 时文章可见。

- [ ] **Step 2: 运行单测并确认边界测试失败或旧调用仍存在**

  Run: `pnpm test tests/unit/content.test.ts`

  Expected: 新增边界断言或后续静态调用检查至少一项失败，证明旧发布入口仍未收敛。

- [ ] **Step 3: 将所有页面切换到统一入口**

  让归档、标签和 RSS 与首页、频道、专题、项目和文章页共同调用 `getPublishedArticles(entries, new Date())`。`getUniqueTags()` 只接收已经发布的文章，不再自行过滤。

- [ ] **Step 4: 删除旧过滤模块并检查调用点**

  删除 `postFilter.ts` 和 `getSortedPosts.ts`，并从站点配置类型和实例中移除不再需要的 `scheduledPostMargin`。运行 `rg "postFilter|getSortedPosts|scheduledPostMargin" src tests astro-paper.config.ts`，预期无匹配。

- [ ] **Step 5: 验证内容入口**

  Run: `pnpm test tests/unit/content.test.ts`

  Run: `pnpm astro check`

  Expected: 单测和类型检查通过，归档、标签和 RSS 不再拥有独立发布规则。

---

### 任务 3：建立内容完整性检查

**Files:**

- Create: `src/utils/contentValidation.ts`
- Create: `tests/unit/contentValidation.test.ts`
- Create: `scripts/check-content.ts`
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`
- Modify: `README.md`

**Interfaces:**

```ts
export interface ContentValidationEntry {
  id: string;
  filePath: string;
  data: Pick<
    ArticleEntry["data"],
    "channel" | "topics" | "related" | "series" | "draft"
  >;
}

export interface ContentValidationIssue {
  articleId: string;
  field: "channel" | "topics" | "related" | "series";
  message: string;
}

export function validateContentIntegrity(
  entries: readonly ContentValidationEntry[]
): ContentValidationIssue[];
```

校验规则：文件顶层目录与 `channel` 一致；所有专题存在于 `TOPICS`；所有 `related` 指向存在且非草稿文章；文章不能关联自身；同一系列的 `order` 唯一且从 1 连续递增。

- [ ] **Step 1: 为每条完整性规则写失败单测**

  在 `tests/unit/contentValidation.test.ts` 分别构造频道错位、未知专题、失效关联、自关联、系列序号重复和系列序号断档数据，并断言返回稳定的 `field` 与消息。

- [ ] **Step 2: 运行测试并确认模块不存在**

  Run: `pnpm test tests/unit/contentValidation.test.ts`

  Expected: FAIL，提示无法导入 `contentValidation`。

- [ ] **Step 3: 实现纯 TypeScript 校验器**

  使用 `Map` 和 `Set` 建立文章、专题及系列索引，一次返回全部问题，不在发现首个问题时提前抛出。不要在页面组件中重复这些判断。

- [ ] **Step 4: 接入本地命令**

  添加开发依赖 `tsx` 和 `gray-matter`。`scripts/check-content.ts` 使用 Node `fs/promises` 递归读取 `src/content/posts/**/*.{md,mdx}`，使用 `gray-matter` 解析 Frontmatter，再调用纯 TypeScript 校验器；存在问题时逐行输出 `articleId`、`field`、`message` 并设置非零退出码。`package.json` 增加：

  ```json
  {
    "scripts": {
      "content:check": "astro sync && tsx scripts/check-content.ts"
    }
  }
  ```

- [ ] **Step 5: 接入质量门禁并记录用法**

  将 `pnpm content:check` 加入 `pnpm check`，在 README 的常用命令和文章增删改流程中补充该命令。

- [ ] **Step 6: 验证现有全部内容**

  Run: `pnpm test tests/unit/contentValidation.test.ts`

  Run: `pnpm content:check`

  Expected: 单测通过，现有文章无完整性错误。

---

### 任务 4：增加本地文章创建命令

**Files:**

- Create: `scripts/new-article.mjs`
- Create: `tests/unit/articleScaffold.test.ts`
- Modify: `package.json`
- Modify: `README.md`

**Interfaces:**

```text
pnpm article:new -- --channel technology --slug io-backpressure --title "I/O 背压记录" --topic systems-programming
```

命令生成 `src/content/posts/<channel>/<slug>.md`，默认 `draft: true`，发布日期使用带本地时区偏移的 ISO 8601 字符串。已有文件不得覆盖。

- [ ] **Step 1: 写模板和参数校验失败测试**

  测试三个合法频道、英文小写连字符 slug、必填标题与专题、默认草稿、目标文件已存在时拒绝覆盖。对 `../outside`、空标题和未知频道分别断言失败消息。

- [ ] **Step 2: 运行测试并确认脚本不存在**

  Run: `pnpm test tests/unit/articleScaffold.test.ts`

  Expected: FAIL，提示无法导入 `scripts/new-article.mjs`。

- [ ] **Step 3: 实现可测试的脚手架函数和 CLI**

  从脚本导出 `validateArticleArgs()`、`renderArticleTemplate()` 和 `createArticleFile()`；只有直接执行脚本时才读取 `process.argv`。文件写入使用独占创建模式，避免覆盖现有文章。

- [ ] **Step 4: 注册命令并生成临时草稿验收**

  `package.json` 增加 `"article:new": "node scripts/new-article.mjs"`。在系统临时目录执行脚手架集成测试，不在真实 `src/content/posts/` 留下验收文件。

- [ ] **Step 5: 更新 README**

  在“新增文章”中把命令作为推荐入口，同时保留手工创建 Markdown 的流程。明确该命令不是 Web 管理后台，也不会自动发布文章。

- [ ] **Step 6: 验证**

  Run: `pnpm test tests/unit/articleScaffold.test.ts`

  Run: `pnpm check`

  Expected: 参数、模板、防覆盖和格式检查全部通过。

---

### 任务 5：收敛 Schema 与页面能力

**Files:**

- Modify: `src/content.config.ts`
- Modify: `src/utils/content.ts`
- Modify: `src/layouts/ArticleLayout.astro`
- Modify: `src/components/article/ArticleHeader.astro`
- Modify: `src/components/home/ContentLobby.astro`
- Modify: `tests/unit/content.test.ts`
- Modify: `tests/e2e/article.spec.ts`
- Modify: `README.md`

**Interfaces:**

- `featuredRank`：数值越小首页优先级越高；未设置时按更新时间排序。
- `heroImage` + `heroAlt`：在文章页头下方渲染本地响应式头图。
- `ogImage`：传递给 `PostLayout` 作为单篇文章分享图。
- 删除当前自定义页面不再需要的兼容字段 `featured`、`hideEditPost` 和文章级 `timezone`。

- [ ] **Step 1: 写排序和渲染失败测试**

  单测断言同频道文章先按 `featuredRank`、再按更新时间排序；E2E 断言带 `heroImage` 的 fixture 显示正确替代文本并输出文章级 `og:image`。

- [ ] **Step 2: 运行测试并确认当前字段无效果**

  Run: `pnpm test tests/unit/content.test.ts`

  Run: `pnpm test:e2e tests/e2e/article.spec.ts --workers=1`

  Expected: 推荐排序、头图或文章级分享图断言失败。

- [ ] **Step 3: 实现明确字段行为**

  在内容查询层实现稳定排序；使用 Astro `Image` 渲染 `heroImage`；将 `ogImage` 解析为布局可接受的 URL。不要让页面组件自行解释 `featuredRank`。

- [ ] **Step 4: 删除无效兼容字段并修正文档**

  从 Schema、示例内容和 README 移除 `featured`、`hideEditPost` 与文章级 `timezone`。保留站点级时区配置。

- [ ] **Step 5: 验证**

  Run: `pnpm test tests/unit/content.test.ts`

  Run: `pnpm test:e2e tests/e2e/article.spec.ts --workers=1`

  Run: `pnpm astro check`

  Expected: 字段表与实际页面能力一致。

---

### 任务 6：补齐发布前质量门禁

**Files:**

- Create: `tests/e2e/no-js.spec.ts`
- Create: `tests/e2e/site-health.spec.ts`
- Modify: `playwright.config.ts`
- Modify: `README.md`

**Interfaces:**

- `no-js` Playwright project：`javaScriptEnabled: false`。
- `site-health.spec.ts`：采集控制台错误、失败请求、失效站内链接和图片加载失败。

- [ ] **Step 1: 增加无 JavaScript 回归测试**

  断言首页可进入频道、频道页可进入文章、文章正文和目录锚点存在、基础导航可访问。测试不得依赖点击 JavaScript 菜单或主题控件。

- [ ] **Step 2: 增加站点健康测试**

  至少覆盖首页、三个频道页、文章目录、专题目录、项目页、关于页和一篇各频道文章。对每页断言无 `pageerror`、无错误级控制台日志、无失败请求、所有图片 `naturalWidth > 0`，并检查同源链接响应状态低于 400。

- [ ] **Step 3: 运行测试并处理真实失败**

  Run: `pnpm test:e2e tests/e2e/no-js.spec.ts tests/e2e/site-health.spec.ts --workers=1`

  Expected: 所有页面在静态基础能力和资源健康方面通过。

- [ ] **Step 4: 完成发布前全量验证**

  Run: `pnpm test`

  Run: `pnpm test:e2e`

  Run: `pnpm check`

  Run: `pnpm build`

  Expected: 所有命令退出码为 0；Pagefind 只索引 `/articles/` 下的已发布文章。

---

### 任务 7：按触发条件评估本地轻量管理界面

**Decision only:** 本任务不立即编写后台代码。完成任务 1 至任务 6，并实际维护至少 20 篇文章后，再统计以下情况：

- 一个月内因 Frontmatter 手工错误导致构建失败是否达到 3 次。
- 是否需要非开发者通过浏览器编辑文章。
- 是否频繁需要批量调整专题、标签、系列或关联文章。
- 命令行脚手架和编辑器预览是否仍无法满足日常写作。

- [ ] **Step 1: 记录两到四周真实使用问题**

  在同目录创建决策记录，逐条写明发生日期、操作、失败原因和耗时，不以主观“可能需要”作为建设依据。

- [ ] **Step 2: 根据证据选择方案**

  若上述触发条件均未达到，继续使用 Markdown + `article:new` + `content:check`。若达到条件，单独编写轻量内容界面规格，只包含文章列表、搜索、新建、编辑、删除确认、草稿、预览和 Frontmatter 表单。

- [ ] **Step 3: 明确排除企业后台能力**

  本地单作者版本不实现 RBAC、组织架构、动态菜单、操作审计、工作流、代码生成、账户中心和多租户。若未来出现多人远程协作需求，再把认证、存储、构建触发和权限模型作为独立项目设计。

---

## 三、公开上线前的独立决策

远程部署仍不在本计划的授权范围内。准备上线时应另立部署计划，至少明确：

- 正式域名和 `site.url`。
- 托管平台及 Node.js/pnpm 构建版本。
- 构建触发方式、预览环境和失败回滚方式。
- sitemap、robots、RSS、canonical URL 和社交分享图验收。
- 是否需要隐私友好的访问统计。
- 内容备份和恢复流程。

不要在本地发布一致性尚未完成时先接入评论、账户或复杂 CMS。

## 四、完成标准

- 公开文章只有 `/articles/` 一套 URL，站点地图不存在 `/posts/`。
- 首页、频道、专题、项目、归档、标签、RSS 和搜索使用一致的发布集合。
- 无效专题、关联、系列和频道错位在质量门禁中直接失败。
- 新文章可由一个本地命令安全创建，默认草稿且不会覆盖文件。
- Schema 中每个保留字段都有实际消费者和自动化测试。
- 无 JavaScript 和站点健康检查进入 Playwright 回归套件。
- 在出现真实证据前，不建设类似 `go-admin` 的复杂管理后台。
