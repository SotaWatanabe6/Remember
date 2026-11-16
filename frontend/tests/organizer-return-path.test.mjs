import assert from "node:assert/strict";
import { test } from "node:test";
import { getOrganizerReturnPath } from "../src/lib/organizerReturnPath.mjs";

test("login returns to the requested organizer page with its query and fragment", () => {
  const path = "/memorial/example/manage?tab=archive#photos";
  assert.equal(getOrganizerReturnPath(path), path);
  assert.equal(getOrganizerReturnPath("/memorial/create"), "/memorial/create");
});

test("login falls back to the dashboard for external, malformed, and public destinations", () => {
  for (const path of [
    null,
    "javascript:alert(1)",
    "//external.example/dashboard",
    "/\\external.example/dashboard",
    "/\\[",
    "/memorial/example/manage/%2e%2e/%2e%2e/%2e%2e/about",
    "/contribute/example",
  ]) {
    assert.equal(getOrganizerReturnPath(path), "/dashboard", String(path));
  }
});
