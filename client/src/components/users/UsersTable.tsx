import { Pencil, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "../ui/alert";
import { Badge } from "../ui/badge";
import { Skeleton } from "../ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "../ui/table";
import { getRequestErrorMessage } from "../../lib/request-error";
import { UserRole, type UserListItem } from "../../types";

type UsersTableProps = {
  error: unknown;
  isError: boolean;
  isLoading: boolean;
  onDelete: (user: UserListItem) => void;
  onEditUser: (user: UserListItem) => void;
  users: UserListItem[];
};

export function UsersTable({
  error,
  isError,
  isLoading,
  onDelete,
  onEditUser,
  users
}: UsersTableProps) {
  return (
    <div className="panel-surface overflow-hidden rounded-lg">
      {isLoading ? (
        <UsersTableSkeleton />
      ) : isError ? (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertDescription>{getRequestErrorMessage(error, "Failed to load users.")}</AlertDescription>
          </Alert>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell className="text-slate-500" colSpan={6}>
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-semibold text-slate-950">{user.name}</TableCell>
                  <TableCell className="text-slate-600">{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === UserRole.Admin ? "default" : "secondary"}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.active ? "default" : "secondary"}>
                      {user.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-data text-xs text-slate-600">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        aria-label={`Edit ${user.name}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                        onClick={() => onEditUser(user)}
                        title={`Edit ${user.name}`}
                        type="button"
                      >
                        <Pencil aria-hidden="true" className="h-4 w-4" />
                      </button>
                      {user.role !== UserRole.Admin ? (
                        <button
                          aria-label={`Delete ${user.name}`}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => onDelete(user)}
                          title={`Delete ${user.name}`}
                          type="button"
                        >
                          <Trash2 aria-hidden="true" className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      )}
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
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="text-right">Actions</TableHead>
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
              <Skeleton className="h-6 w-16" />
            </TableCell>
            <TableCell>
              <Skeleton className="h-4 w-24" />
            </TableCell>
            <TableCell className="text-right">
              <Skeleton className="ml-auto h-9 w-9" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
