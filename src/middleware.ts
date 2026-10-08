import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    if (!req.nextUrl.pathname.startsWith("/admin/apply")) return NextResponse.next();
    const role = req.nextauth.token?.role;
    const email = String(req.nextauth.token?.email || "").toLowerCase();
    const allow = (process.env.ADMIN_EMAILS || "").split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
    if (role === "admin" || allow.includes(email)) return NextResponse.next();
    return new NextResponse("Forbidden", { status: 403 });
  },
  {
    pages: { signIn: "/login" },
    callbacks: { authorized: ({ token }) => Boolean(token) },
  },
);

export const config = {
  matcher: ["/tracker/:path*", "/profile/:path*", "/admin/:path*"],
};
