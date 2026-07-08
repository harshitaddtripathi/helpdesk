import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { createUserSchema, type CreateUserInput } from "core";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiFetch } from "../../lib/api";
import { getRequestErrorMessage } from "../../lib/request-error";
import { Alert, AlertDescription } from "../ui/alert";

const createUserFormSchema = z.object({
  name: createUserSchema.shape.name,
  agentEmail: createUserSchema.shape.email,
  agentPassword: createUserSchema.shape.password
});

type CreateUserFormValues = z.infer<typeof createUserFormSchema>;

type CreateUserFormProps = {
  onCreated: () => Promise<void> | void;
};

export function CreateUserForm({ onCreated }: CreateUserFormProps) {
  const [formError, setFormError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserFormSchema),
    defaultValues: {
      name: "",
      agentEmail: "",
      agentPassword: ""
    }
  });

  const createUserMutation = useMutation({
    mutationFn: async (values: CreateUserInput) => {
      await apiFetch("/api/users", {
        method: "POST",
        body: JSON.stringify(values)
      });
    },
    onSuccess: async () => {
      await onCreated();
    }
  });

  async function handleCreate(values: CreateUserFormValues) {
    setFormError("");

    try {
      await createUserMutation.mutateAsync({
        name: values.name,
        email: values.agentEmail,
        password: values.agentPassword
      });

      reset();
    } catch (requestError) {
      setFormError(getRequestErrorMessage(requestError, "Failed to create user."));
    }
  }

  return (
    <form
      aria-labelledby="create-agent-heading"
      autoComplete="off"
      className="rounded-lg border border-slate-200 bg-white p-4"
      noValidate
      onSubmit={handleSubmit(handleCreate, () => setFormError(""))}
    >
      <h2 className="text-lg font-semibold text-slate-950" id="create-agent-heading">
        Create Agent
      </h2>

      <label className="mt-4 block text-sm font-medium text-slate-700">
        Name
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          autoComplete="off"
          aria-invalid={errors.name ? "true" : "false"}
          {...register("name")}
          required
        />
        {errors.name?.message ? (
          <span className="mt-1 block text-xs text-red-600" role="alert">
            {errors.name.message}
          </span>
        ) : null}
      </label>

      <label className="mt-4 block text-sm font-medium text-slate-700">
        Email
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          autoComplete="off"
          aria-invalid={errors.agentEmail ? "true" : "false"}
          type="email"
          {...register("agentEmail")}
          required
        />
        {errors.agentEmail?.message ? (
          <span className="mt-1 block text-xs text-red-600" role="alert">
            {errors.agentEmail.message}
          </span>
        ) : null}
      </label>

      <label className="mt-4 block text-sm font-medium text-slate-700">
        Password
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          autoComplete="new-password"
          aria-invalid={errors.agentPassword ? "true" : "false"}
          type="password"
          {...register("agentPassword")}
          required
        />
        {errors.agentPassword?.message ? (
          <span className="mt-1 block text-xs text-red-600" role="alert">
            {errors.agentPassword.message}
          </span>
        ) : null}
      </label>

      {formError ? (
        <Alert className="mt-4" variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <button
        className="mt-4 rounded-md bg-slate-950 px-4 py-2 text-sm text-white disabled:opacity-60"
        type="submit"
        disabled={createUserMutation.isPending}
      >
        {createUserMutation.isPending ? "Creating..." : "Create agent"}
      </button>
    </form>
  );
}
