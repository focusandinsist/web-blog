# Define the Technical Reading Experience

Type: grilling
Status: resolved
Blocked by: 02

## Question

Which reading, navigation, code, diagram, citation, series, and mobile behaviors are required for long-form systems articles and project case studies?

## Context from the Home Direction

The owner wants Article pages to be visually calm and optimized for personal review as well as public reading. On desktop, the main content should be accompanied by a right-side context area that exposes the current Article outline and other Articles in the same Topic. The answer below settles the mobile behavior and the balance between these two navigation jobs.

## Answer

All Channels share one calm Article Shell so that reading and personal review remain predictable. Channel identity may affect the cover treatment, accent color, and optional content blocks, but it must not change core navigation or typography behavior. Technical controls appear only when the Article uses them.

On desktop, the Article body is accompanied by a sticky Context Rail with two simultaneously visible regions:

1. The Article Outline highlights the current section and may scroll internally when long.
2. The Topic Context shows the current Article, up to two preceding and two following Articles, and a link to the complete Topic index.

The Topic Context is capped at five Articles so a large Topic cannot overwhelm the page. The complete Topic remains one click away.

On mobile, no persistent sidebar reduces the body width. After the Article header leaves the viewport, a compact Reading Bar exposes the shortened title, reading progress, and an outline icon. The icon opens a drawer with two tabs, Article and Topic. Closing the drawer restores the exact reading position.

Long Articles remain one continuous document and are never paginated. The outline includes second- and third-level headings only. The current second-level branch expands its third-level headings while other branches collapse. Desktop outline scrolling remains independent from body scrolling.

Code blocks support a language label, optional filename, copy action, highlighted lines, added and removed line states, and optional line numbers. Wide code scrolls horizontally instead of wrapping by default. Shell sessions and command output are visually distinguishable from source code.

The initial rich-content boundary includes optimized images, captions, zoomable images, accessible tables, Mermaid diagrams, and ordinary Markdown/MDX composition. Runtime-heavy interactive diagrams are excluded from the first release so that Articles remain portable and static builds stay reliable.

Article headers display publication date, last meaningful update, estimated reading time, and publication status when relevant. A Revision History is optional at the end of an Article and records substantive changes to reasoning or conclusions, not spelling fixes.

Navigation begins with a Channel / Topic / Article trail. Series Articles additionally show Series progress. The footer provides previous and next Articles in the Series when applicable and up to three manually selected Further Readings. When no manual selection exists, the site may fill the list from the current Topic.

Citations use Markdown footnotes and a References section. References retain title, author or organization, URL, and access date. External links are visually identifiable but open in the current browsing context by default. Quoted code identifies its source and license, and short citation is distinguished from republication. Investment Notes display a statement that they are personal records rather than investment advice.

Print styling removes global navigation, the Context Rail, and interactive controls while preserving the Article title, author, dates, body, code, images, captions, citations, and References. PWA behavior, offline caching, and account-based read-later features are outside the initial release.

Keyboard access, visible focus, semantic headings, a skip link, sufficient contrast, reduced-motion behavior, and non-color-only status cues are baseline requirements rather than optional enhancements. Exact content width and typography tokens belong to [Define the Visual System and Theme Behavior](09-define-visual-system.md).
