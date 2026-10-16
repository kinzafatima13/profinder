import assert from "node:assert/strict";
import { test } from "node:test";
import { NextRequest } from "next/server";
import { dynamic, GET, runtime } from "./route";

test("keeps live search request-time and on the Node.js runtime", () => {
  assert.equal(dynamic, "force-dynamic");
  assert.equal(runtime, "nodejs");
});

test("returns empty results for short queries without calling OpenAlex", async () => {
  const response = await GET(new NextRequest("http://localhost/api/openalex-search?q=a"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.results, []);
});

test("returns empty results for empty query", async () => {
  const response = await GET(new NextRequest("http://localhost/api/openalex-search"));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.deepEqual(body.results, []);
});
