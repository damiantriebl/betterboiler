"use client";

import { startTransition, useActionState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { updateUserAction } from "@/actions/auth/update-user";
import UploadButton, { UploadResult } from "@/components/custom/uploadCropperButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import LoadingButton from "@/components/custom/loadingButton";
import { useToast } from "@/hooks/use-toast";

const profileSchema = z.object({
  userId: z.string().nonempty(),
  name: z.string().min(1, 'El nombre es obligatorio'),
  email: z.string().email('Correo electrónico inválido'),
  originalFile: z.instanceof(File).optional(),
  croppedFile: z.instanceof(Blob).optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfileForm({ user }: { user: { id: string; name: string; email: string } }) {
  const { toast } = useToast();

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      userId: user.id,
      name: user.name,
      email: user.email,
    },
  });

  const [state, formAction, isPending] = useActionState(updateUserAction, { success: false, error: '' });

  const handleUploadChange = ({ originalFile, croppedBlob }: UploadResult) => {
    form.setValue('originalFile', originalFile);
    form.setValue('croppedFile', croppedBlob);
  };

  const onSubmit = form.handleSubmit((data) => {
    const formData = new FormData();
    formData.append('userId', data.userId);
    formData.append('name', data.name);
    formData.append('email', data.email);
    if (data.originalFile) {
      formData.append('originalFile', data.originalFile, data.originalFile.name);
    }
    if (data.croppedFile) {
      formData.append('croppedFile', data.croppedFile, 'cropped.jpg');
    }

    startTransition(() => {
      formAction(formData);
    });
  });
  useEffect(() => {
    if (state.error) {
      toast({ title: 'Error', description: state.error, variant: 'destructive' });
    } else if (state.success) {
      toast({ title: 'Éxito', description: 'Perfil actualizado correctamente' });
    }
  }, [state, toast]);

  return (
    <Card className="w-1/2">
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
            <UploadButton placeholder="Subir imagen de perfil" onChange={handleUploadChange} />
            <LoadingButton pending={isPending}>Guardar Cambios</LoadingButton>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
