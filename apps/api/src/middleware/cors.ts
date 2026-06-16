import cors from "cors";

const DEFAULT_ORIGINS = [
  "https://fanspump.xyz",
  "https://www.fanspump.xyz",
  "https://admin.fanspump.xyz",
  "http://localhost:3000",
];

function parseOrigins(): string[] {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (!raw) return DEFAULT_ORIGINS;
  return raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

export const corsMiddleware = cors({
  origin(origin, callback) {
    const allowed = parseOrigins();
    // Allow Vercel preview deployments
    if (!origin || allowed.includes(origin) || origin.endsWith(".vercel.app")) {
      callback(null, true);
      return;
    }
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-CSRF-Token",
  ],
});

export { parseOrigins as getAllowedOrigins };
