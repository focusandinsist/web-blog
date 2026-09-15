import { describe, expect, it } from "vitest";
import {
  validateContentIntegrity,
  type ContentValidationEntry,
} from "@/utils/contentValidation";

function entry(
  id: string,
  overrides: Partial<ContentValidationEntry> = {}
): ContentValidationEntry {
  return {
    id,
    filePath: `${id}.md`,
    data: {
      channel: "technology",
      topics: ["systems-programming"],
      related: [],
      draft: false,
    },
    ...overrides,
  };
}

describe("validateContentIntegrity", () => {
  it("reports when the file directory does not match its channel", () => {
    const issues = validateContentIntegrity([
      entry("life/mismatched", {
        data: {
          channel: "technology",
          topics: ["systems-programming"],
          related: [],
          draft: false,
        },
      }),
    ]);

    expect(issues).toEqual([
      {
        articleId: "life/mismatched",
        field: "channel",
        message:
          'Top-level directory "life" does not match channel "technology".',
      },
    ]);
  });

  it("reports every unknown topic", () => {
    const issues = validateContentIntegrity([
      entry("technology/unknown-topics", {
        data: {
          channel: "technology",
          topics: ["missing-one", "systems-programming", "missing-two"],
          related: [],
          draft: false,
        },
      }),
    ]);

    expect(issues).toEqual([
      {
        articleId: "technology/unknown-topics",
        field: "topics",
        message: 'Unknown topic "missing-one".',
      },
      {
        articleId: "technology/unknown-topics",
        field: "topics",
        message: 'Unknown topic "missing-two".',
      },
    ]);
  });

  it("reports a topic assigned to a different channel", () => {
    const issues = validateContentIntegrity([
      entry("life/cross-channel-topic", {
        data: {
          channel: "life",
          topics: ["systems-programming"],
          related: [],
          draft: false,
        },
      }),
    ]);

    expect(issues).toEqual([
      {
        articleId: "life/cross-channel-topic",
        field: "topics",
        message:
          'Topic "systems-programming" belongs to channel "technology", not "life".',
      },
    ]);
  });

  it("reports related articles that are missing or drafts", () => {
    const issues = validateContentIntegrity([
      entry("technology/source", {
        data: {
          channel: "technology",
          topics: ["systems-programming"],
          related: ["technology/missing", "technology/draft"],
          draft: false,
        },
      }),
      entry("technology/draft", {
        data: {
          channel: "technology",
          topics: ["systems-programming"],
          related: [],
          draft: true,
        },
      }),
    ]);

    expect(issues).toEqual([
      {
        articleId: "technology/source",
        field: "related",
        message: 'Related article "technology/missing" does not exist.',
      },
      {
        articleId: "technology/source",
        field: "related",
        message: 'Related article "technology/draft" is a draft.',
      },
    ]);
  });

  it("reports an article related to itself", () => {
    const issues = validateContentIntegrity([
      entry("technology/self", {
        data: {
          channel: "technology",
          topics: ["systems-programming"],
          related: ["technology/self"],
          draft: false,
        },
      }),
    ]);

    expect(issues).toEqual([
      {
        articleId: "technology/self",
        field: "related",
        message: "Article cannot relate to itself.",
      },
    ]);
  });

  it("reports duplicate order values within a series", () => {
    const issues = validateContentIntegrity([
      entry("technology/part-one", {
        data: {
          channel: "technology",
          topics: ["systems-programming"],
          related: [],
          series: { id: "event-loop", order: 1 },
          draft: false,
        },
      }),
      entry("technology/part-two", {
        data: {
          channel: "technology",
          topics: ["systems-programming"],
          related: [],
          series: { id: "event-loop", order: 1 },
          draft: false,
        },
      }),
    ]);

    expect(issues).toEqual([
      {
        articleId: "technology/part-two",
        field: "series",
        message: 'Series "event-loop" contains duplicate order 1.',
      },
    ]);
  });

  it("reports series order gaps", () => {
    const issues = validateContentIntegrity([
      entry("technology/part-one", {
        data: {
          channel: "technology",
          topics: ["systems-programming"],
          related: [],
          series: { id: "event-loop", order: 1 },
          draft: false,
        },
      }),
      entry("technology/part-three", {
        data: {
          channel: "technology",
          topics: ["systems-programming"],
          related: [],
          series: { id: "event-loop", order: 3 },
          draft: false,
        },
      }),
    ]);

    expect(issues).toEqual([
      {
        articleId: "technology/part-three",
        field: "series",
        message:
          'Series "event-loop" orders must be consecutive from 1; received 1, 3.',
      },
    ]);
  });
});
