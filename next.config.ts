import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Files read from disk at build/request time must be traced into any server
  // function: Markdown posts (RSS, llms.txt, MCP, Markdown renditions) and the
  // TTF fonts used by the generated OG images and icons.
  outputFileTracingIncludes: {
    "/**": ["./content/**/*", "./src/lib/og/fonts/*.ttf"],
  },
};

export default nextConfig;
