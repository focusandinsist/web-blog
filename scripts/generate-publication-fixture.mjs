import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const postsRoot = path.join(root, "src", "content", "posts");
const outputPath = path.join(root, "backend", "content", "fixtures", "publication.json");

async function listMarkdownFiles(directory) {
  const entries = await (await import("node:fs/promises")).readdir(directory, {
    withFileTypes: true,
  });
  const files = [];
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listMarkdownFiles(entryPath)));
    else if (entry.isFile() && /\.(md|mdx)$/.test(entry.name)) files.push(entryPath);
  }
  return files;
}

function iso(value) {
  return value instanceof Date ? value.toISOString() : value ? new Date(value).toISOString() : null;
}

async function imageDimensions(relativePath) {
  const imagePath = path.resolve(path.dirname(relativePath), relativePath);
  const metadata = await sharp(imagePath).metadata();
  return { width: metadata.width ?? null, height: metadata.height ?? null };
}

const articles = [];
for (const filePath of (await listMarkdownFiles(postsRoot)).sort()) {
  const source = await readFile(filePath, "utf8");
  const parsed = matter(source);
  const relativeFile = path.relative(postsRoot, filePath).replaceAll("\\", "/");
  const [channel, filename] = relativeFile.split("/");
  const slug = filename.replace(/\.(md|mdx)$/, "");
  const data = parsed.data;
  const heroImage = data.heroImage
    ? {
        url: `/media/articles/${channel}/${slug}/hero.webp`,
        alt: data.heroAlt ?? "",
        ...(await imageDimensions(path.resolve(path.dirname(filePath), data.heroImage))),
      }
    : null;

  articles.push({
    id: `${channel}/${slug}`,
    slug,
    title: data.title,
    description: data.description,
    bodyMarkdown: parsed.content.trimStart(),
    pubDatetime: iso(data.pubDatetime),
    modDatetime: iso(data.modDatetime),
    channel,
    topics: data.topics ?? [],
    primaryTopic: data.topics?.[0] ?? null,
    tags: data.tags ?? [],
    kind: data.kind ?? "article",
    status: data.status ?? "complete",
    draft: data.draft ?? false,
    featuredRank: data.featuredRank ?? null,
    series: data.series ?? null,
    related: data.related ?? [],
    heroImage,
    ogImage: data.ogImage
      ? `/media/articles/${channel}/${slug}/og.webp`
      : null,
    canonicalURL: data.canonicalURL ?? null,
    revisions: (data.revisions ?? []).map(revision => ({
      date: iso(revision.date),
      summary: revision.summary,
    })),
  });
}

await writeFile(
  outputPath,
  `${JSON.stringify({ version: 1, source: "src/content/posts", articles }, null, 2)}\n`,
  "utf8"
);
process.stdout.write(`Wrote ${articles.length} articles to ${outputPath}\n`);
