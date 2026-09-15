import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import {
  validateContentIntegrity,
  type ContentValidationEntry,
} from "../src/utils/contentValidation";

const CONTENT_ROOT = path.resolve("src/content/posts");
const ARTICLE_EXTENSION = /\.(?:md|mdx)$/i;

async function findArticleFiles(directory: string): Promise<string[]> {
  const directoryEntries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const directoryEntry of directoryEntries.toSorted((left, right) =>
    left.name.localeCompare(right.name)
  )) {
    const entryPath = path.join(directory, directoryEntry.name);
    if (directoryEntry.isDirectory()) {
      files.push(...(await findArticleFiles(entryPath)));
    } else if (directoryEntry.isFile() && ARTICLE_EXTENSION.test(entryPath)) {
      files.push(entryPath);
    }
  }

  return files;
}

async function readValidationEntry(
  filePath: string
): Promise<ContentValidationEntry> {
  const relativePath = path.relative(CONTENT_ROOT, filePath).replaceAll("\\", "/");
  const id = relativePath.replace(ARTICLE_EXTENSION, "");
  const { data } = matter(await readFile(filePath, "utf8"));

  return {
    id,
    filePath: relativePath,
    data: {
      channel: data.channel,
      topics: data.topics ?? [],
      related: data.related ?? [],
      series: data.series,
      draft: data.draft ?? false,
    },
  };
}

async function main(): Promise<void> {
  const files = await findArticleFiles(CONTENT_ROOT);
  const entries = await Promise.all(files.map(readValidationEntry));
  const issues = validateContentIntegrity(entries);

  if (issues.length > 0) {
    for (const issue of issues) {
      process.stderr.write(
        `${issue.articleId} [${issue.field}] ${issue.message}\n`
      );
    }
    process.exitCode = 1;
    return;
  }

  process.stdout.write(
    `Content integrity check passed (${entries.length} articles).\n`
  );
}

main().catch(error => {
  process.stderr.write(`${String(error)}\n`);
  process.exitCode = 1;
});
