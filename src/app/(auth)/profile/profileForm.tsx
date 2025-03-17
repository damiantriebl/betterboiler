"use client";

import { useActionState } from "react";
import { updateUserAction } from "@/actions/auth/update-user";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import LoadingButton from "@/components/custom/loadingButton";

// Schema para validación
const profileSchema = z.object({
  userId: z.string().nonempty(),
  name: z.string().min(1, { message: "El nombre es obligatorio" }),
  email: z.string().email({ message: "Correo electrónico inválido" }),
});

type FormData = z.infer<typeof profileSchema>;

interface ServerMessage {
  success: false | string;
  error: false | string;
  userId?: string;
  name?: string;
  email?: string;
}

export default function ProfileForm({
  user,
}: {
  user: { id: string; name: string; email: string };
}) {
  const { toast } = useToast();
  
  // Estado inicial de usuario
  const initialValues = {
    userId: user.id,
    name: user.name,
    email: user.email,
  };

  // Estado y acción del servidor
  const [state, formAction, isPending] = useActionState<ServerMessage, FormData>(
    updateUserAction, 
    { success: false, error: false }
  );

  // Configuración del formulario
  const form = useForm<FormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialValues,
  });

  // Resetear los valores del formulario cuando cambia el usuario
  useEffect(() => {
    form.reset(initialValues);
  }, [user]);

  // Mostrar toast cuando haya una respuesta del servidor
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
      });
    }
  }, [state, toast]);

  return (
    <Card className="w-1/2">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Perfil</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form action={formAction} className="space-y-6">
            <input type="hidden" name="userId" value={user.id} />
            
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Correo Electrónico</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <LoadingButton pending={isPending}>
              Guardar Cambios
            </LoadingButton>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}