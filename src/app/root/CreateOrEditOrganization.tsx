"use client";
import { useState, useEffect, useActionState } from "react";
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

// Esquema de validación con Zod
const organizationSchema = z.object({
    id: z.string().optional(), // Se envía solo en caso de edición
    name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
    logo: z.string().url("Debe ser una URL válida").optional(),
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
    const [state, formAction, isPending] = useActionState<serverMessage, FormData>(createOrUpdateOrganization, {
        success: false,
        error: false,
    });

    const form = useForm<z.infer<typeof organizationSchema>>({
        resolver: zodResolver(organizationSchema),
        defaultValues: {
            id: organization?.id ?? "",
            name: organization?.name ?? "",
            logo: organization?.logo ?? "",
        },
    });

    useEffect(() => {
        if (state.success) {
            setOpen(false);
        }
    }, [state]);

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
                    <form action={formAction} className={cn("grid items-start gap-4")}>
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

                        <FormField
                            control={form.control}
                            name="logo"
                            render={({ field }) => (
                                <FormItem>
                                    <Label htmlFor="logo">Logo (URL)</Label>
                                    <FormControl>
                                        <Input {...field} id="logo" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <p className="text-red-400">{state.error}</p>
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
