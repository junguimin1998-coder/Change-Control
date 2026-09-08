import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "A" | "B" | "C";
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: "ADMIN" | "A" | "B" | "C";
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: "ADMIN" | "A" | "B" | "C";
  }
}
