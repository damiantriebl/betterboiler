'use client'
import { useState, useActionState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Label } from "@radix-ui/react-label";
import { createOrganization } from "@/actions/auth/create-organizations";
import { serverMessage } from "@/schemas/setverMessage";
import { useForm } from "react-hook-form";
import { createOrganizationSchema } from "@/lib/authZod";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { authClient } from "@/auth-client";

const CreateOrganization = () => {
    const [open, setOpen] = useState(false);
    const [state, formAction, isPending] = useActionState<serverMessage, FormData>(createOrganization, { success: false, error: false });
    const formActionSchema = useForm<z.infer<typeof createOrganizationSchema>>({
        resolver: zodResolver(createOrganizationSchema),
        defaultValues: {
            name: "",
            logo: "",
        },
    });
    const { 
        data: session, 
        isPending: pending, //loading state 
        error, //error object 
    } = authClient.useSession() 

    useEffect(() => {
        if(state.success){
            setOpen(false);
        }
        
    }, [state]);
    return (
        <Dialog open={open} onOpenChange={() => setOpen(!open)}>
            <DialogTrigger asChild>
                <Button className="w-36">
                    Crear Organizacion
                </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Crear Organizacion</DialogTitle>

                </DialogHeader>
                <Form {...formActionSchema} >
                    <form action={formAction} className={cn("grid items-start gap-4")}>
                        <FormField
                            control={formActionSchema.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <Label htmlFor="name">Organización</Label>
                                    <FormControl>
                                        <Input {...field} id="name" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={formActionSchema.control}
                            name="logo"
                            render={({ field }) => (
                                <FormItem>
                                    <Label htmlFor="logo">Logo</Label>
                                    <FormControl>
                                        <Input {...field} id="logo" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <p className="text-red-400">{state.error}</p>
                        <Button type="submit" disabled={isPending}>Guardar</Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
export default CreateOrganization;