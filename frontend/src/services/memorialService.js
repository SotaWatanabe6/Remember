import {
  createMemorial as createMemorialWithApi,
  getMemorials as getMemorialsFromApi,
  getMemorial as getMemorialFromApi,
} from "../lib/api.js";

export async function createMemorial(memorialInput) {
  const { memorial } = await createMemorialWithApi(memorialInput);
  return memorial;
}

export async function getMemorials() {
  const { memorials } = await getMemorialsFromApi();
  return memorials;
}

export async function getMemorial(id) {
  const { memorial } = await getMemorialFromApi(id);
  return memorial;
}

export async function getCurrentMemorial() {
  const memorials = await getMemorials();
  return memorials[0] ?? null;
}

export function clearCurrentMemorial() {
  // Intentionally left blank until delete draft support is added to the mock API.
}
