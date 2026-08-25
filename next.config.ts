import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "font-src 'self' data:",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "img-src 'self' data: blob: https://svgl.app",
      "object-src 'none'",
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' https://api.github.com",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  {
    key: "Permissions-Policy",
    value: [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "magnetometer=()",
      "gyroscope=()",
    ].join(", "),
  },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
];

const immutableAssetHeaders = [
  {
    key: "Cache-Control",
    value: "public, max-age=31536000, immutable",
  },
];

const immutableImageSources = [
  "/currently/:path*.webp",
  "/currently/:path*.png",
  "/currently/:path*.jpg",
  "/currently/:path*.jpeg",
  "/work/:path*.webp",
  "/work/:path*.png",
  "/work/:path*.jpg",
  "/work/:path*.jpeg",
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    qualities: [75, 80],
  },
  experimental: {
    // Wrap client-side route changes in document.startViewTransition so
    // navigating between pages (notably project → project) crossfades instead
    // of hard-cutting and snapping the scroll position back to the top. The
    // crossfade is styled in globals.css (::view-transition-*(root)).
    viewTransition: true,
  },
  async redirects() {
    return [
      {
        source: "/paper-dashboard",
        destination: "/higlobe-prototype",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      ...immutableImageSources.map((source) => ({
        source,
        headers: immutableAssetHeaders,
      })),
    ];
  },
};

export default nextConfig;
