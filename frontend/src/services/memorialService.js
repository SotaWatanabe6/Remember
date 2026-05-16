import { getCurrentUser } from "./authService.js";
import { MOCK_MEMORIALS_STORAGE_KEY, mockMemorials } from "../data/mockMemorials.js";

const MOCK_DELAY_MS = 500;

const waitForMockRequest = () =>
  new Promise((resolve) => {
    window.setTimeout(resolve, MOCK_DELAY_MS);
  });

const readStoredMemorial = () => {
  const storedMemorial = localStorage.getItem(MOCK_MEMORIALS_STORAGE_KEY);

  if (!storedMemorial) {
    return null;
  }

  try {
    return JSON.parse(storedMemorial);
  } catch {
    localStorage.removeItem(MOCK_MEMORIALS_STORAGE_KEY);
    return null;
  }
};

export async function createMemorial(memorialInput) {
  // TODO: Replace this local mock with POST /memorials or a Supabase insert when the backend is ready.
  await waitForMockRequest();

  const currentUser = getCurrentUser();
  const now = new Date().toISOString();
  const id = `mock-memorial-${Date.now()}`;

  const memorial = {
    id,
    organizer_id: currentUser?.id ?? "mock-organizer-1",
    deceased_name: memorialInput.deceased_name,
    email_address: memorialInput.email_address || "",
    relationship_to_organizer: memorialInput.relationship_to_organizer || null,
    year_of_birth: memorialInput.year_of_birth || "",
    year_of_passing: memorialInput.year_of_passing || "",
    family_names: memorialInput.family_names || "",
    brief_biography: memorialInput.brief_biography || "",
    birth_date: memorialInput.birth_date || null,
    death_date: memorialInput.death_date || null,
    short_description: memorialInput.short_description || "",
    profile_photo_url: memorialInput.profile_photo_url || null,
    privacy: memorialInput.privacy || "private",
    status: "draft",
    invite_link: `https://remember.local/invite/${id}`,
    created_at: now,
    updated_at: now,
  };

  localStorage.setItem(MOCK_MEMORIALS_STORAGE_KEY, JSON.stringify(memorial));
  return memorial;
}

export function getCurrentMemorial() {
  // TODO: Replace this local lookup with a memorial query scoped to the signed-in organizer.
  return readStoredMemorial() ?? mockMemorials[0] ?? null;
}

export function clearCurrentMemorial() {
  // TODO: Replace this with backend draft deletion or local draft reset behavior when persistence is ready.
  localStorage.removeItem(MOCK_MEMORIALS_STORAGE_KEY);
}
