"use client";

import { useActionState, useEffect } from "react";
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
import LoadingButton from "@/components/custom/loading-button";
import { signInSchema } from "@/lib/zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import Link from "next/link";
import { serverMessage } from "@/schemas/setverMessage";
import { signInAction } from "@/actions/auth/sing-in";
import { useRouter } from "next/navigation";

export default function SignIn() {
	const router = useRouter();

	const [state, formAction, isPending] = useActionState<serverMessage, FormData>(signInAction, { success: false, error: false });

	const form = useForm<z.infer<typeof signInSchema>>({
		resolver: zodResolver(signInSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	});

	useEffect(() => {
		console.log('state', state)
		if (state.success) {
		console.log('paso bien', state)
			router.push("/");
		}
	}, [state]);

	return (
		<div className="grow flex items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="text-3xl font-bold text-center text-gray-800">
						Sign In
					</CardTitle>
				</CardHeader>
				<h1>{state.success}</h1>
				<h1>{state.error}</h1>

				<CardContent>
					<Form {...form}>
						<form
							action={formAction}
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
							{state.error && (
								<p className="text-red-500 text-sm">{state.error}</p>
							)}
							<LoadingButton pending={isPending}>
								Sign in
							</LoadingButton>
						</form>
					</Form>

					<div className="mt-4 text-center text-sm">
						<Link
							href="/forgot-password"
							className="text-primary hover:underline"
						>
							¿Olvidaste tu contraseña?
						</Link>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}