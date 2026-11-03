from __future__ import annotations

import email.utils
import hashlib
import json
import time
import urllib.error
import urllib.parse
import urllib.request
import urllib.robotparser
from datetime import datetime, timezone
from pathlib import Path
from typing import Callable

from .models import utc_now


class FetchError(RuntimeError):
    pass


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class PoliteFetcher:
    """HTTPS-only fetcher with per-hop robots checks, throttling, retries and cache."""

    REDIRECT_CODES = {301, 302, 303, 307, 308}
    RETRYABLE_CODES = {429, 500, 502, 503, 504}

    def __init__(
        self,
        cache_dir: str | Path = "pipeline/.cache",
        user_agent: str = "ProFinderNowAcademicResearchBot/0.1 (+https://profindernow.com)",
        min_host_interval: float = 2.5,
        timeout: float = 25.0,
        max_retries: int = 3,
        max_redirects: int = 5,
        sleep: Callable[[float], None] = time.sleep,
    ) -> None:
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.user_agent = user_agent
        self.min_host_interval = min_host_interval
        self.timeout = timeout
        self.max_retries = max_retries
        self.max_redirects = max_redirects
        self._sleep = sleep
        self._last_request: dict[str, float] = {}
        self._robots: dict[str, urllib.robotparser.RobotFileParser] = {}
        self._opener = urllib.request.build_opener(_NoRedirect())

    @staticmethod
    def _origin(url: str) -> str:
        parsed = urllib.parse.urlparse(url)
        if parsed.scheme != "https" or not parsed.hostname:
            raise FetchError("Only absolute HTTPS URLs can be fetched.")
        if parsed.username or parsed.password:
            raise FetchError("URLs containing credentials are not allowed.")
        return f"https://{parsed.netloc}"

    def _throttle(self, url: str) -> None:
        host = urllib.parse.urlparse(url).hostname or ""
        elapsed = time.monotonic() - self._last_request.get(host, 0.0)
        if elapsed < self.min_host_interval:
            self._sleep(self.min_host_interval - elapsed)

    @staticmethod
    def _retry_after(headers) -> float | None:
        value = headers.get("Retry-After") if headers else None
        if not value:
            return None
        try:
            return max(0.0, float(value))
        except (TypeError, ValueError):
            try:
                parsed = email.utils.parsedate_to_datetime(value)
                if parsed.tzinfo is None:
                    parsed = parsed.replace(tzinfo=timezone.utc)
                return max(0.0, (parsed - datetime.now(timezone.utc)).total_seconds())
            except (TypeError, ValueError, OverflowError):
                return None

    def _request(self, url: str, headers: dict[str, str]):
        """Make one URL request, retrying only rate limits and transient server errors."""
        for attempt in range(self.max_retries + 1):
            self._throttle(url)
            request = urllib.request.Request(url, headers=headers)
            try:
                response = self._opener.open(request, timeout=self.timeout)
                self._last_request[urllib.parse.urlparse(url).hostname or ""] = time.monotonic()
                return response
            except urllib.error.HTTPError as exc:
                self._last_request[urllib.parse.urlparse(url).hostname or ""] = time.monotonic()
                if exc.code in self.RETRYABLE_CODES and attempt < self.max_retries:
                    delay = self._retry_after(exc.headers)
                    if delay is None:
                        delay = min(30.0, 2.0 ** attempt)
                    exc.close()
                    self._sleep(delay)
                    continue
                return exc
            except (urllib.error.URLError, TimeoutError, ConnectionError) as exc:
                self._last_request[urllib.parse.urlparse(url).hostname or ""] = time.monotonic()
                if attempt >= self.max_retries:
                    raise FetchError(f"Request failed for {url} after {attempt + 1} attempts: {exc}") from exc
                self._sleep(min(30.0, 2.0 ** attempt))
        raise FetchError(f"Request failed for {url}")

    def _open_following_redirects(self, url: str, headers: dict[str, str]):
        current = url
        for redirect_count in range(self.max_redirects + 1):
            self._origin(current)  # Reject HTTP downgrade and malformed redirect targets.
            response = self._request(current, headers)
            if response.code not in self.REDIRECT_CODES:
                return response, current
            location = response.headers.get("Location")
            response.close()
            if not location:
                raise FetchError(f"Redirect from {current} did not include a Location header.")
            if redirect_count >= self.max_redirects:
                raise FetchError(f"Too many redirects while fetching {url}")
            current = urllib.parse.urljoin(current, location)
        raise FetchError(f"Too many redirects while fetching {url}")

    def _robots_for(self, base: str) -> urllib.robotparser.RobotFileParser:
        if base in self._robots:
            return self._robots[base]
        robots_url = base + "/robots.txt"
        parser = urllib.robotparser.RobotFileParser()
        parser.set_url(robots_url)
        response, final_url = self._open_following_redirects(
            robots_url, {"User-Agent": self.user_agent}
        )
        try:
            if response.code == 404:
                parser.parse(["User-agent: *", "Allow: /"])
            elif response.code in self.RETRYABLE_CODES or response.code >= 400:
                raise FetchError(f"Could not verify robots.txt for {base}: HTTP {response.code}")
            else:
                parser.parse(response.read().decode("utf-8", errors="replace").splitlines())
        finally:
            response.close()
        self._robots[base] = parser
        return parser

    def fetch(self, url: str, cache_days: int = 30) -> dict[str, str]:
        self._origin(url)
        key = hashlib.sha256(url.encode("utf-8")).hexdigest()
        cache_file = self.cache_dir / f"{key}.json"
        if cache_file.exists():
            cached = json.loads(cache_file.read_text(encoding="utf-8"))
            age = time.time() - float(cached.get("fetched_epoch", 0))
            if age < cache_days * 86400:
                return cached

        current = url
        headers = {
            "User-Agent": self.user_agent,
            "Accept": "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.5",
        }
        for redirect_count in range(self.max_redirects + 1):
            base = self._origin(current)
            robots = self._robots_for(base)
            if not robots.can_fetch(self.user_agent, current):
                raise FetchError(f"robots.txt disallows this URL: {current}")

            response = self._request(current, headers)
            if response.code in self.REDIRECT_CODES:
                location = response.headers.get("Location")
                response.close()
                if not location:
                    raise FetchError(f"Redirect from {current} did not include a Location header.")
                if redirect_count >= self.max_redirects:
                    raise FetchError(f"Too many redirects while fetching {url}")
                current = urllib.parse.urljoin(current, location)
                self._origin(current)
                # The next loop checks robots.txt for the destination host before requesting it.
                continue
            try:
                if response.code >= 400:
                    raise FetchError(f"Fetch failed for {current}: HTTP {response.code}")
                content_type = response.headers.get("Content-Type", "")
                body = response.read(8_000_000).decode("utf-8", errors="replace")
                result = {
                    "url": url,
                    "final_url": current,
                    "content_type": content_type,
                    "body": body,
                    "collected_at": utc_now(),
                    "fetched_epoch": str(time.time()),
                }
            finally:
                response.close()
            cache_file.write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
            return result
        raise FetchError(f"Too many redirects while fetching {url}")


    def fetch_pdf(
        self,
        url: str,
        cache_days: int = 30,
        max_bytes: int = 20_000_000,
    ) -> dict:
        """Fetch a bounded PDF using the same robots, redirect, retry and throttle rules."""
        self._origin(url)
        if max_bytes < 5:
            raise FetchError("PDF size limit must be at least 5 bytes.")
        key = hashlib.sha256(url.encode("utf-8")).hexdigest()
        cache_file = self.cache_dir / f"{key}.pdf"
        metadata_file = self.cache_dir / f"{key}.pdf.json"
        if cache_file.exists() and metadata_file.exists():
            metadata = json.loads(metadata_file.read_text(encoding="utf-8"))
            age = time.time() - float(metadata.get("fetched_epoch", 0))
            if age < cache_days * 86400:
                cached_bytes = cache_file.read_bytes()
                if cached_bytes.startswith(b"%PDF-"):
                    return {**metadata, "pdf_bytes": cached_bytes}

        current = url
        headers = {
            "User-Agent": self.user_agent,
            "Accept": "application/pdf,application/octet-stream;q=0.9,*/*;q=0.5",
        }
        for redirect_count in range(self.max_redirects + 1):
            base = self._origin(current)
            robots = self._robots_for(base)
            if not robots.can_fetch(self.user_agent, current):
                raise FetchError(f"robots.txt disallows this URL: {current}")
            response = self._request(current, headers)
            if response.code in self.REDIRECT_CODES:
                location = response.headers.get("Location")
                response.close()
                if not location:
                    raise FetchError(f"Redirect from {current} did not include a Location header.")
                if redirect_count >= self.max_redirects:
                    raise FetchError(f"Too many redirects while fetching {url}")
                current = urllib.parse.urljoin(current, location)
                self._origin(current)
                continue
            try:
                if response.code >= 400:
                    raise FetchError(f"PDF fetch failed for {current}: HTTP {response.code}")
                content_type = response.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
                body = response.read(max_bytes + 1)
                if len(body) > max_bytes:
                    raise FetchError(f"PDF exceeds the configured {max_bytes}-byte size limit.")
                if not body.startswith(b"%PDF-"):
                    raise FetchError(
                        f"Response from {current} is not a valid PDF signature (Content-Type: {content_type or 'unknown'})."
                    )
                if content_type not in {"application/pdf", "application/octet-stream", ""}:
                    raise FetchError(f"Unexpected PDF Content-Type from {current}: {content_type}")
                metadata = {
                    "url": url,
                    "final_url": current,
                    "content_type": content_type or "application/pdf",
                    "collected_at": utc_now(),
                    "fetched_epoch": str(time.time()),
                }
            finally:
                response.close()
            cache_file.write_bytes(body)
            metadata_file.write_text(json.dumps(metadata, ensure_ascii=False), encoding="utf-8")
            return {**metadata, "pdf_bytes": body}
        raise FetchError(f"Too many redirects while fetching {url}")
