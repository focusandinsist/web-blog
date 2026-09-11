import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";
import config from "@/config";
import { CHANNEL_IDS } from "@/data/taxonomy";

export const BLOG_PATH = "src/content/posts";

const posts = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: `./${BLOG_PATH}` }),
  schema: ({ image }) =>
    z
      .object({
        author: z.string().default(config.site.author),
        title: z.string().min(1),
        description: z.string().min(20).max(180),
        pubDatetime: z.date(),
        modDatetime: z.date().optional(),
        channel: z.enum(CHANNEL_IDS),
        topics: z.array(z.string()).min(1),
        tags: z.array(z.string()).default([]),
        kind: z.enum(["article", "case-study"]).default("article"),
        status: z
          .enum(["complete", "evolving", "archived"])
          .default("complete"),
        featuredRank: z.number().int().min(1).max(99).optional(),
        series: z
          .object({
            id: z.string(),
            order: z.number().int().positive(),
          })
          .optional(),
        related: z.array(z.string()).max(3).default([]),
        heroImage: image().optional(),
        heroAlt: z.string().optional(),
        draft: z.boolean().default(false),
        revisions: z
          .array(
            z.object({
              date: z.date(),
              summary: z.string().min(1),
            })
          )
          .default([]),
        featured: z.boolean().optional(),
        ogImage: image().or(z.string()).optional(),
        canonicalURL: z.string().optional(),
        hideEditPost: z.boolean().optional(),
        timezone: z.string().optional(),
      })
      .refine(data => !data.heroImage || data.heroAlt, {
        message: "设置 heroImage 时必须提供 heroAlt",
      }),
});

const pages = defineCollection({
  loader: glob({ pattern: "**/[^_]*.{md,mdx}", base: "./src/content/pages" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    ogImage: z.string().optional(),
    canonicalURL: z.string().optional(),
  }),
});

export const collections = { posts, pages };
