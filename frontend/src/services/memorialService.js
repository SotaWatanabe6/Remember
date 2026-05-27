import { getCurrentUser } from "./authService.js";
import { MOCK_MEMORIALS_STORAGE_KEY, mockMemorials } from "../data/mockMemorials.js";

const MOCK_DELAY_MS = 500;

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

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

const normalizeMemorial = (memorial) => {
  if (!memorial) {
    return null;
  }

  const subjectName = memorial.subject_name || memorial.deceased_name || "";
  const dateOfBirth = memorial.date_of_birth || memorial.birth_date || null;
  const dateOfPassing = memorial.date_of_passing || memorial.death_date || null;
  const description =
    memorial.description ||
    memorial.short_description ||
    memorial.brief_biography ||
    "";

  return {
    ...memorial,
    subject_name: subjectName,
    deceased_name: memorial.deceased_name || subjectName,
    date_of_birth: dateOfBirth,
    date_of_passing: dateOfPassing,
    birth_date: memorial.birth_date || dateOfBirth,
    death_date: memorial.death_date || dateOfPassing,
    description,
    short_description: memorial.short_description || description,
    cover_photo_url: memorial.cover_photo_url || memorial.profile_photo_url || null,
    profile_photo_url: memorial.profile_photo_url || memorial.cover_photo_url || null,
  };
};

// services/memorialService.js


export async function getMemorialOutput(id,token) {
    await waitForMockRequest();
    try {
      console.log(token.access_token);
      const response = await fetch(
        `${API_BASE_URL}/memorials/${id}/output`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token.access_token}`,

          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to fetch memorial output: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching memorial output:", error);
      throw error;
    }
}

export async function createMemorialOutput(memorialInput,token) {
    await waitForMockRequest();
    try {
      const subjectName =
        memorialInput.subject_name || memorialInput.deceased_name || "";
      const dateOfBirth =
        memorialInput.date_of_birth || memorialInput.birth_date || null;
      const dateOfPassing =
        memorialInput.date_of_passing || memorialInput.death_date || null;
      const description =
        memorialInput.description ||
        memorialInput.short_description ||
        memorialInput.brief_biography ||
        "";
      const coverPhotoUrl =
        memorialInput.cover_photo_url || memorialInput.profile_photo_url || null;      
      const response = await fetch(
        `${API_BASE_URL}/memorials`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({
            subject_name: subjectName,
            date_of_birth: dateOfBirth,
            date_of_passing: dateOfPassing,
            cover_photo_url: coverPhotoUrl,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to create memorial output: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error creating memorial output:", error);
      throw error;
    }  
}
export async function createMemorial(memorialInput) {
  // TODO: Replace this local mock with POST /memorials or a Supabase insert when the backend is ready.
  await waitForMockRequest();

  const currentUser = await getCurrentUser();
  const now = new Date().toISOString();
  const id = `mock-memorial-${Date.now()}`;
  const subjectName =
    memorialInput.subject_name || memorialInput.deceased_name || "";
  const dateOfBirth =
    memorialInput.date_of_birth || memorialInput.birth_date || null;
  const dateOfPassing =
    memorialInput.date_of_passing || memorialInput.death_date || null;
  const description =
    memorialInput.description ||
    memorialInput.short_description ||
    memorialInput.brief_biography ||
    "";
  const coverPhotoUrl =
    memorialInput.cover_photo_url || memorialInput.profile_photo_url || null;

  const memorial = normalizeMemorial({
    id,
    organizer_id: currentUser?.id ?? "mock-organizer-1",
    subject_name: subjectName,
    deceased_name: subjectName,
    email_address: memorialInput.email_address || "",
    relationship_to_organizer: memorialInput.relationship_to_organizer || null,
    year_of_birth: memorialInput.year_of_birth || "",
    year_of_passing: memorialInput.year_of_passing || "",
    family_names: memorialInput.family_names || "",
    brief_biography: description,
    birth_date: dateOfBirth,
    death_date: dateOfPassing,
    date_of_birth: dateOfBirth,
    date_of_passing: dateOfPassing,
    description,
    short_description: description,
    cover_photo_url: coverPhotoUrl,
    profile_photo_url: coverPhotoUrl,
    privacy: memorialInput.privacy || "private",
    status: memorialInput.status || "draft",
    invite_link: `https://remember.local/invite/${id}`,
    created_at: now,
    updated_at: now,
  });


  localStorage.setItem(MOCK_MEMORIALS_STORAGE_KEY, JSON.stringify(memorial));
  return memorial;
}

export async function getMemorials() {
  await waitForMockRequest();
  const storedMemorial = readStoredMemorial();
  return [storedMemorial, ...mockMemorials]
    .filter(Boolean)
    .map(normalizeMemorial);
}

export async function getMemorial(id) {
  await waitForMockRequest();
  const memorials = await getMemorials();
  return memorials.find((memorial) => memorial.id === id) ?? null;
}

export function getCurrentMemorial() {
  // TODO: Replace this local lookup with a memorial query scoped to the signed-in organizer.
  return normalizeMemorial(readStoredMemorial() ?? mockMemorials[0] ?? null);
}

export function clearCurrentMemorial() {
  // TODO: Replace this with backend draft deletion or local draft reset behavior when persistence is ready.
  localStorage.removeItem(MOCK_MEMORIALS_STORAGE_KEY);
}
