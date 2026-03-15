import { z, flattenError } from "zod";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  putObject,
  getSignedUrl,
  getPublicUrl,
  storagePaths,
} from "@/lib/storage";

const SaveDesignSchema = z.object({
  baseSvgUrl: z.string().min(1, "baseSvgUrl is required").url("baseSvgUrl must be a valid URL"),
  canvasJson: z.string().min(1, "canvasJson is required"),
  designId: z.string().min(1).optional(),
  /** Optional PNG data URL (e.g. from canvas.toDataURL({ multiplier: 0.25 })). Uploaded to storage and saved as thumbnailUrl. */
  thumbnailDataUrl: z
    .string()
    .refine((s) => !s || s.startsWith("data:image/png;base64,"), "thumbnailDataUrl must be a PNG data URL")
    .optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id ?? null;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const parsed = SaveDesignSchema.safeParse(body);
  if (!parsed.success) {
    const flat = flattenError(parsed.error);
    const message =
      flat.formErrors?.[0] ?? Object.values(flat.fieldErrors ?? {})?.[0]?.[0] ?? "Validation failed.";
    return NextResponse.json({ error: String(message) }, { status: 400 });
  }

  const { baseSvgUrl, canvasJson, designId, thumbnailDataUrl } = parsed.data;

  const uploadThumbnailAndGetUrl = async (id: string): Promise<string | null> => {
    if (!thumbnailDataUrl?.startsWith("data:image/png;base64,")) return null;
    try {
      const base64 = thumbnailDataUrl.replace(/^data:image\/png;base64,/, "");
      const buffer = Buffer.from(base64, "base64");
      const key = storagePaths.thumbnailKey(id);
      await putObject(key, buffer, "image/png");
      return getPublicUrl(key).startsWith("http")
        ? getPublicUrl(key)
        : await getSignedUrl(key);
    } catch {
      return null;
    }
  };

  try {
    if (designId) {
      let thumbnailUrl: string | null = null;
      if (thumbnailDataUrl) {
        thumbnailUrl = await uploadThumbnailAndGetUrl(designId);
      }
      const updated = await prisma.design.updateMany({
        where: { id: designId },
        data: {
          baseSvgUrl,
          canvasJson,
          userId,
          ...(thumbnailUrl != null && { thumbnailUrl }),
        },
      });
      if (updated.count === 0) {
        return NextResponse.json({ error: "Design not found." }, { status: 404 });
      }
      return NextResponse.json({ designId });
    }

    const design = await prisma.design.create({
      data: {
        baseSvgUrl,
        canvasJson,
        userId,
      },
    });
    const id = design.id;
    if (thumbnailDataUrl) {
      const thumbnailUrl = await uploadThumbnailAndGetUrl(id);
      if (thumbnailUrl != null) {
        await prisma.design.update({
          where: { id },
          data: { thumbnailUrl },
        });
      }
    }
    return NextResponse.json({ designId: id });
  } catch (err) {
    console.error("[save-design]", err);
    return NextResponse.json(
      { error: "Failed to save design." },
      { status: 500 }
    );
  }
}
