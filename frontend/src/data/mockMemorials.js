export const MEMORIAL_RELATIONSHIPS = [
  "Parent",
  "Spouse or partner",
  "Child",
  "Sibling",
  "Grandparent",
  "Friend",
  "Other family member",
  "Other",
];

export const MEMORIAL_PRIVACY_OPTIONS = [
  {
    value: "private",
    label: "Private",
    description: "Only people with an invitation can visit.",
  },
  {
    value: "invite_only",
    label: "Invite only",
    description: "Family and friends can join by invitation.",
  },
  {
    value: "public",
    label: "Public",
    description: "Anyone with the link can view this memorial.",
  },
];

export const MOCK_MEMORIALS_STORAGE_KEY = "remember_current_mock_memorial";

export const mockMemorials = [
  {
    id: "mock-memorial-1",
    organizer_id: "mock-organizer-1",
    deceased_name: "Eleanor Hart",
    email_address: "family@example.com",
    relationship_to_organizer: null,
    year_of_birth: "1942",
    year_of_passing: "2026",
    family_names: "Maya, Daniel, and Grace",
    birth_date: "1942",
    death_date: "2026",
    brief_biography:
      "A patient teacher, devoted gardener, and steady presence for everyone who gathered around her table.",
    short_description:
      "A patient teacher, devoted gardener, and steady presence for everyone who gathered around her table.",
    profile_photo_url: null,
    privacy: "private",
    status: "draft",
    invite_link: "https://remember.local/invite/mock-memorial-1",
    created_at: "2026-05-01T18:00:00.000Z",
    updated_at: "2026-05-01T18:00:00.000Z",
  },
];
