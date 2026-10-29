import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // The workbook upload goes through a Server Action, and the default cap is 1 MB —
    // a founder workbook with its dashboard sheet is comfortably past that, and the
    // rejection happens before the action runs, so the form could not report it.
    // 4 MB keeps us inside Vercel's own request body ceiling of 4.5 MB.
    serverActions: { bodySizeLimit: "4mb" },
  },
};

export default nextConfig;
