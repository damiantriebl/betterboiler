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
import { useToast } from "@/hooks/use-toast";
import { forgotPasswordAction } from "@/actions/fotgot-password";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordSchema } from "@/lib/zod";
import { z } from "zod";

export interface serverMessage {
	success: false | string,
	error: false | string
}
export default function ForgotPassword() {
	const { toast } = useToast();
	const [state, formAction, isPending] = useActionState<serverMessage, FormData>(forgotPasswordAction, { success: false, error: false });

	useEffect(()=>{
		if (state.error) {
			toast({
				title: "Error",
				description: state.error,
				variant: "destructive",
			});
		} else if(state.success){
			toast({
				title: "Éxito",
				description: state.success,
			});
		}
	},[state])

	const formResetPasswordSchema = useForm<z.infer<typeof forgotPasswordSchema>>({
		resolver: zodResolver(forgotPasswordSchema),
		defaultValues: {
			email: "",
		},
	});

	

	return (
		<div className="grow flex items-center justify-center p-4">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="text-3xl font-bold text-center text-gray-800">
						Recuperar contraseña
					</CardTitle>
				</CardHeader>
				<CardContent>
					<Form {...formResetPasswordSchema}>
						<form action={formAction} className="space-y-6">
							<FormField
								name="email"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Email</FormLabel>
										<FormControl>
											<Input
												type="email"
												placeholder="Ingrese su Email"
												{...field}
												autoComplete="email"
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<LoadingButton pending={isPending}>
								Enviar enlace de restablecimiento de contraseña
							</LoadingButton>
						</form>
					</Form>
				</CardContent>
			</Card>
		</div>
	);
}
