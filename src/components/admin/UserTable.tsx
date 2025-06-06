// UsersTable.tsx (Server Component)
import { auth } from "@/auth";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import prisma from "@/lib/prisma";
import type { Organization, User } from "@prisma/client";
import { headers } from "next/headers";
import OrganizationSelect from "./OrganizationSelect";
import UserActions from "./UseActions";

export default async function UsersTable() {
  const h = await headers();

  const session = await auth.api.getSession({ headers: h });

  const referer = h.get("referer") || "";
  const path = referer ? new URL(referer).pathname : "";
  const isAdminRoute = path.startsWith("/admin");

  // Verificar si el usuario actual es ROOT para mostrar el selector de organizaciones
  const isRootUser = session?.user.role === "root";

  const [users, organizations] = await Promise.all([
    prisma.user.findMany({
      where:
        isAdminRoute && session?.user.role !== "root" && session?.user.organizationId
          ? { organizationId: session.user.organizationId }
          : {},
      include: isAdminRoute ? undefined : { organization: true },
    }),
    isAdminRoute ? Promise.resolve(null) : prisma.organization.findMany(),
  ]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Rol</TableHead>
          <TableHead>Verificado</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Fecha Ingreso</TableHead>
          {!isAdminRoute && isRootUser && <TableHead>Organización</TableHead>}
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user.id}>
            <TableCell>{user.name}</TableCell>
            <TableCell>{user.email}</TableCell>
            <TableCell>{user.role}</TableCell>
            <TableCell>{user.emailVerified ? "Yes" : "No"}</TableCell>
            <TableCell>
              {user.banned ? (
                <span className="text-red-500">Banned</span>
              ) : (
                <span className="text-green-500">Active</span>
              )}
            </TableCell>
            <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
            {!isAdminRoute && isRootUser && (
              <TableCell>
                <OrganizationSelect
                  userId={user.id}
                  organizations={organizations ?? []}
                  userActualOrganization={
                    (user as User & { organization: Organization }).organization
                  }
                />
              </TableCell>
            )}
            <TableCell>
              <UserActions
                userId={user.id}
                currentStatus={user.banned ?? false}
                currentRole={user.role ?? "indefinido"}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
