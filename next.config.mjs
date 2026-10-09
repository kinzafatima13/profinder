/** @type {import('next').NextConfig} */
const nextConfig = {
  // Full `tsc` is verified in CI/local. On Vercel the combined lint+typecheck
  // step was OOM-killing the build worker (SIGKILL) after successful compile.
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    outputFileTracingIncludes: {
      "/*": ["./prisma/dev.db"],
      "/**/*": ["./prisma/dev.db"],
    },
  },
  async redirects() {
    return [
      // Retired as standalone nav destinations; pages still exist for direct links / bookmarks.
      // Send users toward the consolidated workspace or discovery surfaces.
      { source: "/alerts", destination: "/tracker", permanent: false },
      { source: "/notices", destination: "/tracker", permanent: false },
      { source: "/searches", destination: "/find", permanent: false },
      // Get started stays available after signup; permanent nav entry removed.
      // No redirect for /onboarding so post-registration flow still works.
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
