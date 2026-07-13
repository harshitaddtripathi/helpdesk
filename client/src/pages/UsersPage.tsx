import { useEffect, useState } from "react";
import axios from "axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { CreateUserForm } from "../components/users/CreateUserForm";
import { UsersTable } from "../components/users/UsersTable";
import { Alert, AlertDescription } from "../components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "../components/ui/alert-dialog";
import { getRequestErrorMessage } from "../lib/request-error";
import type { UserListItem } from "../types";

const usersQueryKey = ["users"];

type UserFormDialogState =
  | { mode: "create" }
  | { mode: "edit"; user: UserListItem }
  | null;

async function fetchUsers() {
  const response = await axios.get<{ users: UserListItem[] }>("/api/users", {
    withCredentials: true
  });

  return response.data.users;
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const [userFormDialog, setUserFormDialog] = useState<UserFormDialogState>(null);
  const [deletingUser, setDeletingUser] = useState<UserListItem | null>(null);

  const usersQuery = useQuery({
    queryKey: usersQueryKey,
    queryFn: fetchUsers
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await axios.delete(`/api/users/${userId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: usersQueryKey });
      setDeletingUser(null);
    }
  });

  function closeUserFormDialog() {
    setUserFormDialog(null);
  }

  function closeDeleteDialog() {
    if (!deleteUserMutation.isPending) {
      setDeletingUser(null);
      deleteUserMutation.reset();
    }
  }

  async function handleUserSaved() {
    await queryClient.invalidateQueries({ queryKey: usersQueryKey });
    closeUserFormDialog();
  }

  useEffect(() => {
    if (!userFormDialog) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeUserFormDialog();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [userFormDialog]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
            Administration
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">Users</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage agent access and support team permissions.
          </p>
        </div>
        <button
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm shadow-blue-950/10 transition-colors hover:bg-blue-700"
          onClick={() => setUserFormDialog({ mode: "create" })}
          type="button"
        >
          <Plus aria-hidden="true" className="h-4 w-4" />
          Create agent
        </button>
      </div>

      {userFormDialog ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          data-testid={
            userFormDialog.mode === "edit"
              ? "edit-agent-dialog-backdrop"
              : "create-agent-dialog-backdrop"
          }
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeUserFormDialog();
            }
          }}
        >
          <div
            aria-labelledby={
              userFormDialog.mode === "edit" ? "edit-agent-heading" : "create-agent-heading"
            }
            aria-modal="true"
            className="w-full max-w-md"
            role="dialog"
          >
            {userFormDialog.mode === "edit" ? (
              <CreateUserForm
                key={userFormDialog.user.id}
                mode="edit"
                onUpdated={handleUserSaved}
                user={userFormDialog.user}
              />
            ) : (
              <CreateUserForm onCreated={handleUserSaved} />
            )}
          </div>
        </div>
      ) : null}

      <div>
        <UsersTable
          error={usersQuery.error}
          isError={usersQuery.isError}
          isLoading={usersQuery.isPending}
          onDelete={(user) => {
            deleteUserMutation.reset();
            setDeletingUser(user);
          }}
          onEditUser={(user) => setUserFormDialog({ mode: "edit", user })}
          users={usersQuery.data ?? []}
        />
      </div>

      <AlertDialog open={Boolean(deletingUser)} onOpenChange={(open) => !open && closeDeleteDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingUser?.name}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteUserMutation.isError ? (
            <Alert className="mt-4" variant="destructive">
              <AlertDescription>
                {getRequestErrorMessage(deleteUserMutation.error, "Failed to delete user.")}
              </AlertDescription>
            </Alert>
          ) : null}

          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              disabled={deleteUserMutation.isPending}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-md bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-60"
              disabled={deleteUserMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (deletingUser) {
                  deleteUserMutation.mutate(deletingUser.id);
                }
              }}
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
