# Phase 2: Content Import Report

The importer is `content.management.commands.import_publication`. Its default mode
parses and validates the source tree without changing database rows or media files.
`--apply` writes articles and their relations in a transaction. `--report` saves the
same machine-readable report printed to the terminal.

The import was applied from `src/content/posts` on 2026-09-29. The complete report is
versioned at [backend/content/import-report.json](../../backend/content/import-report.json).

| Imported data | Count |
| --- | ---: |
| Markdown files | 21 |
| Articles | 21 |
| Topics referenced | 11 |
| Tags | 27 |
| Series memberships | 3 |
| Ordered related links | 19 |
| Revision records | 2 |
| Copied media files | 3 |
| Import errors | 0 |

The current source tree contains no MDX files or JSX constructs requiring manual
conversion. A dedicated test confirms that a future `.mdx` file remains preserved as
source and receives an explicit `manual_review` report entry rather than being
executed or silently converted.

The original Markdown files remain in `src/content/posts` as read-only migration
references. The import command is idempotent by `(channel, slug)` and can be run again
to update existing rows without creating duplicate articles, tags, relationships,
revisions, or media paths.
