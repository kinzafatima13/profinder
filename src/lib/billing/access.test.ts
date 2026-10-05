import assert from "node:assert/strict";
import test from "node:test";
import { hasProAccess, mapStripeStatus } from "./access";

test("active and past due subscriptions keep Pro", () => {
  assert.equal(hasProAccess({ status: "ACTIVE", cancelAtPeriodEnd: false, currentPeriodEnd: null }), true);
  assert.equal(hasProAccess({ status: "PAST_DUE", cancelAtPeriodEnd: false, currentPeriodEnd: null }), true);
});

test("a canceled subscription does not keep Pro after the period", () => {
  assert.equal(hasProAccess({ status: "CANCELED", cancelAtPeriodEnd: false, currentPeriodEnd: new Date(Date.now() - 1000) }), false);
});

test("canceling keeps Pro only until the paid period ends", () => {
  assert.equal(hasProAccess({ status: "CANCELED", cancelAtPeriodEnd: true, currentPeriodEnd: new Date(Date.now() + 86400000) }), true);
  assert.equal(hasProAccess({ status: "ACTIVE", cancelAtPeriodEnd: true, currentPeriodEnd: new Date(Date.now() + 86400000) }), true);
});

test("a plan flag without a subscription is not Pro", () => {
  assert.equal(hasProAccess(null), false);
});

test("stripe statuses map", () => {
  assert.equal(mapStripeStatus("active"), "ACTIVE");
  assert.equal(mapStripeStatus("incomplete_expired"), "EXPIRED");
});
