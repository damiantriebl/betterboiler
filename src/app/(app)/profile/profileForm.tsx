"use client";

import { updateUserAction } from "@/actions/auth/update-user";
import UploadCropperButton, { type UploadResult } from "@/components/custom/UploadCropperButton";
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

import { getLogoUrl } from "@/components/custom/OrganizationLogo";
import { useToast } from "@/hooks/use-toast";
import { useSessionStore } from "@/stores/SessionStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const profileSchema = z.object({
  userId: z.string().nonempty(),
  name: z.string().min(1, "El nombre es obligatorio"),
  email: z.string().email("Correo electrónico inválido"),
  phone: z.string().optional(),
  address: z.string().optional(),
  profileOriginalKey: z.string().optional(),
  profileCropKey: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfileForm({
  user,
}: {
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    address?: string | null;
    profileOriginal?: string | null;
    profileCrop?: string | null;
  };
}) {
  const { toast } = useToast();
  const setSession = useSessionStore((state) => state.setSession);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const initialProfileOriginalKey = useRef(user.profileOriginal);
  const initialProfileCropKey = useRef(user.profileCrop);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      userId: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      address: user.address || "",
      profileOriginalKey: user.profileOriginal || "",
      profileCropKey: user.profileCrop || "",
    },
  });

  useEffect(() => {
    let isMounted = true;
    async function loadInitialPreview() {
      const s3KeyToLoad = user.profileCrop || user.profileOriginal;
      if (s3KeyToLoad) {
        setIsLoadingPreview(true);
        try {
          const url = await getLogoUrl(s3KeyToLoad);
          if (isMounted) {
            setProfileImagePreview(url || s3KeyToLoad);
          }
        } catch (error) {
          console.error("Error cargando preview inicial:", error);
          if (isMounted) setProfileImagePreview(s3KeyToLoad);
        } finally {
          if (isMounted) setIsLoadingPreview(false);
        }
      } else {
        if (isMounted) setProfileImagePreview(null);
      }
    }
    loadInitialPreview();
    return () => {
      isMounted = false;
    };
  }, [user.profileCrop, user.profileOriginal]);

  const [state, formAction, isPending] = useActionState(updateUserAction, {
    success: false,
  });

  const handleImageUploadAndCrop = async ({ originalFile, croppedFile }: UploadResult) => {
    if (!originalFile) return;
    setIsUploadingImage(true);
    setProfileImagePreview(null);

    let uploadedOriginalKey: string | null = null;
    let uploadedCropKey: string | null = null;

    try {
      const originalFileName = `profile/${user.id}/original_${Date.now()}_${originalFile.name}`;
      const resOriginal = await fetch(
        `/api/s3/get-signed-url?name=${encodeURIComponent(originalFileName)}&operation=put&contentType=${encodeURIComponent(originalFile.type)}`,
      );
      const dataOriginal = await resOriginal.json();
      if (!dataOriginal.success?.url)
        throw new Error("No se pudo obtener la URL firmada para la imagen original");
      await fetch(dataOriginal.success.url, {
        method: "PUT",
        body: originalFile,
        headers: { "Content-Type": originalFile.type },
      });
      uploadedOriginalKey = originalFileName;
      form.setValue("profileOriginalKey", uploadedOriginalKey);

      if (croppedFile) {
        const cropFileName = `profile/${user.id}/crop_${Date.now()}_${croppedFile.name}`;
        const resCrop = await fetch(
          `/api/s3/get-signed-url?name=${encodeURIComponent(cropFileName)}&operation=put&contentType=${encodeURIComponent(croppedFile.type)}`,
        );
        const dataCrop = await resCrop.json();
        if (!dataCrop.success?.url)
          throw new Error("No se pudo obtener la URL firmada para la imagen recortada");
        await fetch(dataCrop.success.url, {
          method: "PUT",
          body: croppedFile,
          headers: { "Content-Type": croppedFile.type },
        });
        uploadedCropKey = cropFileName;
        form.setValue("profileCropKey", uploadedCropKey);
        setProfileImagePreview(URL.createObjectURL(croppedFile));
      } else {
        form.setValue("profileCropKey", uploadedOriginalKey);
        setProfileImagePreview(URL.createObjectURL(originalFile));
      }
      toast({
        title: "Imagen procesada",
        description: "La imagen de perfil está lista para guardar.",
      });
    } catch (err) {
      console.error("Error al subir imagen de perfil:", err);
      toast({
        title: "Error de subida",
        description: (err as Error).message || "No se pudo subir la imagen de perfil",
        variant: "destructive",
      });
      form.setValue("profileOriginalKey", initialProfileOriginalKey.current || "");
      form.setValue("profileCropKey", initialProfileCropKey.current || "");
      const prevKey = initialProfileCropKey.current || initialProfileOriginalKey.current;
      if (prevKey) {
        const url = await getLogoUrl(prevKey);
        setProfileImagePreview(url || prevKey);
      } else {
        setProfileImagePreview(null);
      }
    } finally {
      setIsUploadingImage(false);
    }
  };

  const onSubmit = form.handleSubmit((data) => {
    const formData = new FormData();
    formData.append("userId", data.userId);
    formData.append("name", data.name);
    formData.append("email", data.email);
    if (data.phone) {
      formData.append("phone", data.phone);
    }
    if (data.address) {
      formData.append("address", data.address);
    }

    if (form.getValues("profileOriginalKey")) {
      formData.append("profileOriginalKey", form.getValues("profileOriginalKey") as string);
    }
    if (form.getValues("profileCropKey")) {
      formData.append("profileCropKey", form.getValues("profileCropKey") as string);
    }

    startTransition(() => {
      formAction(formData);
    });
  });

  useEffect(() => {
    if (state.success) {
      toast({ title: "Éxito", description: "Perfil actualizado correctamente" });
      initialProfileOriginalKey.current = form.getValues("profileOriginalKey");
      initialProfileCropKey.current = form.getValues("profileCropKey");

      // Actualizar el SessionStore con la nueva imagen
      const newImageKey = form.getValues("profileCropKey") || form.getValues("profileOriginalKey");
      const newName = form.getValues("name");

      setSession({
        userImage: newImageKey || null,
        userName: newName || null,
      });

      if (profileImagePreview?.startsWith("blob:")) {
        const s3Key = form.getValues("profileCropKey") || form.getValues("profileOriginalKey");
        if (s3Key) {
          async function refreshPreviewFromS3() {
            setIsLoadingPreview(true);
            const url = await getLogoUrl(s3Key as string);
            setProfileImagePreview(url || (s3Key as string));
            setIsLoadingPreview(false);
          }
          refreshPreviewFromS3();
        }
      }
    } else if (state.error) {
      toast({ title: "Error", description: state.error, variant: "destructive" });
    }
  }, [state, toast, form, profileImagePreview, setSession]);

  useEffect(() => {
    let isMounted = true;
    const currentCropKey = form.getValues("profileCropKey");
    const currentOriginalKey = form.getValues("profileOriginalKey");
    const s3KeyToLoad = currentCropKey || currentOriginalKey;

    if (profileImagePreview?.startsWith("blob:")) {
      return;
    }

    if (s3KeyToLoad) {
      if (
        profileImagePreview === s3KeyToLoad ||
        profileImagePreview?.includes(encodeURIComponent(s3KeyToLoad))
      ) {
        return;
      }
      setIsLoadingPreview(true);
      getLogoUrl(s3KeyToLoad)
        .then((url) => {
          if (isMounted) setProfileImagePreview(url || s3KeyToLoad);
        })
        .catch((err) => {
          console.error("Error en form.watch para preview:", err);
          if (isMounted) setProfileImagePreview(s3KeyToLoad);
        })
        .finally(() => {
          if (isMounted) setIsLoadingPreview(false);
        });
    } else {
      if (isMounted) setProfileImagePreview(null);
    }
    return () => {
      isMounted = false;
    };
  }, [profileImagePreview, form]);

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
              name="profileOriginalKey"
              render={({ field }) => <input type="hidden" {...field} />}
            />
            <FormField
              control={form.control}
              name="profileCropKey"
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

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <Input type="tel" {...field} placeholder="Ej: +1234567890" />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dirección</FormLabel>
                  <Input {...field} placeholder="Ej: Calle Falsa 123, Ciudad" />
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Imagen de Perfil</FormLabel>
              {(isLoadingPreview || profileImagePreview) && (
                <div className="flex flex-col items-center mt-2">
                  <span className="text-xs text-muted-foreground mb-1">Vista previa actual:</span>
                  <div className="w-32 h-32 rounded-full border overflow-hidden bg-muted flex items-center justify-center">
                    {isLoadingPreview ? (
                      <p className="text-xs text-muted-foreground">Cargando...</p>
                    ) : profileImagePreview ? (
                      <img
                        src={
                          profileImagePreview.startsWith("blob:") ||
                          profileImagePreview.startsWith("http")
                            ? profileImagePreview
                            : `https://dummyimage.com/128x128/ccc/999&text=S3:${profileImagePreview.substring(profileImagePreview.length - 10)}`
                        }
                        alt="Vista previa de la imagen de perfil"
                        className="w-full h-full object-cover"
                      />
                    ) : null}
                  </div>
                </div>
              )}
              <UploadCropperButton
                placeholder={
                  profileImagePreview ? "Cambiar imagen de perfil" : "Subir imagen de perfil"
                }
                onChange={handleImageUploadAndCrop}
                accept="image/*"
                crop={true}
                aspect={1}
                disabled={isUploadingImage || isPending}
              />
              {isUploadingImage && (
                <span className="text-xs text-muted-foreground">Procesando imagen...</span>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isPending || isUploadingImage}>
              {isPending || isUploadingImage ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
