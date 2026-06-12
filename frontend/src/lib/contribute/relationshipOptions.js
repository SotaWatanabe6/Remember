export const CONTRIBUTOR_RELATIONSHIP_OTHER = "Other";

export const CONTRIBUTOR_RELATIONSHIP_TOP_LEVEL_OPTIONS = [
  "Family",
  "Friend",
  "Colleague",
  CONTRIBUTOR_RELATIONSHIP_OTHER,
];

export const CONTRIBUTOR_RELATIONSHIP_FAMILY_OPTIONS = [
  "Parent",
  "Child",
  "Sibling",
  "Cousin",
  "Aunt/Uncle",
  "Grandchildren",
];

export const CONTRIBUTOR_RELATIONSHIP_OPTIONS = [
  ...CONTRIBUTOR_RELATIONSHIP_FAMILY_OPTIONS,
  "Friend",
  "Colleague",
  CONTRIBUTOR_RELATIONSHIP_OTHER,
];
