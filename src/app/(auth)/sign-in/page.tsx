"use client";

import { useState, useEffect } from "react";
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
import LoadingButton from "@/components/custom/LoadingButton";
import { signInSchema } from "@/zod/AuthZod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSearchParams } from "next/navigation"

import Link from "next/link";
import { authClient } from "@/auth-client";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

import { ErrorContext } from "@better-fetch/fetch";

export default function SignIn() {
	const searchParams = useSearchParams()
	const router = useRouter();
	const { toast } = useToast();
	const [pendingCredentials, setPendingCredentials] = useState(false);

	const form = useForm<z.infer<typeof signInSchema>>({
		resolver: zodResolver(signInSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	});
	useEffect(() => {
		if (searchParams.get("error") === "not-logged") {
			toast({
				title: "Error",
				description: "No estás logueado para acceder.",
				variant: "destructive",
			})
		}
	}, [searchParams])
	const handleCredentialsSignIn = async (
		values: z.infer<typeof signInSchema>
	) => {
		await authClient.signIn.email(
			{
				email: values.email,
				password: values.password,
			},
			{
				onRequest: () => {
					setPendingCredentials(true);
				},
				onSuccess: async () => {
					router.push("/");
					router.refresh();
				},
				onError: (ctx: ErrorContext) => {
					toast({
						title: "Something went wrong",
						description: ctx.error.message ?? "Something went wrong.",
						variant: "destructive",
					});
				},
			}
		);
		setPendingCredentials(false);
	};



	return (
		<div className="grow flex items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="text-3xl font-bold text-center text-gray-800">
						Ingresar
					</CardTitle>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(handleCredentialsSignIn)}
							className="space-y-6"
						>
							{["email", "password"].map((field) => (
								<FormField
									control={form.control}
									key={field}
									name={field as keyof z.infer<typeof signInSchema>}
									render={({ field: fieldProps }) => (
										<FormItem>
											<FormLabel>
												{field.charAt(0).toUpperCase() + field.slice(1)}
											</FormLabel>
											<FormControl>
												<Input
													type={field === "password" ? "password" : "email"}
													placeholder={`Enter your ${field}`}
													{...fieldProps}
													autoComplete={
														field === "password" ? "current-password" : "email"
													}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							))}
							<LoadingButton pending={pendingCredentials}>
								Ingresar
							</LoadingButton>
						</form>
					</Form>

					<div className="mt-4 text-center text-sm">
						<Link
							href="/forgot-password"
							className="text-primary hover:underline"
						>
							Olvidaste tu contraseña?
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}