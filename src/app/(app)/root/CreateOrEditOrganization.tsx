"use client";
import { createOrUpdateOrganization } from "@/actions/auth/create-edit-organizations";
import UploadButton, { type UploadResult } from "@/components/custom/UploadCropperButton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useSessionStore } from "@/stores/SessionStore";
import type { serverMessage } from "@/types/ServerMessageType";
import { type OrganizationFormData, organizationSchema } from "@/zod/OrganizationZod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Label } from "@radix-ui/react-label";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";

interface Props {
  organization?: {
    id: string;
    name: string;
    logo?: string | null;
  } | null;
  currentUserOrganizationId?: string | null;
}

const CreateOrEditOrganization = ({ organization, currentUserOrganizationId }: Props) => {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<serverMessage>({ success: false, error: false });
  const setSession = useSessionStore((state) => state.setSession);
  const router = useRouter();

  const form = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      id: organization?.id ?? "",
      name: organization?.name ?? "",
    },
  });

  useEffect(() => {
    if (state.success) {
      const newName = form.getValues("name");
      const hasNewLogo = form.getValues("logoFile");

      // Solo actualizar SessionStore si es la organización del usuario actual
      const isCurrentUserOrganization = organization?.id === currentUserOrganizationId;

      if (isCurrentUserOrganization) {
        const sessionUpdate: any = {
          organizationName: newName,
        };

        if (hasNewLogo && organization?.id) {
          sessionUpdate.organizationLogo = `organization/${organization.id}/logo_400`;
        }

        setSession(sessionUpdate);
      }

      setOpen(false);
      toast({
        title: "Éxito",
        description: isCurrentUserOrganization
          ? "Se actualizó la organización correctamente"
          : "Se actualizó la organización correctamente. Los cambios se reflejarán después de volver a iniciar sesión.",
      });

      router.refresh();
    }

    if (state.error) {
      toast({
        title: "Error",
        description: typeof state.error === "string" ? state.error : "Error inesperado",
        variant: "destructive",
      });
    }
  }, [state, setSession, router, form, organization?.id, currentUserOrganizationId]);

  const handleUploadChange = ({ originalFile }: UploadResult) => {
    form.setValue("logoFile", originalFile);
  };

  const handleThumbnailUploadChange = ({ originalFile }: UploadResult) => {
    form.setValue("thumbnailFile", originalFile);
  };

  const onSubmit = form.handleSubmit((data) => {
    const formData = new FormData();
    if (data.id) formData.append("id", data.id);
    formData.append("name", data.name);
    if (data.logoFile) {
      formData.append("logoFile", data.logoFile, data.logoFile.name);
    }
    if (data.thumbnailFile) {
      formData.append("thumbnailFile", data.thumbnailFile, data.thumbnailFile.name);
    }

    startTransition(async () => {
      try {
        const result = await createOrUpdateOrganization(formData);
        setState(result);
      } catch (error) {
        console.error("Error en creación o actualización:", error);
        setState({ success: false, error: (error as Error).message });
      }
    });
  });

  return (
    <Dialog open={open} onOpenChange={() => setOpen(!open)}>
      <DialogTrigger asChild>
        <Button className="w-36">
          {organization ? "Editar Organización" : "Crear Organización"}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{organization ? "Editar Organización" : "Crear Organización"}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className={cn("grid items-start gap-4")}>
            {organization && <input type="hidden" {...form.register("id")} />}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <Label htmlFor="name">Nombre</Label>
                  <FormControl>
                    <Input {...field} id="name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormItem>
              <Label>Logo Principal</Label>
              <UploadButton placeholder="Subir logo" crop={false} onChange={handleUploadChange} />
              <FormMessage />
            </FormItem>

            <FormItem>
              <Label>Miniatura (Max 200x200)</Label>
              <UploadButton
                placeholder="Subir miniatura"
                crop={false}
                onChange={handleThumbnailUploadChange}
              />
              <FormMessage />
            </FormItem>

            {state.error && <p className="text-red-400">{state.error}</p>}
            <Button type="submit" disabled={isPending}>
              {isPending ? "Guardando..." : organization ? "Guardar Cambios" : "Crear"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateOrEditOrganization;
