import { z, flattenError } from "zod";
import { NextResponse } from "next/server";
import {
  putObject,
  getSignedUrl,
  getPublicUrl,
  storagePaths,
} from "@/lib/storage";

const PNG_SIZES = [128, 256, 512] as const;

const UploadExportSchema = z.object({
  designId: z.string().min(1, "designId is required"),
  size: z.enum(["128", "256", "512"]).transform((s) => Number(s) as 128 | 256 | 512),
  dataUrl: z
    .string()
    .min(1, "dataUrl is required")
    .refine(
      (s) => s.startsWith("data:image/png;base64,"),
      "dataUrl must be a PNG data URL"
    ),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const parsed = UploadExportSchema.safeParse(body);
  if (!parsed.success) {
    const flat = flattenError(parsed.error);
    const message =
      flat.formErrors?.[0] ?? Object.values(flat.fieldErrors ?? {})?.[0]?.[0] ?? "Validation failed.";
    return NextResponse.json({ error: String(message) }, { status: 400 });
  }

  const { designId, size, dataUrl } = parsed.data;

  if (!PNG_SIZES.includes(size)) {
    return NextResponse.json({ error: "Invalid size." }, { status: 400 });
  }

  try {
    const base64 = dataUrl.replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(base64, "base64");

    const key = storagePaths.exportKey(designId, size);
    await putObject(key, buffer, "image/png");

    const url = getPublicUrl(key).startsWith("http")
      ? getPublicUrl(key)
      : await getSignedUrl(key);

    return NextResponse.json({ url, key });
  } catch (err) {
    console.error("[upload-export]", err);
    return NextResponse.json(
      { error: "Failed to upload export." },
      { status: 500 }
    );
  }
}
