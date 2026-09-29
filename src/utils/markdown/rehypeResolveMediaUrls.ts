import type { RehypePlugin } from "@astrojs/markdown-remark";

interface Options {
  mediaOrigin: string;
}

const URL_PROPERTIES = ["src", "href", "dataPswpSrc"] as const;

export const rehypeResolveMediaUrls: RehypePlugin = ({
  mediaOrigin,
}: Options) => {
  return tree => {
    const resolveNode = (node: unknown) => {
      if (!node || typeof node !== "object") return;
      const element = node as {
        type?: string;
        properties?: Record<string, unknown>;
        children?: unknown[];
      };

      if (element.type === "element" && element.properties) {
        for (const property of URL_PROPERTIES) {
          const value = element.properties[property];
          if (typeof value === "string" && value.startsWith("/media/")) {
            element.properties[property] = new URL(value, mediaOrigin).href;
          }
        }
      }

      element.children?.forEach(resolveNode);
    };

    resolveNode(tree);
  };
};
