import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    plan?: string;
  }
  interface Session {
    user: {
      id: string;
      email?: string | null;
      name?: string | null;
      plan?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    plan?: string;
    role?: string;
  }
}
