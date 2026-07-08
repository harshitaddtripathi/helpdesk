import { FormEvent, useState } from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import { Alert, AlertDescription } from "../components/ui/alert";
import { Badge } from "../components/ui/badge";
import { Skeleton } from "../components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "../components/ui/table";
import { UserRole, type UserListItem } from "../types";

const usersQueryKey = ["users"];

async function fetchUsers() {
  const response = await axios.get<{ users: UserListItem[] }>("/api/users", {
    withCredentials: true
  });

  return response.data.users;
}

function getRequestErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message;
  }

  return error instanceof Error ? error.message : fallback;
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState("");

  const usersQuery = useQuery({
    queryKey: usersQueryKey,
    queryFn: fetchUsers
  });

  const createUserMutation = useMutation({
    mutationFn: async (values: { name: string; email: string; password: string }) => {
      await apiFetch("/api/users", {
        method: "POST",
        body: JSON.stringify(values)
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: usersQueryKey });
    }
  });

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      await createUserMutation.mutateAsync({
        name: String(formData.get("name") ?? "").trim(),
        email: String(formData.get("email") ?? "").trim(),
        password: String(formData.get("password") ?? "")
      });

      form.reset();
    } catch (requestError) {
      setFormError(getRequestErrorMessage(requestError, "Failed to create user."));
    }
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Users</h1>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <form
          aria-labelledby="create-agent-heading"
          className="rounded-lg border border-slate-200 bg-white p-4"
          onSubmit={handleCreate}
        >
          <h2 className="text-lg font-semibold text-slate-950" id="create-agent-heading">
            Create Agent
          </h2>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            Name
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              name="name"
              required
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            Email
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              name="email"
              type="email"
              required
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-slate-700">
            Password
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
              name="password"
              type="password"
              minLength={8}
              required
            />
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

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {usersQuery.isPending ? (
            <UsersTableSkeleton />
          ) : usersQuery.isError ? (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertDescription>
                  {getRequestErrorMessage(usersQuery.error, "Failed to load users.")}
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersQuery.data.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-slate-500" colSpan={4}>
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  usersQuery.data.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium text-slate-950">{user.name}</TableCell>
                      <TableCell className="text-slate-600">{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === UserRole.Admin ? "default" : "secondary"}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}

function UsersTableSkeleton() {
  return (
    <Table aria-label="Loading users">
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: 4 }, (_, index) => (
          <TableRow data-testid="user-row-skeleton" key={index}>
            <TableCell>
              <Skeleton className="h-4 w-32" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-52" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-6 w-16" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-24" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
