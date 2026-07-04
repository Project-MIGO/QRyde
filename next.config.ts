import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    "172.16.0.41",
    "localhost",
    "*.local",
  ],
};

export default nextConfig;
