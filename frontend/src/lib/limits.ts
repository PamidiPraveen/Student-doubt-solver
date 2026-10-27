/** Mirrors the backend's limits so forms can warn early. The server decides. */
export const LIMITS = {
  name: 120,
  email: 255,
  passwordMin: 12,
  passwordMax: 128,
  subject: 120,
  title: 200,
  body: 10000,
} as const;
