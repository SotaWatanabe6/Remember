import {
  getCurrentUser as getCurrentUserFromApi,
  login as loginWithApi,
  logout as logoutWithApi,
  register,
} from "../lib/api.js";

export async function login({ email, password }) {
  return loginWithApi({ email, password });
}

export async function signup({ fullName, email, password }) {
  const data = await register({
    email,
    password,
    full_name: fullName,
  });

  return {
    ...data,
    needsEmailConfirmation: false,
  };
}

export async function logout() {
  return logoutWithApi();
}

export async function getCurrentUser() {
  return getCurrentUserFromApi();
}
