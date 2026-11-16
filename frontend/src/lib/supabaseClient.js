import {
  createBrowserClient,
  DEFAULT_COOKIE_OPTIONS,
  isChunkLike,
  parseCookieHeader,
  serializeCookieHeader,
} from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

let supabaseClient;
let passwordRecoveryClient;
const SESSION_ONLY_COOKIE = "remember-session-only";
const RECOVERY_STORAGE_KEY = "remember-password-recovery";

function getSupabaseConfig() {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    );
  }

  return { supabaseUrl, supabaseKey };
}

function readCookies() {
  return parseCookieHeader(document.cookie);
}

function writeCookie(name, value, options) {
  document.cookie = serializeCookieHeader(name, value, {
    ...options,
    secure: window.location.protocol === "https:",
  });
}

function authCookieName(supabaseUrl) {
  return `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token`;
}

export function setSessionPersistence(staySignedIn) {
  const { supabaseUrl } = getSupabaseConfig();
  const cookieName = authCookieName(supabaseUrl);
  const { maxAge, ...sessionOptions } = DEFAULT_COOKIE_OPTIONS;
  writeCookie(SESSION_ONLY_COOKIE, staySignedIn ? "" : "1", {
    ...sessionOptions,
    ...(staySignedIn ? { maxAge: 0 } : {}),
  });
  for (const { name, value } of readCookies()) {
    if (isChunkLike(name, cookieName)) {
      writeCookie(name, value, staySignedIn ? { ...sessionOptions, maxAge } : sessionOptions);
    }
  }
}

export function getSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  const { supabaseUrl, supabaseKey } = getSupabaseConfig();
  const cookieName = authCookieName(supabaseUrl);
  supabaseClient = createBrowserClient(supabaseUrl, supabaseKey, {
    cookieOptions: { name: cookieName },
    cookies: {
      getAll: readCookies,
      setAll(cookies) {
        // Supabase writes cookies again on refresh. Keep session cookies
        // temporary on those writes as well as on initial sign-in.
        const sessionOnly = readCookies().some(({ name, value }) => name === SESSION_ONLY_COOKIE && value === "1");
        for (const { name, value, options } of cookies) {
          const cookieOptions = { ...options };
          if (sessionOnly && isChunkLike(name, cookieName) && value) {
            delete cookieOptions.maxAge;
            delete cookieOptions.expires;
          }
          writeCookie(name, value, cookieOptions);
        }
      },
    },
  });
  return supabaseClient;
}

export function getPasswordRecoveryClient() {
  if (passwordRecoveryClient) return passwordRecoveryClient;

  const { supabaseUrl, supabaseKey } = getSupabaseConfig();
  const verifierKey = `${RECOVERY_STORAGE_KEY}-code-verifier`;
  const recoverySession = new Map();
  // The email can open in another tab. Share the PKCE verifier across tabs,
  // while keeping the recovery session separate from the organizer session.
  passwordRecoveryClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      storageKey: RECOVERY_STORAGE_KEY,
      flowType: "pkce",
      persistSession: true,
      detectSessionInUrl: false,
      autoRefreshToken: false,
      storage: {
        getItem(key) {
          return key === verifierKey ? localStorage.getItem(key) : recoverySession.get(key) ?? null;
        },
        setItem(key, value) {
          if (key === verifierKey) localStorage.setItem(key, value);
          else recoverySession.set(key, value);
        },
        removeItem(key) {
          if (key === verifierKey) localStorage.removeItem(key);
          else recoverySession.delete(key);
        },
      },
    },
  });
  return passwordRecoveryClient;
}
