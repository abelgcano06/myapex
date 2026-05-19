import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    DATA_DIR: process.env.DATA_DIR || "c:/garmin-ai/data/users/abelgcanofuentes_at_hotmail_com",
  },
};

export default nextConfig;
