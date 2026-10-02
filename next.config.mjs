/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    outputFileTracingIncludes: {
      "/*": ["./prisma/dev.db"],
      "/**/*": ["./prisma/dev.db"],
    },
  },
};

export default nextConfig;
