export const CHANNEL_IDS = ["technology", "life", "investment"] as const;

export type ChannelId = (typeof CHANNEL_IDS)[number];

export type ChannelAccent = "signal" | "warm" | "value";

export const TECHNOLOGY_TOPIC_IDS = [
  "systems-programming",
  "concurrency-engineering",
  "realtime-systems",
  "data-systems",
  "game-technology",
] as const;

export interface ChannelDefinition {
  id: ChannelId;
  name: string;
  description: string;
  href: `/channels/${ChannelId}/`;
  accent: ChannelAccent;
}

export interface TopicDefinition {
  id: string;
  name: string;
  description: string;
  channel: ChannelId;
  href: `/topics/${string}/`;
}

export const CHANNELS: readonly ChannelDefinition[] = [
  {
    id: "technology",
    name: "技术记录",
    description: "系统、并发、协议、存储与游戏工程中的判断和取舍。",
    href: "/channels/technology/",
    accent: "signal",
  },
  {
    id: "life",
    name: "生活记录",
    description: "阅读、体验和十年开发生活之外的观察与复盘。",
    href: "/channels/life/",
    accent: "warm",
  },
  {
    id: "investment",
    name: "投资记录",
    description: "记录假设、证据、过程与复盘，不构成任何投资建议。",
    href: "/channels/investment/",
    accent: "value",
  },
] as const;

export const TOPICS: readonly TopicDefinition[] = [
  {
    id: "systems-programming",
    name: "系统编程",
    description: "Linux、网络、内存与输入输出边界中的工程实践。",
    channel: "technology",
    href: "/topics/systems-programming/",
  },
  {
    id: "concurrency-engineering",
    name: "并发工程",
    description: "高并发系统的性能、可靠性与容量治理。",
    channel: "technology",
    href: "/topics/concurrency-engineering/",
  },
  {
    id: "realtime-systems",
    name: "实时系统",
    description: "即时通信、协议、在线状态与消息投递。",
    channel: "technology",
    href: "/topics/realtime-systems/",
  },
  {
    id: "data-systems",
    name: "数据系统",
    description: "数据库、缓存、存储与恢复路径的设计取舍。",
    channel: "technology",
    href: "/topics/data-systems/",
  },
  {
    id: "game-technology",
    name: "游戏技术",
    description: "引擎、游戏服务器与实时同步的工程记录。",
    channel: "technology",
    href: "/topics/game-technology/",
  },
  {
    id: "reading",
    name: "阅读方法",
    description: "围绕真实问题组织阅读、笔记与实践。",
    channel: "life",
    href: "/topics/reading/",
  },
  {
    id: "reflection",
    name: "个人复盘",
    description: "用事实和行动回看工作与日常生活。",
    channel: "life",
    href: "/topics/reflection/",
  },
  {
    id: "observation",
    name: "日常观察",
    description: "记录生活现场中值得持续留意的变化。",
    channel: "life",
    href: "/topics/observation/",
  },
  {
    id: "decision-making",
    name: "投资决策",
    description: "保留假设、证据、失效条件与决策过程。",
    channel: "investment",
    href: "/topics/decision-making/",
  },
  {
    id: "risk-management",
    name: "风险管理",
    description: "从可承受损失出发记录仓位与期限约束。",
    channel: "investment",
    href: "/topics/risk-management/",
  },
  {
    id: "research",
    name: "证据研究",
    description: "区分事实、推断和预测，主动寻找反证。",
    channel: "investment",
    href: "/topics/research/",
  },
] as const;
