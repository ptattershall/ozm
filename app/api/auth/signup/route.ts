import { z } from "zod";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

const SignUpSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
  email: z.string().min(1, "Email is required").email("Invalid email"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128),
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

  const parsed = SignUpSchema.safeParse(body);
  if (!parsed.success) {
    const msg =
      parsed.error.flatten().formErrors[0] ??
      parsed.error.flatten().fieldErrors.email?.[0] ??
      parsed.error.flatten().fieldErrors.password?.[0] ??
      "Validation failed.";
    return NextResponse.json({ error: String(msg) }, { status: 400 });
  }

  const { name, email, password } = parsed.data;
  const emailNormalized = email.toLowerCase().trim();

  const existing = await prisma.user.findUnique({
    where: { email: emailNormalized },
  });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
    await prisma.user.create({
      data: {
        name: name.trim(),
        email: emailNormalized,
        passwordHash,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[signup]", err);
    return NextResponse.json(
      { error: "Failed to create account." },
      { status: 500 }
    );
  }
}
