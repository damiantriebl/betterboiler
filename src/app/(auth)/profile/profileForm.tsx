"use client";

import { updateUserAction } from "@/actions/auth/update-user";
import { Button } from "@/components/ui/button";
import { getLogoUrl } from "@/components/custom/OrganizationLogo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useActionState, useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const profileSchema = z.object({
  userId: z.string().nonempty(),
  name: z.string().min(1, "El nombre es obligatorio"),
  email: z.string().email("Correo electrónico inválido"),
  profileImageKey: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfileForm({
  user,
}: { user: { id: string; name: string; email: string } }) {
  const { toast } = useToast();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      userId: user.id,
      name: user.name,
      email: user.email,
    },
  });

  const [state, formAction, isPending] = useActionState(updateUserAction, {
    success: false,
    error: "",
  });

  const [profileImageKey, setProfileImageKey] = useState<string>("");
  const [profileImagePreview, setProfileImagePreview] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user.id) return;
    setIsUploading(true);
    try {
      // Pedir signed URL para S3
      const res = await fetch(`/api/s3/get-signed-url?name=profile/${user.id}/profile_400&operation=put`);
      const data = await res.json();
      if (!data.success?.url) throw new Error("No se pudo obtener la URL firmada");
      // Subir la imagen a S3
      await fetch(data.success.url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      // Guardar la key en el formulario
      setProfileImageKey(`profile/${user.id}/profile_400`);
      form.setValue("profileImageKey", `profile/${user.id}/profile_400`);
      // Mostrar preview usando getLogoUrl
      const previewUrl = await getLogoUrl(`profile/${user.id}/profile_400`);
      setProfileImagePreview(previewUrl);
    } catch (err) {
      setProfileImageKey("");
      setProfileImagePreview("");
      toast({ title: "Error", description: "No se pudo subir la imagen de perfil", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = form.handleSubmit((data) => {
    const formData = new FormData();
    formData.append("userId", data.userId);
    formData.append("name", data.name);
    formData.append("email", data.email);
    if (profileImageKey) {
      formData.append("profileImageKey", profileImageKey);
    }
    startTransition(() => {
      formAction(formData);
    });
  });
  useEffect(() => {
    if (state.error) {
      toast({ title: "Error", description: state.error, variant: "destructive" });
    } else if (state.success) {
      toast({ title: "Éxito", description: "Perfil actualizado correctamente" });
    }
  }, [state, toast]);

  return (
    <Card className="w-[600px]">
      <CardHeader>
        <CardTitle className="text-2xl font-bold">Perfil</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-6">
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => <input type="hidden" {...field} />}
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
                  <Input type="email" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-2">
              <label htmlFor="profile-image-upload" className="text-xs font-medium">Subir imagen de perfil</label>
              <input
                id="profile-image-upload"
                type="file"
                accept="image/*"
                onChange={handleProfileImageChange}
                disabled={isUploading}
                className="block"
                title="Selecciona una imagen de perfil"
              />
              {isUploading && <span className="text-xs text-muted-foreground">Subiendo imagen...</span>}
              {profileImagePreview && (
                <div className="flex flex-col items-center mt-2">
                  <span className="text-xs text-muted-foreground mb-1">Preview de la imagen:</span>
                  <img
                    src={profileImagePreview}
                    alt="Preview imagen de perfil"
                    className="rounded-full border w-32 h-32 object-cover"
                  />
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isPending || !profileImageKey}>
              {isPending ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin h-5 w-5 text-white mr-2"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <title>Cargando</title>
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Guardando...
                </span>
              ) : (
                "Guardar Cambios"
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
