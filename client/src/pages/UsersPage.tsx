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

  const usersQuery = useQuery({
    queryKey: usersQueryKey,
    queryFn: fetchUsers
  });

  async function handleUserCreated() {
    await queryClient.invalidateQueries({ queryKey: usersQueryKey });
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Users</h1>

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <CreateUserForm onCreated={handleUserCreated} />
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
