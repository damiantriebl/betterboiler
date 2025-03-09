"use client";

import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { User } from "@prisma/client";
import { useState, useEffect } from "react";
import { authClient } from "@/auth-client";
import { Button } from "../ui/button";
import { toast } from "@/hooks/use-toast";

interface ExtendedUser extends User {
	organizationId?: string;
}

export default function UsersTable() {
	const [users, setUsers] = useState<ExtendedUser[]>([]);
	const [organizations, setOrganizations] = useState<any[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const [usersRes, orgRes] = await Promise.all([
					authClient.admin.listUsers({ query: { limit: 10 } }),
					authClient.organization.list(),
				]);
				if (usersRes?.data)
					setUsers(usersRes.data.users as ExtendedUser[]);
				if (orgRes?.data)
					setOrganizations(orgRes.data);
			} catch (err) {
				setError(
					err instanceof Error
						? err
						: new Error("Error fetching data")
				);
			} finally {
				setIsLoading(false);
			}
		};
		fetchData();
	}, []);

	const assignOrganization = async (userId: string, orgId: string) => {
		try {
			await authClient.organization.addMember({
				organizationId: orgId,
				userId,
				role: "member",
			});
			setUsers((prev) =>
				prev.map((u) =>
					u.id === userId ? { ...u, organizationId: orgId } : u
				)
			);
			toast({
				title: "Organización asignada",
				description: "Asignada correctamente",
				variant: "success",
			});
		} catch (error) {
			toast({
				title: "Error",
				description: "No se pudo asignar",
				variant: "destructive",
			});
		}
	};

	if (isLoading)
		return (
			<div className="flex justify-center p-4">
				<span>Loading users...</span>
			</div>
		);

	if (error)
		return (
			<div className="flex justify-center p-4">
				<span className="text-red-500">
					Error: {error.message}
				</span>
			</div>
		);

	const toggleAdmin = async ({ id, role }: { id: string; role: string; }) => {
		try {
			const newRole = role === "user" ? "admin" : "user";
			await authClient.admin.setRole({ userId: id, role: newRole });
			setUsers((prev) =>
				prev.map((u) => (u.id === id ? { ...u, role: newRole } : u))
			);
		} catch (error) {
			console.error("Error al cambiar el rol:", error);
		}
	};

	const toggleBan = async ({ id, isBanned }: { id: string; isBanned: boolean; }) => {
		if (!isBanned) {
			try {
				await authClient.admin.banUser({
					userId: id,
					banReason: "Spamming",
				});
				toast({
					title: "Baneado",
					description: "El usuario fue baneado correctamente.",
					variant: "destructive",
				});
				setUsers((prev) =>
					prev.map((u) =>
						u.id === id ? { ...u, banned: true, status: "Banned" } : u
					)
				);
			} catch (error) {
				toast({
					title: "Fallo el baneo",
					description: "Algo salió mal",
					variant: "destructive",
				});
			}
		} else {
			await authClient.admin.unbanUser({ userId: id });
			setUsers((prev) =>
				prev.map((u) =>
					u.id === id ? { ...u, banned: false, status: "Active" } : u
				)
			);
			toast({
				title: "Remover baneado",
				description: "El usuario no está más baneado.",
				variant: "destructive",
			});
		}
	};

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
					<TableHead>Actions</TableHead>
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
						<TableCell>
							{new Date(user.createdAt).toLocaleDateString()}
						</TableCell>
						<TableCell>
							<div className="flex flex-row gap-4">
								<Button
									onClick={() =>
										toggleAdmin({ id: user.id, role: user.role })
									}
									variant="secondary"
								>
									{user.role === "user"
										? "Habilitar Admin"
										: "Deshabilitar Admin"}
								</Button>
								<Button
									onClick={() =>
										toggleBan({ id: user.id, isBanned: user.banned })
									}
									variant="secondary"
								>
									{user.banned ? "Desbanear" : "Banear"}
								</Button>
								<select
									value={user.organizationId || ""}
									onChange={(e) =>
										assignOrganization(user.id, e.target.value)
									}
								>
									<option value="" disabled>
										Selecciona una organización
									</option>
									{organizations.map((org) => (
										<option key={org.id} value={org.id}>
											{org.name}
										</option>
									))}
								</select>
							</div>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
