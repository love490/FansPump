import type { NextConfig } from "next";
import path from "node:path";
const monorepoRoot = path.join(__dirname, "../..");
const nextConfig: NextConfig = {
  transpilePackages: ["@iopn/database", "@iopn/shared"],
  outputFileTracingRoot: monorepoRoot,
  serverExternalPackages: ["@prisma/client", "prisma", "@node-rs/argon2"],
  outputFileTracingIncludes: {
    "/api/**/*": [
      "../../node_modules/.prisma/client/**/*",
      "../../node_modules/@prisma/client/**/*",
      "../../node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/**/*",
      "../../node_modules/.pnpm/@prisma+client@*/node_modules/@prisma/client/**/*",
      "../../packages/database/node_modules/.prisma/client/**/*",
      "../../packages/database/node_modules/@prisma/client/**/*",
    ],
    "/*": [
      "../../node_modules/.prisma/client/**/*",
      "../../node_modules/@prisma/client/**/*",
      "../../node_modules/.pnpm/@prisma+client@*/node_modules/.prisma/client/**/*",
      "../../node_modules/.pnpm/@prisma+client@*/node_modules/@prisma/client/**/*",
      "../../packages/database/node_modules/.prisma/client/**/*",
      "../../packages/database/node_modules/@prisma/client/**/*",
    ],
  },
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "@react-native-async-storage/async-storage": false,
      "pino-pretty": false,
    };
    return config;
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
  async headers() {
    return [
      {
        source: "/admin/login",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
      {
        source: "/admin/signin",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
          { key: "Pragma", value: "no-cache" },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};
export default nextConfig;
