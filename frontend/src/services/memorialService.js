// frontend/src/services/memorialService.js
// Merged: blessing/phase-4 + main
// blessing/phase-4: createMemorial, getMemorials, getMemorial → use api.js
// main: getMemorialOutput, createMemorialOutput, getCurrentMemorial kept

import {
  createMemorial as apiCreateMemorial,
  getMemorials as apiGetMemorials,
  getMemorial as apiGetMemorial,
} from "../lib/api.js";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// ─── normalizeMemorial ────────────────────────────────────────────────────────
// Normalizes field name variants across real backend + mock data
// Handles: subject_name/deceased_name, date_of_birth/birth_date, etc.

const normalizeMemorial = (memorial) => {
  if (!memorial) return null;

  const subjectName = memorial.subject_name || memorial.deceased_name || '';
  const dateOfBirth = memorial.date_of_birth || memorial.birth_date || null;
  const dateOfPassing = memorial.date_of_passing || memorial.death_date || null;
  const biography =
    memorial.biography ||
    memorial.description ||
    memorial.short_description ||
    memorial.brief_biography ||
    '';
  const relatedPeople = memorial.related_people || memorial.relatedPeople || [];

  return {
    ...memorial,
    subject_name: subjectName,
    deceased_name: memorial.deceased_name || subjectName,
    nickname: memorial.nickname || memorial.nick_name || "",
    date_of_birth: dateOfBirth,
    date_of_passing: dateOfPassing,
    birth_date: memorial.birth_date || dateOfBirth,
    death_date: memorial.death_date || dateOfPassing,
    biography,
    description: memorial.description || biography,
    short_description: memorial.short_description || biography,
    brief_biography: memorial.brief_biography || biography,
    related_people: relatedPeople,
    cover_photo_url:
      memorial.cover_photo_url || memorial.profile_photo_url || null,
    profile_photo_url:
      memorial.profile_photo_url || memorial.cover_photo_url || null,
  };
};

// ─── BLESSING: Memorial CRUD via api.js ───────────────────────────────────────

/**
 * Creates a new memorial.
 * Calls api.js createMemorial() → real backend with mock fallback.
 */
export async function createMemorial(memorialInput) {
  const response = await apiCreateMemorial({
    subject_name:
      memorialInput.subject_name || memorialInput.deceased_name || "",
    nickname: memorialInput.nickname || "",
    date_of_birth:
      memorialInput.date_of_birth || memorialInput.birth_date || null,
    date_of_passing:
      memorialInput.date_of_passing || memorialInput.death_date || null,
    biography:
      memorialInput.biography ||
      memorialInput.description ||
      memorialInput.brief_biography ||
      "",
    related_people:
      memorialInput.related_people || memorialInput.relatedPeople || [],
    cover_photo_url:
      memorialInput.cover_photo_url || memorialInput.profile_photo_url || null,
  });
  return normalizeMemorial(response.memorial);
}

/**
 * Returns all memorials for the logged in organizer.
 * Calls api.js getMemorials() → real backend with mock fallback.
 */
export async function getMemorials() {
  const response = await apiGetMemorials();
  return (response.memorials || []).map(normalizeMemorial);
}

/**
 * Returns a single memorial by ID.
 * Calls api.js getMemorial() → real backend with mock fallback.
 */
export async function getMemorial(id) {
  const response = await apiGetMemorial(id);
  return normalizeMemorial(response.memorial);
}

// ─── MENDRIKA: Memorial output ────────────────────────────────────────────────

/**
 * GET /memorials/:id/output
 * Returns four-tab output JSON for the memorial.
 * Used by Mendrika's output pages.
 * token = Supabase session access_token
 */
export async function getMemorialOutput(id, token) {
  try {
    const response = await fetch(`${API_BASE_URL}/memorials/${id}/output`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token?.access_token || token || ''}`,
      },
    });
    if (!response.ok) throw new Error(`Failed to fetch memorial output: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching memorial output:', error);
    throw error;
  }
}

/**
 * POST /memorials
 * Creates memorial output record.
 * Used by Mendrika's generate flow.
 */
export async function createMemorialOutput(memorialInput, token) {
  try {
    const response = await fetch(`${API_BASE_URL}/memorials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token?.access_token || token || ''}`,
      },
      body: JSON.stringify({
        subject_name: memorialInput.subject_name || memorialInput.deceased_name || '',
        date_of_birth: memorialInput.date_of_birth || memorialInput.birth_date || null,
        date_of_passing: memorialInput.date_of_passing || memorialInput.death_date || null,
        cover_photo_url: memorialInput.cover_photo_url || memorialInput.profile_photo_url || null,
      }),
    });
    if (!response.ok) throw new Error(`Failed to create memorial output: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error creating memorial output:', error);
    throw error;
  }
}

// ─── Local session storage for current memorial ───────────────────────────────

const CURRENT_MEMORIAL_KEY = 'remember.current_memorial';

export function getCurrentMemorial() {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(CURRENT_MEMORIAL_KEY);
  return stored ? normalizeMemorial(JSON.parse(stored)) : null;
}

export function setCurrentMemorial(memorial) {
  if (typeof window === 'undefined') return;
  if (memorial) {
    localStorage.setItem(CURRENT_MEMORIAL_KEY, JSON.stringify(memorial));
  } else {
    localStorage.removeItem(CURRENT_MEMORIAL_KEY);
  }
}

export function clearCurrentMemorial() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CURRENT_MEMORIAL_KEY);
}
