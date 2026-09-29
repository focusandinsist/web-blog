import { describe, expect, it } from "vitest";
import { renderRemoteMarkdown } from "@/utils/remoteMarkdown";

describe("renderRemoteMarkdown", () => {
  it("extracts headings and resolves Django media URLs", async () => {
    const rendered = await renderRemoteMarkdown(
      "# Event loop\n\n![Queue](/media/articles/queue.webp)",
      "technology/event-loop-notes",
      "https://django.example.test"
    );

    expect(rendered.headings.map(heading => heading.text)).toContain(
      "Event loop"
    );
    expect(rendered.html).toContain(
      'src="https://django.example.test/media/articles/queue.webp"'
    );
  });
});
