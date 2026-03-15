import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { auth } from "@/auth";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { AuthHeader } from "@/components/auth/AuthHeader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fantasy Emoji Forge",
  description:
    "Create and customize fantasy emojis. Generate SVG emojis from a prompt, add accessories, and export.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SessionProvider session={session}>
          <AuthHeader />
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
