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

export default function UsersTable() {
	const [users, setUsers] = useState<User[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	useEffect(() => {
		const fetchUsers = async () => {
			try {
				setIsLoading(true);
				const response = await authClient.admin.listUsers({
					query: { limit: 10 },
				});
				if (response?.data) {
					setUsers(response.data.users as User[]);
				}
			} catch (err) {
				setError(
					err instanceof Error ? err : new Error("Failed to fetch users")
				);
			} finally {
				setIsLoading(false);
			}
		};
		fetchUsers();
	}, []);

	if (isLoading) {
		return (
			<div className="flex justify-center p-4">
				<span>Loading users...</span>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex justify-center p-4">
				<span className="text-red-500">Error: {error.message}</span>
			</div>
		);
	}

	const toggleAdmin = async ({ id, role, }: { id: string; role: string; }) => {
		try {
			const newRole = role === "user" ? "admin" : "user";
			await authClient.admin.setRole({
				userId: id,
				role: newRole,
			});
			setUsers((prev) =>
				prev.map((u) => (u.id === id ? { ...u, role: newRole } : u))
			);
		} catch (error) {
			console.error("Error Al cambiar el rol:", error);
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
					title: "baneado",
					description: "El usuario fue baneado correctamente.",
					variant: "destructive",
				})
				setUsers((prev) =>
					prev.map((u) => (u.id === id ? { ...u, banned: true, status: "Banned" } : u))
				);
			} catch (error) {
				toast({
					title: "fallo el baneo",
					description: "Algo salio mal",
					variant: "destructive",
				})
			}

		} else {
			await authClient.admin.unbanUser({
				userId: id
			});
			setUsers((prev) =>
				prev.map((u) => (u.id === id ? { ...u, banned: false, status: "Active" } : u))
			);
			toast({
				title: "remover baneado",
				description: "El usuario no esta mas baneado.",
				variant: "destructive",
			})
		}
	}

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
									{user.role === "user" ? "Habilitar Admin" : "Deshabilitar Admin"}
								</Button>


								<Button
									onClick={() =>
										toggleBan({ id: user.id, isBanned: user.banned })
									}
									variant="secondary"
								>
									{user.banned ? "Desbanear" : "Banear"}
								</Button>
							</div>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
