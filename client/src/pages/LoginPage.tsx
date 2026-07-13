import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Sparkles } from "lucide-react";
import { Navigate, useNavigate } from "react-router";
import { z } from "zod";
import { ThemeToggle } from "../components/ThemeToggle";
import { signIn, useSession } from "../lib/auth-client";

const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required.").email("Enter a valid email address."),
  password: z.string().min(1, "Password is required.")
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { data: session, isPending, refetch } = useSession();
  const [error, setError] = useState("");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormValues>({
    defaultValues: {
      email: "",
      password: ""
    },
    resolver: zodResolver(loginSchema)
  });

  if (isPending) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--color-page)] px-4">
        <p className="text-sm text-slate-600">Loading...</p>
      </main>
    );
  }

  if (session) {
    return <Navigate to="/" replace />;
  }

  async function onSubmit(values: LoginFormValues) {
    setError("");

    try {
      const result = await signIn.email({
        email: values.email,
        password: values.password
      });

      if (result.error) {
        setError(result.error.message ?? "Login failed.");
        return;
      }

      await refetch();
      navigate("/", { replace: true });
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Login failed.");
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-[var(--color-page)] px-4">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <form
        className="panel-surface w-full max-w-sm rounded-lg p-6"
        noValidate
        onSubmit={handleSubmit(onSubmit)}
      >
        <div className="mb-6">
          <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-slate-950 text-white">
            <Sparkles aria-hidden="true" className="h-5 w-5" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            Service desk
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">AI Helpdesk</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to manage the support queue.</p>
        </div>

        <label className="mb-4 block text-sm font-medium text-slate-700">
          Email
          <input
            className={`field-control mt-1 h-10 w-full rounded-md px-3 ${
              errors.email
                ? "border-red-500 focus:border-red-600"
                : ""
            }`}
            {...register("email")}
            aria-invalid={errors.email ? "true" : "false"}
            aria-describedby={errors.email ? "login-email-error" : undefined}
            type="email"
            autoComplete="email"
          />
          {errors.email?.message ? (
            <span id="login-email-error" className="mt-1 block text-sm text-red-600">
              {errors.email.message}
            </span>
          ) : null}
        </label>

        <label className="mb-4 block text-sm font-medium text-slate-700">
          Password
          <input
            className={`field-control mt-1 h-10 w-full rounded-md px-3 ${
              errors.password
                ? "border-red-500 focus:border-red-600"
                : ""
            }`}
            {...register("password")}
            aria-invalid={errors.password ? "true" : "false"}
            aria-describedby={errors.password ? "login-password-error" : undefined}
            type="password"
            autoComplete="current-password"
          />
          {errors.password?.message ? (
            <span id="login-password-error" className="mt-1 block text-sm text-red-600">
              {errors.password.message}
            </span>
          ) : null}
        </label>

        {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}

        <button
          className="h-10 w-full rounded-md bg-blue-600 px-3 text-sm font-semibold text-white shadow-sm shadow-blue-950/10 transition-colors hover:bg-blue-700 disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
