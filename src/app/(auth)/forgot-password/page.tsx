"use client";

import { useState } from "react";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { authClient } from "@/auth-client";
import { useToast } from "@/hooks/use-toast";
import { forgotPasswordSchema } from "@/lib/zod";

export default function ForgotPassword() {
	const { toast } = useToast();
	const [isPending, setIsPending] = useState(false);

	const form = useForm<z.infer<typeof forgotPasswordSchema>>({
		resolver: zodResolver(forgotPasswordSchema),
		defaultValues: {
			email: "",
		},
	});

	/* const onSubmit = async (data: z.infer<typeof forgotPasswordSchema>) => {
		setIsPending(true);		
		try {
			const { error } = await authClient.forgetPassword({
				email: data.email,
				redirectTo: "/reset-password",
			});
			
			console.log('error',error)
			if (error) {
				if (error.message === "USER_NOT_FOUND") {
					toast({
						title: "Usuario no encontrado",
						description: "No existe ninguna cuenta registrada con este email.",
						variant: "destructive",
					});
				} else {
					toast({
						title: "Error",
						description: error.message || "Ocurrió un error inesperado.",
						variant: "destructive",
					});
				}
			} else {
				toast({
					title: "Éxito",
					description:
						"Si existe una cuenta con este email, recibirás un link para restablecer tu contraseña.",
				});
			}
		} catch (err) {
			console.error("Error crítico:", err);
			toast({
				title: "Error",
				description: "Ocurrió un problema al procesar tu solicitud.",
				variant: "destructive",
			});
		} finally {
			setIsPending(false);
		}
	}; */
	return (
		<div className="grow flex items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="text-3xl font-bold text-center text-gray-800">
						Recuperar contraseña
					</CardTitle>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form action={forgotPasswordSchema} className="space-y-6">
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Email</FormLabel>
										<FormControl>
											<Input
												type="email"
												placeholder="entre su Email"
												{...field}
												autoComplete="email"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<LoadingButton pending={isPending}>Enviar el link de reseto de contraseña</LoadingButton>
						</form>
					</Form>
				</CardContent>
			</Card>
		</div>
	);
}