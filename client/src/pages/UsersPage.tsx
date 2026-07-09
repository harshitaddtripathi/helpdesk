import { useEffect, useState } from "react";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CreateUserForm } from "../components/users/CreateUserForm";
import { UsersTable } from "../components/users/UsersTable";
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

  const usersQuery = useQuery({
    queryKey: usersQueryKey,
    queryFn: fetchUsers
  });

  function closeUserFormDialog() {
    setUserFormDialog(null);
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
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Users</h1>
        <button
          className="rounded-md bg-slate-950 px-4 py-2 text-sm text-white"
          onClick={() => setUserFormDialog({ mode: "create" })}
          type="button"
        >
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
          onEditUser={(user) => setUserFormDialog({ mode: "edit", user })}
          users={usersQuery.data ?? []}
        />
      </div>
    </div>
  );
}
