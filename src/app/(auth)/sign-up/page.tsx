"use client";

import GoogleSignInButton from "@/components/custom/GoogleSignInButton";
import LoadingButton from "@/components/custom/LoadingButton";
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

import Link from "next/link";

import { authClient } from "@/auth-client";
import { useToast } from "@/hooks/use-toast";
import { signUpSchema } from "@/zod/AuthZod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

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
            description: "su cuenta fue creada, revise su email.",
          });
        },
        onError: (ctx) => {
          console.log("error", ctx);
          if (ctx.error.message === "User already exists") {
            toast({
              title: "Email ya registrado",
              description: "Trate con otro email o recupere su contraseña.",
            });
          } else {
            toast({
              title: "Algo paso",
              description: "Algo salio mal.",
            });
          }
        },
      },
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
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Crear Cuenta</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        {/* Botón de Google */}
        <GoogleSignInButton mode="signup" />

        {/* Separador */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">O regístrate con</span>
          </div>
        </div>

        {/* Formulario de registro */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
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

        {/* Link a sign-in */}
        <div className="text-center text-sm text-muted-foreground">
          ¿Ya tienes cuenta?{" "}
          <Link href="/sign-in" className="underline text-primary">
            Inicia sesión aquí
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
