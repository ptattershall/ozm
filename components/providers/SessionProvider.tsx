"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { Session } from "next-auth";

type SessionProviderProps = {
  children: React.ReactNode;
  session?: Session | null;
};

export const SessionProvider = ({ children, session }: SessionProviderProps) => {
  return (
    <NextAuthSessionProvider session={session}>{children}</NextAuthSessionProvider>
  );
};
