const MOCK_SESSION_KEY = "remember_mock_auth_session";
const MOCK_DELAY_MS = 500;

const waitForMockRequest = () =>
  new Promise((resolve) => {
    window.setTimeout(resolve, MOCK_DELAY_MS);
  });

const persistUser = (user) => {
  localStorage.setItem(MOCK_SESSION_KEY, JSON.stringify(user));
  return user;
};

export async function login({ email }) {
  // TODO: Replace this local mock with Supabase Auth sign-in when backend auth is ready.
  await waitForMockRequest();

  return persistUser({
    id: "mock-organizer-1",
    fullName: "Mock Organizer",
    email,
    role: "organizer",
  });
}

export async function signup({ fullName, email }) {
  // TODO: Replace this local mock with Supabase Auth sign-up when backend auth is ready.
  await waitForMockRequest();

  const user = persistUser({
    id: "mock-organizer-1",
    fullName,
    email,
    role: "organizer",
  });

  return {
    user,
    redirectTo: "/memorial/create",
  };
}

export function logout() {
  // TODO: Replace this local mock with Supabase Auth sign-out when backend auth is ready.
  localStorage.removeItem(MOCK_SESSION_KEY);
}

export function getCurrentUser() {
  // TODO: Replace this local mock with Supabase Auth session lookup when backend auth is ready.
  const session = localStorage.getItem(MOCK_SESSION_KEY);

  if (!session) {
    return null;
  }

  try {
    return JSON.parse(session);
  } catch {
    localStorage.removeItem(MOCK_SESSION_KEY);
    return null;
  }
}
