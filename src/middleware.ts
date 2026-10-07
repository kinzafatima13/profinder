export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/tracker/:path*", "/profile/:path*", "/admin/:path*"],
};
