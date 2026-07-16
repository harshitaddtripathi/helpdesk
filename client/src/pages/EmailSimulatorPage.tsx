import { zodResolver } from "@hookform/resolvers/zod";
import { MailPlus, Send, TicketCheck } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Alert, AlertDescription, AlertTitle } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { TextLink } from "../components/ui/text-link";
import { apiFetch } from "../lib/api";
import type { Ticket } from "../types";

const simulatorSchema = z.object({
  from: z.string().trim().min(1, "Sender email is required.").email("Enter a valid email address."),
  fromName: z.string().trim().min(1, "Sender name is required.").max(250, "Sender name is too long."),
  subject: z.string().trim().min(1, "Subject is required.").max(255, "Subject is too long."),
  body: z.string().trim().min(1, "Message body is required.").max(1000, "Message body is too long.")
});

type SimulatorFormValues = z.infer<typeof simulatorSchema>;

type SimulatorResponse = {
  simulated: true;
  status: "created" | "appended";
  ticket: Ticket;
};

export function EmailSimulatorPage() {
  const [error, setError] = useState("");
  const [result, setResult] = useState<SimulatorResponse | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<SimulatorFormValues>({
    resolver: zodResolver(simulatorSchema),
    defaultValues: {
      from: "customer@example.com",
      fromName: "Customer Example",
      subject: "",
      body: ""
    }
  });

  async function onSubmit(values: SimulatorFormValues) {
    setError("");
    setResult(null);

    try {
      const response = await apiFetch<SimulatorResponse>("/api/email/simulate", {
        method: "POST",
        body: JSON.stringify(values)
      });

      setResult(response);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to send simulated email.");
    }
  }

  function clearDraft() {
    reset({
      from: "customer@example.com",
      fromName: "Customer Example",
      subject: "",
      body: ""
    });
    setError("");
    setResult(null);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            Administration
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            Email simulator
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Send an inbound customer email through the ticket pipeline.
          </p>
        </div>
        <Badge variant="outline">Admin only</Badge>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form
          aria-label="Email simulator"
          className="panel-surface rounded-lg p-5"
          noValidate
          onSubmit={handleSubmit(onSubmit)}
        >
          <div className="mb-5 flex items-center gap-3 border-b border-slate-200 pb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-950 text-white">
              <MailPlus aria-hidden="true" className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-950">Inbound email</h2>
              <p className="text-sm text-slate-500">Creates or appends to an open ticket.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Sender email" error={errors.from?.message}>
              <input
                className={`field-control mt-1 h-10 w-full rounded-md px-3 ${
                  errors.from ? "border-red-500 focus:border-red-600" : ""
                }`}
                {...register("from")}
                aria-invalid={errors.from ? "true" : "false"}
                type="email"
              />
            </Field>

            <Field label="Sender name" error={errors.fromName?.message}>
              <input
                className={`field-control mt-1 h-10 w-full rounded-md px-3 ${
                  errors.fromName ? "border-red-500 focus:border-red-600" : ""
                }`}
                {...register("fromName")}
                aria-invalid={errors.fromName ? "true" : "false"}
                type="text"
              />
            </Field>
          </div>

          <Field className="mt-4" label="Subject" error={errors.subject?.message}>
            <input
              className={`field-control mt-1 h-10 w-full rounded-md px-3 ${
                errors.subject ? "border-red-500 focus:border-red-600" : ""
              }`}
              {...register("subject")}
              aria-invalid={errors.subject ? "true" : "false"}
              type="text"
            />
          </Field>

          <Field className="mt-4" label="Message" error={errors.body?.message}>
            <textarea
              className={`field-control mt-1 min-h-52 w-full resize-y rounded-md px-3 py-2 ${
                errors.body ? "border-red-500 focus:border-red-600" : ""
              }`}
              {...register("body")}
              aria-invalid={errors.body ? "true" : "false"}
            />
          </Field>

          {error ? (
            <Alert className="mt-4" variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button disabled={isSubmitting} onClick={clearDraft} type="button" variant="ghost">
              Clear
            </Button>
            <Button disabled={isSubmitting} type="submit">
              <Send aria-hidden="true" className="h-4 w-4" />
              {isSubmitting ? "Sending..." : "Send email"}
            </Button>
          </div>
        </form>

        <aside className="space-y-4">
          {result ? (
            <Alert>
              <TicketCheck aria-hidden="true" className="mb-3 h-5 w-5 text-emerald-600" />
              <AlertTitle>
                {result.status === "created" ? "Ticket created" : "Ticket updated"}
              </AlertTitle>
              <AlertDescription>
                <div className="mt-2 space-y-2">
                  <p className="text-slate-600">{result.ticket.subject}</p>
                  <TextLink to={`/tickets/${result.ticket.id}`}>Open ticket #{result.ticket.id}</TextLink>
                </div>
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="panel-surface rounded-lg p-4">
            <h2 className="text-sm font-semibold text-slate-950">Pipeline path</h2>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <PipelineStep label="Inbound message" />
              <PipelineStep label="Ticket thread match" />
              <PipelineStep label="AI resolution attempt" />
              <PipelineStep label="Agent queue fallback" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({
  className = "",
  label,
  error,
  children
}: {
  className?: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className={`block text-sm font-medium text-slate-700 ${className}`}>
      {label}
      {children}
      {error ? <span className="mt-1 block text-sm text-red-600">{error}</span> : null}
    </label>
  );
}

function PipelineStep({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-2 w-2 rounded-full bg-blue-600" />
      <span>{label}</span>
    </div>
  );
}
