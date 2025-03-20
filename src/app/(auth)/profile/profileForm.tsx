"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { updateUserAction } from "@/actions/auth/update-user";
import { useState } from "react";
import UploadButton from "@/components/custom/uploadCropperButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import LoadingButton from "@/components/custom/loadingButton";
import { useToast } from "@/hooks/use-toast";

const profileSchema = z.object({
  userId: z.string().nonempty(),
  name: z.string().min(1, "El nombre es obligatorio"),
  email: z.string().email("Correo electrónico inválido"),
});

// Tipos
type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfileForm({ user }: { user: { id: string; name: string; email: string } }) {
  const { toast } = useToast();

  // RHF config
  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      userId: user.id,
      name: user.name,
      email: user.email,
    },
  });

  // Estados locales para archivos
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [croppedBlob, setCroppedBlob] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Handler de envío manual
  const onSubmit = form.handleSubmit(async (data) => {
    try {
      setIsLoading(true);

      // 1. Armar FormData con TODOS los datos
      const formData = new FormData();
      formData.append("userId", data.userId);
      formData.append("name", data.name);
      formData.append("email", data.email);

      // 2. Adjuntar archivos si existen
      if (originalFile) {
        //  append(name, file/blob, filename)
        formData.append("originalFile", originalFile, originalFile.name);
      }
      if (croppedBlob) {
        formData.append("croppedFile", croppedBlob, "cropped.jpg");
      }

      // 3. Llamar la server action con el FormData
      const result = await updateUserAction({}, formData);
      // Manejar respuesta
      if (result.error) {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else if (result.success) {
        toast({ title: "Éxito", description: result.success });
      }
    } catch (error) {
      toast({ title: "Error", description: String(error), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  });

  return (
    <Card className="w-1/2">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Perfil</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Este Form de shadcn es solo estilístico, no hace el post */}
        <Form {...form}>
          {/* Usamos onSubmit propio en vez de action=... */}
          <form onSubmit={onSubmit} className="space-y-6">
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <input type="hidden" {...field} />
              )}
            />

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre</FormLabel>
                  <Input {...field} />
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
                  <Input {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <UploadButton
              placeholder="Subir imagen de perfil"
              onChange={({ originalFile, croppedBlob }) => {
                setOriginalFile(originalFile);
                setCroppedBlob(croppedBlob);
              }}
            />

            <LoadingButton pending={isLoading}>
              Guardar Cambios
            </LoadingButton>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
