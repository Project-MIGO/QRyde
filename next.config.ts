import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    "172.16.0.25",
    "localhost",
    "*.local",
  ],
};

export default nextConfig;
