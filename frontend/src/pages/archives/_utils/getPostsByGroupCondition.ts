import type { PublishedArticleEntry } from "@/utils/content";

type GroupKey = string | number | symbol;
type GroupFunction<T> = (item: T, index?: number) => GroupKey;

export function getPostsByGroupCondition(
  posts: PublishedArticleEntry[],
  groupFunction: GroupFunction<PublishedArticleEntry>
) {
  const result: Record<GroupKey, PublishedArticleEntry[]> = {};

  for (let i = 0; i < posts.length; i++) {
    const item = posts[i];
    const groupKey = groupFunction(item, i);

    if (!result[groupKey]) {
      result[groupKey] = [];
    }

    result[groupKey].push(item);
  }

  return result;
}
