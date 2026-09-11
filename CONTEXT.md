# Domain Context

## Glossary

### Publication

The complete public body of work presented by the site. It combines Technology Notes, Life Notes, Investment Notes, topic collections, and selected project case studies.

### Channel

A top-level editorial area defined by the author's reason for recording the work. The three Channels are Technology Notes, Life Notes, and Investment Notes. A Channel contains Articles and Topics but does not prescribe a reading order.

### Article

A dated piece of writing centered on one problem, decision, experiment, observation, or lesson. Articles are the primary unit of publication, belong to one Channel, and may belong to one or more Topics.

### Topic

A durable subject within a Channel. Technology Notes begins with five canonical Topics: Systems Programming, Concurrency Engineering, Realtime Systems, Data Systems, and Game Technology. A Topic is broader and longer-lived than a Tag.

### Series

An intentionally ordered sequence of articles that develops one subject over multiple installments. Unlike a topic, a series has a defined reading progression and intended completion point.

### Project Case Study

A structured account of a system or project that explains its context, constraints, decisions, trade-offs, and results. It is evidence of engineering judgment rather than a portfolio screenshot. A professional case study may be anonymized without removing the technical reasoning that makes it useful.

### Featured Work

An Article, Series, Topic, Channel, or Project Case Study selected for prominent placement on the home page. Featured status is editorial and does not imply recency.

### Home Card

A visual entry point to a Channel or an item of Featured Work. A Channel Card contains several independently clickable Article previews; its heading opens the Channel index. Card size and treatment communicate editorial emphasis, not a separate content type.

### Cover

The image-led first viewport of the home page. It introduces the publication and leads into the Content Lobby by click or scroll without creating a separate route.

### Content Lobby

The editorial home-page region following the Cover. It presents the three Channels and selected work for exploratory browsing, while persistent navigation supports direct retrieval.

### Tag

A lightweight cross-cutting label used for discovery within and across topics. Programming languages such as Go, C, C++, and Python are tags rather than topics, as are narrower concepts such as `epoll`, `lock-free`, `profiling`, and `PostgreSQL`.

### Archive

A chronological view of published Articles. It is a discovery view within Writing, not a separate content type or primary navigation destination.

### Article Shell

The consistent reading environment shared by Articles in every Channel. It preserves navigation and reading behavior while allowing Channel-specific visual accents and optional content blocks.

### Article Outline

The ordered second- and third-level heading structure of one Article, used to show location and move within that Article.

### Topic Context

A compact view of the current Article's position among nearby Articles in the same Topic. It is not the complete Topic index.

### Series Progress

The current Article's position in an intentionally ordered Series, including its preceding and following Series Articles.

### Further Reading

A small editorial selection of Articles that deepen or contrast with the current Article. It may fall back to Articles from the same Topic when no manual selection exists.

### Revision History

An optional record of substantive changes to an Article's reasoning, evidence, or conclusion. Cosmetic corrections are not Revisions.

### Reference

An attributed external source supporting an Article. A Reference retains enough authorship, title, location, and access information for a reader to identify the source later.

### Canonical Domain

The independent public domain that identifies the Publication. Platform-provided deployment domains are previews or fallbacks and are not canonical locations for Articles.

### Preview Deployment

A temporary build used to review changes before publication. It must not create duplicate searchable Articles or permanent comment discussions.

### Syndication Feed

A machine-readable stream of published Articles for feed readers. The Publication exposes one complete feed and one feed for each Channel.
