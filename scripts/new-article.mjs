import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const CHANNELS = ["technology", "life", "investment"];

function pad(value) {
  return String(value).padStart(2, "0");
}

function formatLocalDateTime(date) {
  const offsetMinutes = -date.getTimezoneOffset();
  const offsetSign = offsetMinutes >= 0 ? "+" : "-";
  const absoluteOffset = Math.abs(offsetMinutes);
  const offset = `${offsetSign}${pad(Math.floor(absoluteOffset / 60))}:${pad(absoluteOffset % 60)}`;

  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`,
    offset,
  ].join("");
}

export function validateArticleArgs(args) {
  const article = {
    channel: String(args.channel ?? "").trim(),
    slug: String(args.slug ?? "").trim(),
    title: String(args.title ?? "").trim(),
    topic: String(args.topic ?? "").trim(),
  };

  if (!CHANNELS.includes(article.channel)) {
    throw new Error(
      `Unknown channel "${article.channel}". Expected one of: ${CHANNELS.join(", ")}.`
    );
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(article.slug)) {
    throw new Error(
      "Slug must use lowercase letters, numbers, and single hyphens."
    );
  }
  if (!article.title) {
    throw new Error("Title is required.");
  }
  if (!article.topic) {
    throw new Error("Topic is required.");
  }

  return article;
}

export function renderArticleTemplate(args, now = new Date()) {
  const article = validateArticleArgs(args);

  return `---
title: ${JSON.stringify(article.title)}
description: "请在发布前填写 20 到 180 个字符的文章摘要。"
pubDatetime: ${formatLocalDateTime(now)}
channel: ${article.channel}
topics: [${JSON.stringify(article.topic)}]
tags: []
draft: true
---

## 问题

正文内容。

## 结论

正文内容。
`;
}

export async function createArticleFile(args, options = {}) {
  const article = validateArticleArgs(args);
  const contentRoot = options.contentRoot ?? path.resolve("src/content/posts");
  const now = options.now ?? new Date();
  const channelDirectory = path.join(contentRoot, article.channel);
  const filePath = path.join(channelDirectory, `${article.slug}.md`);

  await mkdir(channelDirectory, { recursive: true });
  try {
    await writeFile(filePath, renderArticleTemplate(article, now), {
      encoding: "utf8",
      flag: "wx",
    });
  } catch (error) {
    if (error && typeof error === "object" && error.code === "EEXIST") {
      throw new Error(`Article already exists: ${filePath}`, { cause: error });
    }
    throw error;
  }

  return filePath;
}

function parseCliArgs(argv) {
  const args = {};
  const supportedFlags = new Set(["channel", "slug", "title", "topic"]);
  const values = argv[0] === "--" ? argv.slice(1) : argv;

  for (let index = 0; index < values.length; index += 2) {
    const flag = values[index];
    const value = values[index + 1];
    const name = flag?.startsWith("--") ? flag.slice(2) : "";
    if (!supportedFlags.has(name) || value === undefined) {
      throw new Error(`Invalid argument: ${flag ?? ""}`);
    }
    args[name] = value;
  }

  return args;
}

async function runCli(argv) {
  try {
    const filePath = await createArticleFile(parseCliArgs(argv));
    process.stdout.write(`Created ${filePath}\n`);
  } catch (error) {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exitCode = 1;
  }
}

const isDirectExecution =
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectExecution) {
  runCli(process.argv.slice(2));
}
