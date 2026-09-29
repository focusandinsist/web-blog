import rehypeCallouts from "rehype-callouts";
import rehypeMermaid from "rehype-mermaid";
import remarkCollapse from "remark-collapse";
import remarkToc from "remark-toc";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import {
  transformerCodeMeta,
  transformerFileName,
} from "../transformers/fileName";
import { rehypeFigureImages } from "../transformers/figureImages";
import type {
  RehypePlugins,
  RemarkPlugins,
  ShikiConfig,
  SyntaxHighlightConfig,
} from "@astrojs/markdown-remark";

export const markdownRemarkPlugins: RemarkPlugins = [
  remarkToc,
  [remarkCollapse, { test: "Table of contents" }],
];

export const markdownRehypePlugins: RehypePlugins = [
  rehypeCallouts,
  rehypeFigureImages,
  [rehypeMermaid, { strategy: "inline-svg" }],
];

export const markdownSyntaxHighlight: SyntaxHighlightConfig = {
  type: "shiki" as const,
  excludeLangs: ["mermaid"],
};

export const markdownShikiConfig: ShikiConfig = {
  themes: { light: "min-light", dark: "night-owl" },
  defaultColor: false,
  wrap: false,
  transformers: [
    transformerFileName({ style: "v2", hideDot: false }),
    transformerCodeMeta(),
    transformerNotationHighlight(),
    transformerNotationWordHighlight(),
    transformerNotationDiff({ matchAlgorithm: "v3" }),
  ],
};
