import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Wrap client-side route changes in document.startViewTransition so
    // navigating between pages (notably project → project) crossfades instead
    // of hard-cutting and snapping the scroll position back to the top. The
    // crossfade is styled in globals.css (::view-transition-*(root)).
    viewTransition: true,
  },
};

export default nextConfig;
