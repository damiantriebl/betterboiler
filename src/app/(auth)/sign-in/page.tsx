"use client";

import AuthGuard from "@/components/custom/AuthGuard";
import GoogleSignInButton from "@/components/custom/GoogleSignInButton";
import LoadingButton from "@/components/custom/LoadingButton";
import { Button } from "@/components/ui/button";
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
import { signInSchema } from "@/zod/AuthZod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import { authClient } from "@/auth-client";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { ErrorContext } from "@better-fetch/fetch";

export default function SignIn() {
  const searchParams = useSearchParams();
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
      });
    }
  }, [searchParams, toast]);

  const handleCredentialsSignIn = async (values: z.infer<typeof signInSchema>) => {
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
      },
    );
    setPendingCredentials(false);
  };

  return (
    <AuthGuard requireAuth={false}>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {/* Botón de Google */}
          <GoogleSignInButton mode="signin" />

          {/* Separador */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">O continúa con</span>
            </div>
          </div>

          {/* Formulario de email/password */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCredentialsSignIn)} className="grid gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="m@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <LoadingButton pending={pendingCredentials}>Iniciar Sesión</LoadingButton>
            </form>
          </Form>

          {/* Separador para el botón de crear cuenta */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                O puedes crear una cuenta nueva
              </span>
            </div>
          </div>

          {/* Botón prominente para crear cuenta */}
          <Button variant="secondary" className="w-full" asChild>
            <Link href="/sign-up">🆕 Crear cuenta nueva</Link>
          </Button>

          {/* Link pequeño adicional */}
          <div className="text-center text-sm text-muted-foreground">
            ¿Olvidaste tu contraseña?{" "}
            <Link href="/forgot-password" className="underline text-primary">
              Recupérala aquí
            </Link>
          </div>
        </CardContent>
      </Card>
    </AuthGuard>
  );
}
