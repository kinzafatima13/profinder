# Live university HTML fixtures

These fixtures are sanitized DOM fragments captured from direct HTTPS responses from the official university hosts on 2026-11-02. They preserve the relevant visible text and table span structure while omitting unrelated page chrome.

- `shmtu.html`: representative rows from Shanghai Maritime University's 2027 international master's catalog. It exercises bilingual headers, rowspans, spacer rows, and canonical program fields.
- `yangtze_scholarship.html`: Yangtze University's scholarship announcement title and its embedded PDF viewer reference. The HTML response does not contain the announcement body as text; the substantive notice is in the linked PDF.
- `manifest.json`: source URLs, response status, fixture hashes, and limitations.

CDUT is intentionally marked blocked in the manifest: both official CDUT hosts returned HTTP 412 to direct requests, including requests with browser-like headers and a homepage-cookie attempt. Search indexing can expose the page text, but that is not a saved live HTML response and is not treated as a live extraction fixture.

The Yangtze postgraduate catalog PDF was downloaded to verify its format (24 MB) but is not committed; PDF parsing is not implemented yet. No guessed records or selectors were added to the live registry.
