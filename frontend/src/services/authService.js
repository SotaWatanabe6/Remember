import { getPasswordRecoveryClient, getSupabaseClient, setSessionPersistence } from "../lib/supabaseClient.js";

export async function login({ email, password, staySignedIn = false }) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  setSessionPersistence(staySignedIn);
  return data;
}

export async function signup({ fullName, email, password }) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    throw error;
  }

  return {
    ...data,
    needsEmailConfirmation: Boolean(data.user && !data.session),
  };
}

export async function logout() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });

  if (error) {
    throw error;
  }
  setSessionPersistence(true);
}

export async function requestPasswordReset(email) {
  const supabase = getPasswordRecoveryClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: new URL("/reset-password", window.location.origin).href,
  });
  if (error) throw error;
}

export async function exchangePasswordResetCode(code) {
  const supabase = getPasswordRecoveryClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session || data.redirectType !== "recovery") {
    throw new Error("This reset link is invalid or expired.");
  }
}

export async function resetPassword(password) {
  const supabase = getPasswordRecoveryClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  await supabase.auth.signOut({ scope: "local" }).catch(() => {});
}

export async function getCurrentUser() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return data.user;
}
