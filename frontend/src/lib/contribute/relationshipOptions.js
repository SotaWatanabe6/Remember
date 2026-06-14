// frontend/src/lib/contribute/relationshipOptions.js

export const CONTRIBUTOR_RELATIONSHIP_FAMILY = "Family";
export const CONTRIBUTOR_RELATIONSHIP_FRIEND = "Friend";
export const CONTRIBUTOR_RELATIONSHIP_COLLEAGUE = "Colleague";
export const CONTRIBUTOR_RELATIONSHIP_OTHER = "Other";

// Top-level relationship types — shown as the four cards on the main
// "Who were you to {name}?" page. These map directly to the relationship
// colors used on the viewer's constellation page (Family/Friend/Colleague/Other).
export const CONTRIBUTOR_RELATIONSHIP_OPTIONS = [
  CONTRIBUTOR_RELATIONSHIP_FAMILY,
  CONTRIBUTOR_RELATIONSHIP_FRIEND,
  CONTRIBUTOR_RELATIONSHIP_COLLEAGUE,
  CONTRIBUTOR_RELATIONSHIP_OTHER,
];

// Sub-types shown only when "Family" is selected — saved as relationship_label.
export const CONTRIBUTOR_FAMILY_RELATIONSHIP_OPTIONS = [
  "Parent",
  "Child",
  "Sibling",
  "Cousin",
  "Aunt/Uncle",
  "Grandchildren",
];

// Relationship types that require a relationship_label before continuing:
// - Family requires choosing a sub-type on /relationship/family
// - Other requires typing a free-text label on /relationship/other
export const CONTRIBUTOR_RELATIONSHIP_TYPES_REQUIRING_LABEL = new Set([
  CONTRIBUTOR_RELATIONSHIP_FAMILY,
  CONTRIBUTOR_RELATIONSHIP_OTHER,
]);