// UsersTable.tsx (Server Component)
import { auth } from "@/auth";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";
import OrganizationSelect from "./OrganizationSelect";
import UserActions from "./useActions";
import {
	Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";

export default async function UsersTable() {
	const h = await headers();

	const session = await auth.api.getSession({ headers: h });
  
	const referer = h.get("referer") || "";
	const path = referer ? new URL(referer).pathname : "";
	const isAdminRoute = path.startsWith("/admin");

	const [users, organizations] = await Promise.all([
		prisma.user.findMany({
		  where: isAdminRoute && session?.user.role !== "root"
			? { organizationId: session?.user.organizationId! }
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
					{!isAdminRoute && <TableHead>Organización</TableHead>}
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
						{!isAdminRoute && (
							<TableCell>
								<OrganizationSelect
									userId={user.id}
									organizations={organizations!}
									userActualOrganization={user.organization!}
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
