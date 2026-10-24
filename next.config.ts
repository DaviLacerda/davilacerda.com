import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Markdown posts are read from disk at build/request time; make sure they are
  // traced into any server function (route handlers such as RSS or llms.txt).
  outputFileTracingIncludes: {
    "/**": ["./content/**/*"],
  },
};

export default nextConfig;
