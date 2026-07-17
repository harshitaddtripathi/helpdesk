import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { createUserSchema, type CreateUserInput, type UpdateAgentInput } from "core";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { apiFetch } from "../../lib/api";
import { getRequestErrorMessage } from "../../lib/request-error";
import type { UserListItem } from "../../types";
import { Alert, AlertDescription } from "../ui/alert";

const inputClassName = (hasError: boolean) =>
  `field-control mt-1 h-10 w-full rounded-md px-3 text-sm ${
    hasError ? "border-red-500 focus:border-red-600" : ""
  }`;

const createUserFormSchema = z.object({
  name: createUserSchema.shape.name,
  agentEmail: createUserSchema.shape.email,
  agentPassword: createUserSchema.shape.password,
  active: z.boolean().optional()
});

const editUserFormSchema = z.object({
  name: createUserSchema.shape.name,
  agentEmail: createUserSchema.shape.email,
  agentPassword: z
    .string()
    .trim()
    .refine(
      (password) => password.length === 0 || password.length >= 8,
      "Password must be at least 8 letters."
    ),
  active: z.boolean().optional()
});

type UserFormValues = z.infer<typeof createUserFormSchema>;

type CreateUserFormProps = {
  mode?: "create";
  onCreated: () => Promise<void> | void;
};

type EditUserFormProps = {
  mode: "edit";
  onUpdated: () => Promise<void> | void;
  user: UserListItem;
};

type UserFormProps = CreateUserFormProps | EditUserFormProps;

export function CreateUserForm(props: UserFormProps) {
  const isEditMode = props.mode === "edit";
  const user = isEditMode ? props.user : undefined;
  const [formError, setFormError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<UserFormValues>({
    resolver: zodResolver(isEditMode ? editUserFormSchema : createUserFormSchema),
    defaultValues: {
      name: user?.name ?? "",
      agentEmail: user?.email ?? "",
      agentPassword: "",
      active: user?.active ?? true
    }
  });
  const formHeading = isEditMode ? "Edit Agent" : "Create Agent";
  const headingId = isEditMode ? "edit-agent-heading" : "create-agent-heading";

  useEffect(() => {
    reset({
      name: user?.name ?? "",
      agentEmail: user?.email ?? "",
      agentPassword: "",
      active: user?.active ?? true
    });
    setFormError("");
  }, [reset, user?.email, user?.id, user?.name]);

  const saveUserMutation = useMutation({
    mutationFn: async (values: UserFormValues) => {
      if (props.mode === "edit") {
        const payload: UpdateAgentInput = {
          name: values.name,
          email: values.agentEmail,
          active: values.active ?? true
        };
        const password = values.agentPassword.trim();

        if (password) {
          payload.password = password;
        }

        await apiFetch(`/api/users/${props.user.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        return;
      }

      const payload: CreateUserInput = {
        name: values.name,
        email: values.agentEmail,
        password: values.agentPassword
      };

      await apiFetch("/api/users", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    },
    onSuccess: async () => {
      if (props.mode === "edit") {
        await props.onUpdated();
        return;
      }

      await props.onCreated();
    }
  });

  async function handleSave(values: UserFormValues) {
    setFormError("");

    try {
      await saveUserMutation.mutateAsync(values);

      if (props.mode !== "edit") {
        reset();
      }
    } catch (requestError) {
      setFormError(
        getRequestErrorMessage(
          requestError,
          props.mode === "edit" ? "Failed to update user." : "Failed to create user."
        )
      );
    }
  }

  return (
    <form
      aria-labelledby={headingId}
      autoComplete="off"
      className="panel-surface rounded-lg p-4"
      noValidate
      onSubmit={handleSubmit(handleSave, () => setFormError(""))}
    >
      <h2 className="text-lg font-semibold tracking-tight text-slate-950" id={headingId}>
        {formHeading}
      </h2>

      <label className="mt-4 block text-sm font-medium text-slate-700">
        Name
        <input
          className={inputClassName(Boolean(errors.name))}
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
          className={inputClassName(Boolean(errors.agentEmail))}
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
          className={inputClassName(Boolean(errors.agentPassword))}
          autoComplete="new-password"
          aria-invalid={errors.agentPassword ? "true" : "false"}
          type="password"
          {...register("agentPassword")}
          required={!isEditMode}
        />
        {errors.agentPassword?.message ? (
          <span className="mt-1 block text-xs text-red-600" role="alert">
            {errors.agentPassword.message}
          </span>
        ) : null}
      </label>

      {isEditMode ? (
        <label className="mt-4 flex items-center gap-2 text-sm font-medium text-slate-700">
          <input className="h-4 w-4 rounded border-slate-300" type="checkbox" {...register("active")} />
          Active
        </label>
      ) : null}

      {formError ? (
        <Alert className="mt-4" variant="destructive">
          <AlertDescription className="font-medium text-red-700">{formError}</AlertDescription>
        </Alert>
      ) : null}

      <button
        className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        type="submit"
        disabled={saveUserMutation.isPending}
      >
        {saveUserMutation.isPending
          ? isEditMode
            ? "Saving..."
            : "Creating..."
          : isEditMode
            ? "Save changes"
            : "Create agent"}
      </button>
    </form>
  );
}
