export { default } from "next-auth/middleware";

export const config = {
  matcher: ["/tracker/:path*", "/profile/:path*", "/scholarship/:path*", "/admin/:path*"],
};
