import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  createMarkdownProcessor,
  type MarkdownHeading,
  type MarkdownRenderer,
} from "@astrojs/markdown-remark";
import {
  markdownRehypePlugins,
  markdownRemarkPlugins,
  markdownShikiConfig,
  markdownSyntaxHighlight,
} from "@/utils/markdown/options";
import { rehypeResolveMediaUrls } from "@/utils/markdown/rehypeResolveMediaUrls";

export interface RenderedRemoteMarkdown {
  html: string;
  headings: MarkdownHeading[];
}

const processors = new Map<string, Promise<MarkdownRenderer>>();

function getProcessor(mediaOrigin: string): Promise<MarkdownRenderer> {
  let processor = processors.get(mediaOrigin);
  if (!processor) {
    processor = createMarkdownProcessor({
      remarkPlugins: markdownRemarkPlugins,
      rehypePlugins: [
        ...markdownRehypePlugins.slice(0, 2),
        [rehypeResolveMediaUrls, { mediaOrigin }],
        ...markdownRehypePlugins.slice(2),
      ],
      syntaxHighlight: markdownSyntaxHighlight,
      shikiConfig: markdownShikiConfig,
    });
    processors.set(mediaOrigin, processor);
  }
  return processor;
}

export async function renderRemoteMarkdown(
  markdown: string,
  articleId: string,
  mediaOrigin: string
): Promise<RenderedRemoteMarkdown> {
  const processor = await getProcessor(mediaOrigin);
  const rendered = await processor.render(markdown, {
    fileURL: pathToFileURL(
      resolve(process.cwd(), ".remote-publication", `${articleId}.md`)
    ),
  });
  return {
    html: rendered.code,
    headings: rendered.metadata.headings,
  };
}
