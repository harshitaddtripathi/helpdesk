import { useEffect, useState } from "react";
import axios from "axios";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CreateUserForm } from "../components/users/CreateUserForm";
import { UsersTable } from "../components/users/UsersTable";
import type { UserListItem } from "../types";

const usersQueryKey = ["users"];

async function fetchUsers() {
  const response = await axios.get<{ users: UserListItem[] }>("/api/users", {
    withCredentials: true
  });

  return response.data.users;
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const usersQuery = useQuery({
    queryKey: usersQueryKey,
    queryFn: fetchUsers
  });

  async function handleUserCreated() {
    await queryClient.invalidateQueries({ queryKey: usersQueryKey });
    setIsCreateDialogOpen(false);
  }

  useEffect(() => {
    if (!isCreateDialogOpen) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsCreateDialogOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isCreateDialogOpen]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Users</h1>
        <button
          className="rounded-md bg-slate-950 px-4 py-2 text-sm text-white"
          onClick={() => setIsCreateDialogOpen(true)}
          type="button"
        >
          Create agent
        </button>
      </div>

      {isCreateDialogOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
          data-testid="create-agent-dialog-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsCreateDialogOpen(false);
            }
          }}
        >
          <div
            aria-labelledby="create-agent-heading"
            aria-modal="true"
            className="w-full max-w-md"
            role="dialog"
          >
            <CreateUserForm onCreated={handleUserCreated} />
          </div>
        </div>
      ) : null}

      <div>
        <UsersTable
          error={usersQuery.error}
          isError={usersQuery.isError}
          isLoading={usersQuery.isPending}
          users={usersQuery.data ?? []}
        />
      </div>
    </div>
  );
}
