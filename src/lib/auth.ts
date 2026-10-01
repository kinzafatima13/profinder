import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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
        if (!credentials?.email || !credentials?.password) return null;
        const student = await prisma.student.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        });
        if (!student?.passwordHash) return null;
        const valid = await bcrypt.compare(credentials.password, student.passwordHash);
        if (!valid) return null;
        return { id: student.id, email: student.email, name: student.name, plan: student.plan === "pro" ? "pro" : "free" };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      const email = token.email;
      if (email) {
        const student = await prisma.student.findUnique({ where: { email } });
        token.plan = student?.plan === "pro" ? "pro" : "free";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { plan?: string }).plan = token.plan === "pro" ? "pro" : "free";
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
