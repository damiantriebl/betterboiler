"use client";
import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Label } from "@radix-ui/react-label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { createOrUpdateOrganization } from "@/actions/auth/create-edit-organizations";
import { serverMessage } from "@/schemas/serverMessage";
import UploadButton, { UploadResult } from "@/components/custom/uploadCropperButton";
import { toast } from "@/hooks/use-toast";

const organizationSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  logoFile: z.instanceof(File).optional(),
});

interface Props {
  organization?: {
    id: string;
    name: string;
    logo?: string | null;
  } | null;
}

const CreateOrEditOrganization = ({ organization }: Props) => {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<serverMessage>({ success: false, error: false });

  const form = useForm<z.infer<typeof organizationSchema>>({
    resolver: zodResolver(organizationSchema),
    defaultValues: {
      id: organization?.id ?? "",
      name: organization?.name ?? "",
    },
  });

  useEffect(() => {
    if (state.success) {
      window.location.reload();
      setOpen(false);
      toast({
        title: "Exito",
        description: "Se actualizo la imagen correctamente",
      });
    }
  
    if (state.error) {
      toast({
        title: "Error",
        description: typeof state.error === "string" ? state.error : "Error inesperado",
        variant: "destructive",
      });
    }
  }, [state]);

  const handleUploadChange = ({ originalFile }: UploadResult) => {
    form.setValue("logoFile", originalFile);
  };

  const onSubmit = form.handleSubmit((data) => {
    const formData = new FormData();
    if (data.id) formData.append("id", data.id);
    formData.append("name", data.name);
    if (data.logoFile) {
      formData.append("logoFile", data.logoFile, data.logoFile.name);
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
          <DialogTitle>
            {organization ? "Editar Organización" : "Crear Organización"}
          </DialogTitle>
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

            <UploadButton
              placeholder="Subir logo"
              crop={false}
              onChange={handleUploadChange}
            />

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
