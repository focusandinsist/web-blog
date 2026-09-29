import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const baseUrl = process.argv[2] ?? "http://127.0.0.1:8000/api/publication/v1";
const apiOrigin = new URL(baseUrl).origin;
const fixturePath = fileURLToPath(
  new URL(
    "../../backend/content/fixtures/publication_api.json",
    import.meta.url
  )
);
const fixture = JSON.parse(await readFile(fixturePath, "utf8"));
const [articlesResponse, taxonomyResponse, healthResponse] = await Promise.all([
  fetch(`${baseUrl}/articles/`),
  fetch(`${baseUrl}/taxonomy/`),
  fetch(`${baseUrl}/health/`),
]);

for (const response of [articlesResponse, taxonomyResponse, healthResponse]) {
  assert.equal(
    response.status,
    200,
    `Unexpected API response: ${response.status}`
  );
}

const articles = await articlesResponse.json();
const taxonomy = await taxonomyResponse.json();
const health = await healthResponse.json();
const expected = structuredClone(fixture);
for (const article of expected.articles) {
  if (article.heroImage) {
    article.heroImage.url = article.heroImage.url.replace(
      "http://api.example.test",
      apiOrigin
    );
  }
  if (article.ogImage) {
    article.ogImage = article.ogImage.replace(
      "http://api.example.test",
      apiOrigin
    );
  }
}

assert.deepEqual(articles, expected.articles);
assert.deepEqual(taxonomy, expected.taxonomy);
assert.deepEqual(health, { status: "ok" });
assert(articles.every(article => article.draft === false));
const heroImage = articles.find(article => article.heroImage)?.heroImage;
assert(heroImage, "Expected at least one published article with a hero image.");
const imageResponse = await fetch(heroImage.url);
assert.equal(imageResponse.status, 200, "Hero image URL did not resolve.");
process.stdout.write(
  `Read ${articles.length} published articles and ${taxonomy.topics.length} topics.\n`
);
