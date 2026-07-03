import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import type { User } from "../types";

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadUsers();
  }, []);

  async function loadUsers() {
    const result = await apiFetch<{ users: User[] }>("/api/users");
    setUsers(result.users);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);

    try {
      await apiFetch("/api/users", {
        method: "POST",
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          password: formData.get("password")
        })
      });
      event.currentTarget.reset();
      await loadUsers();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to create user.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <form className="rounded-lg border border-slate-200 bg-white p-4" onSubmit={handleCreate}>
        <h2 className="text-lg font-semibold text-slate-950">Create Agent</h2>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Name
          <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" name="name" />
        </label>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Email
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            name="email"
            type="email"
          />
        </label>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Password
          <input
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            name="password"
            type="password"
          />
        </label>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <button className="mt-4 rounded-md bg-slate-950 px-4 py-2 text-sm text-white" type="submit">
          Create agent
        </button>
      </form>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3 text-slate-950">{user.name}</td>
                <td className="px-4 py-3 text-slate-600">{user.email}</td>
                <td className="px-4 py-3 text-slate-600">{user.role}</td>
                <td className="px-4 py-3 text-slate-600">{user.active ? "Active" : "Inactive"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

