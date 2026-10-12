function visitChildren(node) {
  if (!node || !Array.isArray(node.children)) return;

  node.children = node.children.map(child => {
    if (
      child.type === "element" &&
      child.tagName === "p" &&
      child.children?.length === 1
    ) {
      const image = child.children[0];
      const caption = image?.properties?.title;
      if (image?.type === "element" && image.tagName === "img" && caption) {
        const source = image.properties.src;
        delete image.properties.title;

        return {
          type: "element",
          tagName: "figure",
          properties: {},
          children: [
            {
              type: "element",
              tagName: "a",
              properties: {
                href: source,
                dataPswpSrc: source,
                className: ["article-zoom"],
              },
              children: [image],
            },
            {
              type: "element",
              tagName: "figcaption",
              properties: {},
              children: [{ type: "text", value: String(caption) }],
            },
          ],
        };
      }
    }

    visitChildren(child);
    return child;
  });
}

export function rehypeFigureImages() {
  return tree => visitChildren(tree);
}
