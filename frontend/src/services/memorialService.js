import {
  createMemorial as apiCreateMemorial,
  getMemorials as apiGetMemorials,
  getMemorial as apiGetMemorial,
} from "../lib/api.js";

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
    cover_photo_url:
      memorial.cover_photo_url || memorial.profile_photo_url || null,
    profile_photo_url:
      memorial.profile_photo_url || memorial.cover_photo_url || null,
  };
};

export async function createMemorial(memorialInput) {
  const response = await apiCreateMemorial({
    subject_name:
      memorialInput.subject_name || memorialInput.deceased_name || "",
    first_name: memorialInput.first_name || "",
    last_name: memorialInput.last_name || "",
    nickname: memorialInput.nickname || "",
    date_of_birth:
      memorialInput.date_of_birth || memorialInput.birth_date || null,
    date_of_passing:
      memorialInput.date_of_passing || memorialInput.death_date || null,
    description: memorialInput.description || "",
    related_people: memorialInput.related_people || [],
    cover_photo_url:
      memorialInput.cover_photo_url || memorialInput.profile_photo_url || null,
  });

  return normalizeMemorial(response.memorial);
}

export async function getMemorials() {
  const response = await apiGetMemorials();
  return response.memorials.map(normalizeMemorial);
}

export async function getMemorial(id) {
  const response = await apiGetMemorial(id);
  return normalizeMemorial(response.memorial);
}

// Local session storage for tracking current memorial being created/edited
const CURRENT_MEMORIAL_KEY = "remember.current_memorial";

export function getCurrentMemorial() {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(CURRENT_MEMORIAL_KEY);
  return stored ? normalizeMemorial(JSON.parse(stored)) : null;
}

export function setCurrentMemorial(memorial) {
  if (typeof window === "undefined") return;
  if (memorial) {
    localStorage.setItem(CURRENT_MEMORIAL_KEY, JSON.stringify(memorial));
  } else {
    localStorage.removeItem(CURRENT_MEMORIAL_KEY);
  }
}

export function clearCurrentMemorial() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CURRENT_MEMORIAL_KEY);
}
