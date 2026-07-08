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
  users: UserListItem[];
};

export function UsersTable({ error, isError, isLoading, users }: UsersTableProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
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
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell className="text-slate-500" colSpan={4}>
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
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
