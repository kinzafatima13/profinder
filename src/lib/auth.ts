import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { ensureSchema, prisma } from "@/lib/prisma";
import { hasProAccess } from "@/lib/billing/access";
import { rateLimit } from "@/lib/rate-limit";

const authSecret = process.env.NEXTAUTH_SECRET;
if (process.env.NODE_ENV === "production" && !authSecret) {
  throw new Error("NEXTAUTH_SECRET is required in production.");
}

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login", newUser: "/signup" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        await ensureSchema();
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.toLowerCase().trim();
        if (!rateLimit(`login:${email}`, 12, 15 * 60 * 1000).ok) return null;
        const student = await prisma.student.findUnique({
          where: { email },
        });
        if (!student?.passwordHash) return null;
        const valid = await bcrypt.compare(credentials.password, student.passwordHash);
        if (!valid) return null;
        const access = await prisma.student.findUnique({
          where: { email: student.email },
          include: { subscription: true },
        });
        return {
          id: student.id,
          email: student.email,
          name: student.name,
          plan: hasProAccess(access?.subscription ?? null) ? "pro" : "free",
          role: student.role || "student",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = (user as { role?: string }).role || "student";
      }
      const email = token.email as string | undefined;
      if (email) {
        const student = await prisma.student.findUnique({
          where: { email },
          include: { subscription: true },
        });
        token.plan = hasProAccess(student?.subscription ?? null) ? "pro" : "free";
        token.role = student?.role || "student";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { plan?: string }).plan = token.plan === "pro" ? "pro" : "free";
        (session.user as { role?: string }).role = (token.role as string) || "student";
      }
      return session;
    },
  },
  secret: authSecret || "dev-only-nextauth-secret",
};
