"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const SignUpSchema = z
  .object({
    name: z.string().min(1, "Name is required").max(200),
    email: z.string().min(1, "Email is required").email("Invalid email"),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignUpForm = z.infer<typeof SignUpSchema>;

export default function SignUpPage() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignUpForm>({
    resolver: zodResolver(SignUpSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = async (data: SignUpForm) => {
    setSubmitError(null);
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        email: data.email,
        password: data.password,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setSubmitError(json.error ?? "Something went wrong. Please try again.");
      return;
    }
    router.push("/signin?callbackUrl=/");
    router.refresh();
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Sign up
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Create an account to save and manage your designs.
      </p>
      <form
        className="mt-6 flex flex-col gap-4"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div className="space-y-2">
          <Label htmlFor="signup-name">Name</Label>
          <Input
            id="signup-name"
            type="text"
            autoComplete="name"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "signup-name-error" : undefined}
            className="w-full"
            {...register("name")}
          />
          {errors.name && (
            <p
              id="signup-name-error"
              className="text-xs text-red-600 dark:text-red-400"
              role="alert"
            >
              {errors.name.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-email">Email</Label>
          <Input
            id="signup-email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "signup-email-error" : undefined}
            className="w-full"
            {...register("email")}
          />
          {errors.email && (
            <p
              id="signup-email-error"
              className="text-xs text-red-600 dark:text-red-400"
              role="alert"
            >
              {errors.email.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-password">Password</Label>
          <Input
            id="signup-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            aria-describedby={
              errors.password ? "signup-password-error" : undefined
            }
            className="w-full"
            {...register("password")}
          />
          {errors.password && (
            <p
              id="signup-password-error"
              className="text-xs text-red-600 dark:text-red-400"
              role="alert"
            >
              {errors.password.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="signup-confirm">Confirm password</Label>
          <Input
            id="signup-confirm"
            type="password"
            autoComplete="new-password"
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={
              errors.confirmPassword ? "signup-confirm-error" : undefined
            }
            className="w-full"
            {...register("confirmPassword")}
          />
          {errors.confirmPassword && (
            <p
              id="signup-confirm-error"
              className="text-xs text-red-600 dark:text-red-400"
              role="alert"
            >
              {errors.confirmPassword.message}
            </p>
          )}
        </div>
        {submitError && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {submitError}
          </p>
        )}
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Creating account…" : "Sign up"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Already have an account?{" "}
        <Link
          href="/signin"
          className="font-medium text-violet-600 underline-offset-4 hover:underline dark:text-violet-400"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
