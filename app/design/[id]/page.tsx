import type { Metadata } from "next";

import { DesignEditor } from "@/components/editor/DesignEditor";

type DesignPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ baseSvgUrl?: string }>;
};

export const metadata: Metadata = {
  title: "Editor | Fantasy Emoji Forge",
  description: "Edit your fantasy emoji with accessories, properties, and export options.",
};

const DesignPage = async ({ params, searchParams }: DesignPageProps) => {
  const { id } = await params;
  const { baseSvgUrl: baseSvgUrlFromQuery } = await searchParams;

  return (
    <DesignEditor
      designId={id}
      baseSvgUrlFromQuery={id === "new" ? (baseSvgUrlFromQuery ?? null) : null}
    />
  );
};

export default DesignPage;
