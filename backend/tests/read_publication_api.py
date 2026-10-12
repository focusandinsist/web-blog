import json
import os
import sys
from copy import deepcopy
from pathlib import Path
from urllib.request import urlopen


BASE_URL = os.environ.get(
    "CONTENT_API_URL", "http://127.0.0.1:8000/api/publication/v1/"
).rstrip("/")
FIXTURE = Path(__file__).resolve().parents[1] / "content" / "fixtures" / "publication_api.json"


def get_json(path):
    with urlopen(f"{BASE_URL}/{path}", timeout=5) as response:
        if response.status != 200:
            raise AssertionError(f"Unexpected API response: {response.status}")
        return json.load(response)


def main():
    articles = get_json("articles/")
    taxonomy = get_json("taxonomy/")
    health = get_json("health/")
    expected = deepcopy(json.loads(FIXTURE.read_text(encoding="utf-8")))
    origin = BASE_URL.split("/api/", 1)[0]
    for article in expected["articles"]:
        if article["heroImage"]:
            article["heroImage"]["url"] = article["heroImage"]["url"].replace(
                "http://api.example.test", origin
            )
        if article["ogImage"]:
            article["ogImage"] = article["ogImage"].replace(
                "http://api.example.test", origin
            )
    assert articles == expected["articles"]
    assert taxonomy == expected["taxonomy"]
    assert health == {"status": "ok"}
    assert all(article["draft"] is False for article in articles)
    print(f"Read {len(articles)} published articles and {len(taxonomy['topics'])} topics.")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        raise
