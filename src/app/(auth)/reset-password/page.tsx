"use client";

import { Suspense, useEffect, useActionState, startTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { resetPasswordSchema } from "@/zod/authZod";
import LoadingButton from "@/components/custom/LoadingButton";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { resetPasswordAction } from "@/actions/auth/reset-password";
import type { serverMessage } from "@/types/ServerMessageType";

function ResetPasswordContent() {
  const router = useRouter();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const token = searchParams.get("token");
  const [state, formAction, isPending] = useActionState<serverMessage, FormData>(
    resetPasswordAction,
    { success: false, error: false },
  );

  useEffect(() => {
    if (state.error) {
      toast({
        title: "Error",
        description: state.error,
        variant: "destructive",
      });
    } else if (state.success) {
      toast({
        title: "Éxito",
        description: state.success,
        variant: "success",
      });
      startTransition(() => {
        router.push("/sign-in");
      });
    }
  }, [state, toast, router]);

  const form = useForm<z.infer<typeof resetPasswordSchema>>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  if (error === "invalid_token") {
    return (
      <div className="grow flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center text-gray-800">
              Reset link invalido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-center text-gray-600">
                El link de restablecimiento de contraseña es inválido o ha expirado.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grow flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center text-gray-800">
            Resetear Password
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              action={(formData: FormData) => {
                if (token) {
                  formData.append("token", token);
                }
                formAction(formData);
              }}
              className="space-y-6"
            >
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nuevo Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Entrar el nuevo password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Password</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="Confirmar nuevo password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <LoadingButton pending={isPending}>Resetear Password</LoadingButton>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPassword() {
  return (
    <Suspense>
      <ResetPasswordContent />
    </Suspense>
  );
}
