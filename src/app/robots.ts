import type { MetadataRoute } from "next";
import { SITE } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/admin",
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
        "/profile",
        "/tracker",
        "/billing",
        "/settings",
      ],
    },
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
