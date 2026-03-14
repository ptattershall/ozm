import { z, flattenError } from "zod";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const LoadDesignQuerySchema = z.object({
  id: z.string().min(1, "id is required"),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const parsed = LoadDesignQuerySchema.safeParse({ id: searchParams.get("id") ?? "" });

  if (!parsed.success) {
    const flat = flattenError(parsed.error);
    const message =
      flat.formErrors?.[0] ?? Object.values(flat.fieldErrors ?? {})?.[0]?.[0] ?? "Validation failed.";
    return NextResponse.json({ error: String(message) }, { status: 400 });
  }

  const { id } = parsed.data;

  try {
    const design = await prisma.design.findUnique({
      where: { id },
      select: { baseSvgUrl: true, canvasJson: true },
    });

    if (!design) {
      return NextResponse.json(
        { error: "Design not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      baseSvgUrl: design.baseSvgUrl,
      canvasJson: design.canvasJson,
    });
  } catch (err) {
    console.error("[load-design]", err);
    return NextResponse.json(
      { error: "Failed to load design." },
      { status: 500 }
    );
  }
}
