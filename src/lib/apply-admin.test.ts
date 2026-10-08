import assert from "node:assert/strict";
import test from "node:test";
import { isItemStatus, isRequestStatus } from "./apply-admin";
import { safeDocumentName } from "./apply-storage";

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
