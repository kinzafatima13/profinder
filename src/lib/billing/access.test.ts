import assert from "node:assert/strict";
import test from "node:test";
import { hasProAccess, mapStripeStatus } from "./access";

test("active and past due subscriptions keep Pro", () => {
  assert.equal(hasProAccess("free", { status: "ACTIVE", cancelAtPeriodEnd: false, currentPeriodEnd: null }), true);
  assert.equal(hasProAccess("free", { status: "PAST_DUE", cancelAtPeriodEnd: false, currentPeriodEnd: null }), true);
});

test("a canceled subscription does not keep Pro", () => {
  assert.equal(hasProAccess("pro", { status: "CANCELED", cancelAtPeriodEnd: false, currentPeriodEnd: new Date(Date.now() - 1000) }), false);
});

test("legacy pro without a subscription remains", () => {
  assert.equal(hasProAccess("pro", null), true);
  assert.equal(hasProAccess("free", null), false);
});

test("stripe statuses map", () => {
  assert.equal(mapStripeStatus("active"), "ACTIVE");
  assert.equal(mapStripeStatus("incomplete_expired"), "EXPIRED");
});
