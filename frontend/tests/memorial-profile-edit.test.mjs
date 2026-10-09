import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  canEditMemorialProfile,
  combineSubjectName,
  memorialProfileFormValues,
  splitSubjectName,
} from "../src/lib/memorialProfile.mjs";

test("profile edit lock follows memorial generation status", () => {
  assert.equal(canEditMemorialProfile("collecting"), true);
  assert.equal(canEditMemorialProfile("generating"), true);
  assert.equal(canEditMemorialProfile("complete"), false);
  assert.equal(canEditMemorialProfile("COMPLETE"), false);
});

test("profile values map between the stored subject and editable fields", () => {
  assert.deepEqual(splitSubjectName("John Michael Smith"), {
    firstName: "John",
    lastName: "Michael Smith",
  });
  assert.equal(combineSubjectName(" John ", " Michael Smith "), "John Michael Smith");
  assert.deepEqual(
    memorialProfileFormValues({
      subject_name: "John Smith",
      nickname: "Johnny",
      date_of_birth: "1940-02-03",
      date_of_passing: "2026-04-05",
      biography: "A full life.",
      cover_photo_url: "https://example.com/john.jpg",
    }),
    {
      firstName: "John",
      lastName: "Smith",
      nickName: "Johnny",
      date_of_birth: "1940-02-03",
      date_of_passing: "2026-04-05",
      briefBiography: "A full life.",
      photoPreview: "https://example.com/john.jpg",
    },
  );
});

test("settings route reuses the memorial form and the dashboard gates its edit link", () => {
  const settingsPage = readFileSync(
    new URL("../src/app/(organizer)/memorial/[id]/manage/settings/page.jsx", import.meta.url),
    "utf8",
  );
  const managePage = readFileSync(
    new URL("../src/app/(organizer)/memorial/[id]/manage/page.jsx", import.meta.url),
    "utf8",
  );
  const profileForm = readFileSync(
    new URL("../src/components/memorial/MemorialCreateForm.jsx", import.meta.url),
    "utf8",
  );

  assert.match(settingsPage, /mode="edit"/);
  assert.match(settingsPage, /Edit memorial details/);
  assert.match(settingsPage, /router\.replace\(backHref\)/);
  assert.match(managePage, /!generated && canEditMemorialProfile/);
  assert.match(managePage, /manage\/settings/);
  assert.match(profileForm, /if \(!isEdit \|\| remembered\.photo\)/);
});
