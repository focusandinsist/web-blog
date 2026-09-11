import { describe, expect, it } from "vitest";
import {
  CHANNEL_IDS,
  CHANNELS,
  TECHNOLOGY_TOPIC_IDS,
  TOPICS,
} from "@/data/taxonomy";

describe("publication channels", () => {
  it("exposes the three editorial channels in home-page order", () => {
    expect(CHANNELS.map(channel => channel.id)).toEqual([
      "technology",
      "life",
      "investment",
    ]);
  });

  it("uses the same ids for runtime validation and channel definitions", () => {
    expect(CHANNELS.map(channel => channel.id)).toEqual(CHANNEL_IDS);
  });

  it("uses stable channel URLs derived from each channel id", () => {
    expect(CHANNELS.map(channel => channel.href)).toEqual([
      "/channels/technology/",
      "/channels/life/",
      "/channels/investment/",
    ]);
  });

  it("provides reader-facing names and meaningful descriptions", () => {
    expect(CHANNELS.map(channel => channel.name)).toEqual([
      "技术记录",
      "生活记录",
      "投资记录",
    ]);
    expect(CHANNELS.every(channel => channel.description.length >= 15)).toBe(
      true
    );
  });
});

describe("publication topics", () => {
  it("predefines the five durable technology topics", () => {
    expect(TECHNOLOGY_TOPIC_IDS).toEqual([
      "systems-programming",
      "concurrency-engineering",
      "realtime-systems",
      "data-systems",
      "game-technology",
    ]);
    expect(
      TOPICS.filter(topic => topic.channel === "technology").map(
        topic => topic.id
      )
    ).toEqual(TECHNOLOGY_TOPIC_IDS);
  });

  it("gives every topic a stable route and reader-facing description", () => {
    expect(TOPICS.every(topic => topic.href === `/topics/${topic.id}/`)).toBe(
      true
    );
    expect(
      TOPICS.every(topic => topic.name && topic.description.length >= 10)
    ).toBe(true);
  });
});
