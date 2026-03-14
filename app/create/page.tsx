import type { Metadata } from "next";

import { CreatePageContent } from "@/components/create/CreatePageContent";

export const metadata: Metadata = {
  title: "Create Emoji | Fantasy Emoji Forge",
  description: "Generate a fantasy emoji SVG from a text prompt.",
};

export default function CreatePage() {
  return <CreatePageContent />;
}
