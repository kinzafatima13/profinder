import assert from "node:assert/strict";
import test from "node:test";
import { isItemStatus, isRequestStatus, publicRequest } from "./apply-admin";
import { isSafeObjectKey, safeDocumentName } from "./apply-storage";

test("request statuses stay on the founder allowlist", () => {
  assert.equal(isRequestStatus("awaiting_payment"), true);
  assert.equal(isRequestStatus("completed"), true);
  assert.equal(isRequestStatus("drop_table"), false);
});

test("application statuses include founder tracking values", () => {
  assert.equal(isItemStatus("submitted"), true);
  assert.equal(isItemStatus("successful"), true);
  assert.equal(isItemStatus("../secret"), false);
});

test("document names reject traversal and active content", () => {
  assert.equal(safeDocumentName("../../etc/passwd.pdf"), "passwd.pdf");
  assert.equal(safeDocumentName("notes.html"), null);
  assert.equal(safeDocumentName("photo.svg"), null);
  assert.equal(safeDocumentName("cv.pdf"), "cv.pdf");
});

test("student payloads omit founder notes and storage keys", () => {
  const safe = publicRequest({
    id: "req",
    founderNote: "Need a new passport",
    activities: [{ action: "founder_opened" }],
    documents: [{ id: "doc", name: "cv.pdf", storedName: "secret.pdf", objectKey: "apply/req/secret.pdf", storageProvider: "blob" }],
  });
  assert.equal("founderNote" in safe, false);
  assert.equal("activities" in safe, false);
  assert.deepEqual(safe.documents, [{ id: "doc", name: "cv.pdf" }]);
});

test("object keys cannot leave the private upload namespace", () => {
  assert.equal(isSafeObjectKey("local", "../dev.db", "cv.pdf"), false);
  assert.equal(isSafeObjectKey("blob", "https://public.blob.vercel-storage.com/cv.pdf", "cv.pdf"), false);
  assert.equal(isSafeObjectKey("blob", "apply/req/cv.pdf", "cv.pdf"), true);
  assert.equal(isSafeObjectKey("local", "req-1-cv.pdf", "cv.pdf"), true);
});
