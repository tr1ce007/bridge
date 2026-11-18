import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // The Desktop is synced to iCloud, which creates "X 2.ts" copies; iCloud skips names ending in .nosync.
  // Vercel expects the default .next folder, so the custom name is used only locally.
  distDir: process.env.VERCEL ? ".next" : ".next.nosync",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default withNextIntl(nextConfig);
