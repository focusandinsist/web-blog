import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";
import {
  createArticleFile,
  renderArticleTemplate,
  validateArticleArgs,
} from "../../scripts/new-article.mjs";

const VALID_ARGS = {
  channel: "technology",
  slug: "io-backpressure",
  title: "I/O 背压记录",
  topic: "systems-programming",
};
const execFileAsync = promisify(execFile);

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map(directory => rm(directory, { recursive: true, force: true }))
  );
});

async function temporaryContentRoot() {
  const directory = await mkdtemp(path.join(tmpdir(), "article-scaffold-"));
  temporaryDirectories.push(directory);
  return directory;
}

describe("validateArticleArgs", () => {
  it("accepts each supported channel", () => {
    for (const channel of ["technology", "life", "investment"]) {
      expect(
        validateArticleArgs({
          channel,
          slug: "io-backpressure",
          title: "I/O 背压记录",
          topic: "systems-programming",
        })
      ).toEqual({
        channel,
        slug: "io-backpressure",
        title: "I/O 背压记录",
        topic: "systems-programming",
      });
    }
  });

  it.each([
    [
      {
        channel: "technology",
        slug: "../outside",
        title: "Title",
        topic: "systems-programming",
      },
      "Slug must use lowercase letters, numbers, and single hyphens.",
    ],
    [
      {
        channel: "technology",
        slug: "valid-slug",
        title: "  ",
        topic: "systems-programming",
      },
      "Title is required.",
    ],
    [
      { channel: "technology", slug: "valid-slug", title: "Title", topic: "" },
      "Topic is required.",
    ],
    [
      {
        channel: "unknown",
        slug: "valid-slug",
        title: "Title",
        topic: "systems-programming",
      },
      'Unknown channel "unknown". Expected one of: technology, life, investment.',
    ],
  ])("rejects invalid article arguments", (args, message) => {
    expect(() => validateArticleArgs(args)).toThrow(message);
  });
});

describe("renderArticleTemplate", () => {
  it("renders a publishable frontmatter shape as a local draft", () => {
    const previousTimeZone = process.env.TZ;
    process.env.TZ = "Asia/Singapore";

    try {
      const template = renderArticleTemplate(
        VALID_ARGS,
        new Date("2026-09-14T02:03:04.000Z")
      );

      expect(template).toContain('title: "I/O 背压记录"');
      expect(template).toContain(
        'description: "请在发布前填写 20 到 180 个字符的文章摘要。"'
      );
      expect(template).toContain("pubDatetime: 2026-09-14T10:03:04+08:00");
      expect(template).toContain("channel: technology");
      expect(template).toContain('topics: ["systems-programming"]');
      expect(template).toContain("tags: []");
      expect(template).toContain("draft: true");
      expect(template).toContain("\n## 问题\n");
      expect(template.endsWith("\n")).toBe(true);
    } finally {
      if (previousTimeZone === undefined) delete process.env.TZ;
      else process.env.TZ = previousTimeZone;
    }
  });
});

describe("createArticleFile", () => {
  it("creates a draft in the requested channel under a supplied content root", async () => {
    const contentRoot = await temporaryContentRoot();
    const filePath = await createArticleFile(VALID_ARGS, {
      contentRoot,
      now: new Date("2026-09-14T02:03:04.000Z"),
    });

    expect(filePath).toBe(
      path.join(contentRoot, "technology", "io-backpressure.md")
    );
    expect(await readFile(filePath, "utf8")).toContain("draft: true");
  });

  it("refuses to overwrite an existing article", async () => {
    const contentRoot = await temporaryContentRoot();
    const filePath = await createArticleFile(VALID_ARGS, { contentRoot });

    await expect(
      createArticleFile(
        { ...VALID_ARGS, title: "Changed title" },
        { contentRoot }
      )
    ).rejects.toThrow(`Article already exists: ${filePath}`);
    expect(await readFile(filePath, "utf8")).toContain('title: "I/O 背压记录"');
    expect(await readFile(filePath, "utf8")).not.toContain("Changed title");
  });
});

describe("new article CLI", () => {
  it("creates an article below the current project without touching the repository", async () => {
    const projectRoot = await temporaryContentRoot();
    const scriptPath = path.resolve("scripts/new-article.mjs");

    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [
        scriptPath,
        "--",
        "--channel",
        "life",
        "--slug",
        "question-led-reading",
        "--title",
        "带着问题阅读",
        "--topic",
        "reading",
      ],
      { cwd: projectRoot }
    );
    const filePath = path.join(
      projectRoot,
      "src",
      "content",
      "posts",
      "life",
      "question-led-reading.md"
    );

    expect(stderr).toBe("");
    expect(stdout).toContain(`Created ${filePath}`);
    expect(await readFile(filePath, "utf8")).toContain("draft: true");
  });
});
