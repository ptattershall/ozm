"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const SignInSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

type SignInForm = z.infer<typeof SignInSchema>;

export default function SignInPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInForm>({
    resolver: zodResolver(SignInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: SignInForm) => {
    setSubmitError(null);
    const result = await signIn("credentials", {
      email: data.email.trim().toLowerCase(),
      password: data.password,
      redirect: false,
    });
    if (result?.error) {
      setSubmitError("Invalid email or password.");
      return;
    }
    if (result?.ok) {
      router.push(callbackUrl);
      router.refresh();
      return;
    }
    setSubmitError("Something went wrong. Please try again.");
  };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-sm flex-col justify-center px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Sign in
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        Sign in to attach your designs to your account.
      </p>
      <form
        className="mt-6 flex flex-col gap-4"
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div className="space-y-2">
          <Label htmlFor="signin-email">Email</Label>
          <Input
            id="signin-email"
            type="email"
            autoComplete="email"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "signin-email-error" : undefined}
            className="w-full"
            {...register("email")}
          />
          {errors.email && (
            <p
              id="signin-email-error"
              className="text-xs text-red-600 dark:text-red-400"
              role="alert"
            >
              {errors.email.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="signin-password">Password</Label>
          <Input
            id="signin-password"
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            aria-describedby={
              errors.password ? "signin-password-error" : undefined
            }
            className="w-full"
            {...register("password")}
          />
          {errors.password && (
            <p
              id="signin-password-error"
              className="text-xs text-red-600 dark:text-red-400"
              role="alert"
            >
              {errors.password.message}
            </p>
          )}
        </div>
        {submitError && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {submitError}
          </p>
        )}
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-violet-600 underline-offset-4 hover:underline dark:text-violet-400"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}
