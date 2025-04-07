"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import LoadingButton from "@/components/custom/loadingButton";

import Link from "next/link";

import { signUpSchema } from "@/lib/authZod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authClient } from "@/auth-client";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function SignUp() {
	const [pending, setPending] = useState(false);
	const { toast } = useToast();

	const form = useForm<z.infer<typeof signUpSchema>>({
		resolver: zodResolver(signUpSchema),
		defaultValues: {
			name: "",
			email: "",
			password: "",
			confirmPassword: "",
		},
	});

	const onSubmit = async (values: z.infer<typeof signUpSchema>) => {
		await authClient.signUp.email(
			{
				email: values.email,
				password: values.password,
				name: values.name,
			},
			{
				onRequest: () => {
					setPending(true);
				},
				onSuccess: () => {
					toast({
						title: "Cuenta Creada",
						description:
							"su cuenta fue creada, revise su email.",
					});
				},
				onError: (ctx) => {
					console.log("error", ctx);
					toast({
						title: "Algo paso",
						description: ctx.error.message ?? "Algo salio mal.",
					});
				},
			}
		);
		setPending(false);
	};

	const fields = [
		{ name: "name", label: "Nombre", type: "text" },
		{ name: "email", label: "Email", type: "email" },
		{ name: "password", label: "Contraseña", type: "password" },
		{ name: "confirmPassword", label: "Confirmar contraseña", type: "password" },
	] as const;

	return (
		<div className="grow flex items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="text-3xl font-bold text-center text-gray-800">
						Crear Cuenta
					</CardTitle>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
							{fields.map(({ name, label, type }) => (
								<FormField
									control={form.control}
									key={name}
									name={name as keyof z.infer<typeof signUpSchema>}
									render={({ field: fieldProps }) => (
										<FormItem>
											<FormLabel>{label}</FormLabel>
											<FormControl>
												<Input
													type={type}
													placeholder={`Ingrese ${label.toLowerCase()}`}
													{...fieldProps}
													autoComplete="off"
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							))}
							<LoadingButton pending={pending}>Crear cuenta</LoadingButton>
						</form>
					</Form>
					<div className="mt-4 text-center text-sm">
						<Link href="/sign-in" className="text-primary hover:underline">
							Ya tenes una cuenta, inicia sesión
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}