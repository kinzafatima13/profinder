from __future__ import annotations

import hashlib
import json
import time
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
from pathlib import Path

from .models import utc_now


class FetchError(RuntimeError):
    pass


class PoliteFetcher:
    """HTTPS-only fetcher with robots checks, per-host throttling and disk cache."""

    def __init__(
        self,
        cache_dir: str | Path = "pipeline/.cache",
        user_agent: str = "ProFinderNowAcademicResearchBot/0.1 (+https://profindernow.com)",
        min_host_interval: float = 2.5,
        timeout: float = 25.0,
    ) -> None:
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.user_agent = user_agent
        self.min_host_interval = min_host_interval
        self.timeout = timeout
        self._last_request: dict[str, float] = {}
        self._robots: dict[str, urllib.robotparser.RobotFileParser] = {}

    def _robots_for(self, base: str) -> urllib.robotparser.RobotFileParser:
        if base in self._robots:
            return self._robots[base]
        robots_url = base + "/robots.txt"
        parser = urllib.robotparser.RobotFileParser()
        parser.set_url(robots_url)
        try:
            request = urllib.request.Request(robots_url, headers={"User-Agent": self.user_agent})
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                parser.parse(response.read().decode("utf-8", errors="replace").splitlines())
        except urllib.error.HTTPError as exc:
            # A missing robots.txt is allowed; access failures other than 404 fail closed.
            if exc.code != 404:
                raise FetchError(f"Could not verify robots.txt for {base}: HTTP {exc.code}") from exc
            parser.parse(["User-agent: *", "Allow: /"])
        except Exception as exc:
            raise FetchError(f"Could not verify robots.txt for {base}: {exc}") from exc
        self._robots[base] = parser
        return parser

    def fetch(self, url: str, cache_days: int = 30) -> dict[str, str]:
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme != "https" or not parsed.hostname:
            raise FetchError("Only absolute HTTPS URLs can be fetched.")
        base = f"https://{parsed.netloc}"
        robots = self._robots_for(base)
        if not robots.can_fetch(self.user_agent, url):
            raise FetchError(f"robots.txt disallows this URL: {url}")

        key = hashlib.sha256(url.encode("utf-8")).hexdigest()
        cache_file = self.cache_dir / f"{key}.json"
        if cache_file.exists():
            cached = json.loads(cache_file.read_text(encoding="utf-8"))
            age = time.time() - float(cached.get("fetched_epoch", 0))
            if age < cache_days * 86400:
                return cached

        host = parsed.hostname
        elapsed = time.monotonic() - self._last_request.get(host, 0.0)
        if elapsed < self.min_host_interval:
            time.sleep(self.min_host_interval - elapsed)

        request = urllib.request.Request(
            url,
            headers={
                "User-Agent": self.user_agent,
                "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.5",
            },
        )
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                content_type = response.headers.get("Content-Type", "")
                body = response.read(8_000_000).decode("utf-8", errors="replace")
                result = {
                    "url": url,
                    "final_url": response.geturl(),
                    "content_type": content_type,
                    "body": body,
                    "collected_at": utc_now(),
                    "fetched_epoch": str(time.time()),
                }
        except Exception as exc:
            raise FetchError(f"Fetch failed for {url}: {exc}") from exc
        finally:
            self._last_request[host] = time.monotonic()

        cache_file.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
        return result
