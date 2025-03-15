// UsersTable.tsx (Server Component)
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
  } from "@/components/ui/table";
  import { auth } from "@/auth";
  import { headers } from "next/headers";
  import prisma from "@/lib/prisma";
  import OrganizationSelect from "./OrganizationSelect";
import UserActions from "./useActions";
import { UserWithOrg } from "@/schemas/UserWithOrg";
  
  export default async function UsersTable() {
	const users = await (await auth.api.listUsers({
		headers: await headers(),
		query: {
			limit: undefined,
		},
	})).users as UserWithOrg[];
	const organizations = await prisma.organization.findMany();

	const headersList = headers();
	const fullUrl = (await headersList).get("referer") || "";
	const isAdminRoute = fullUrl.includes("/admin");
	console.log('full', isAdminRoute)
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
			{!isAdminRoute && <TableHead>Organización</TableHead>}
			<TableHead>Acciones</TableHead>
		  </TableRow>
		</TableHeader>
		<TableBody>
		  {users.map((user) => {
			const currentOrg = organizations.find(
			  (org) => org.id === user.organizationId
			);
			return (
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
				<TableCell>
				  {new Date(user.createdAt).toLocaleDateString()}
				</TableCell>
				{!isAdminRoute && <TableCell>
				   <OrganizationSelect
					userId={user.id}
					organizations={organizations}
					userActualOrganization={currentOrg}
				  />
				</TableCell> }
				<TableCell>
					<UserActions
						userId={user.id}
						currentStatus={user.banned ?? false}
						currentRole={user.role ?? "indefinido"}
					/>
				</TableCell>
			  </TableRow>
			);
		  })}
		</TableBody>
	  </Table>
	);
  }
  