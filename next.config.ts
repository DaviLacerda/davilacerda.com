import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Files read from disk at build/request time must be traced into any server
  // function: Markdown posts (RSS, llms.txt, MCP, Markdown renditions), the
  // TTF fonts used by the generated OG images and icons, and the PNGs those
  // cards show (the certificate prints and the portrait).
  outputFileTracingIncludes: {
    "/**": [
      "./content/**/*",
      "./src/lib/og/fonts/*.ttf",
      "./public/certificates/*.png",
      "./public/images/davi.png",
    ],
  },
  images: {
    // AVIF first (the certificate prints are mostly flat colour and type),
    // WebP otherwise. 90 keeps the small print on the certificates crisp.
    formats: ["image/avif", "image/webp"],
    qualities: [75, 90],
    // Pictures on the Personal tab: team logos (ESPN's CDN), the show's
    // poster (TVMaze) and the Valorant rank emblem (valorant-api.com).
    remotePatterns: [
      { protocol: "https", hostname: "a.espncdn.com", pathname: "/i/**" },
      {
        protocol: "https",
        hostname: "static.tvmaze.com",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "media.valorant-api.com",
        pathname: "/competitivetiers/**",
      },
    ],
  },
};

export default nextConfig;
