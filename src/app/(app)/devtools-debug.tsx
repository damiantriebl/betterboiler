"use client";
import { useSessionStore } from "@/stores/SessionStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import AvatarUser from "@/components/custom/AvatarUser";

export default function DevToolsDebug() {
    const [formData, setFormData] = useState({
        userName: "",
        userEmail: "",
        userImage: "",
        userRole: "",
        userId: "",
        organizationName: "",
        organizationLogo: "",
        organizationId: ""
    });

    // Estado actual del store
    const storeData = useSessionStore();
    const setSession = useSessionStore((s) => s.setSession);
    const clearSession = useSessionStore((s) => s.clearSession);

    // Inicializar el formulario con los datos actuales del store
    useEffect(() => {
        setFormData({
            userName: storeData.userName || "",
            userEmail: storeData.userEmail || "",
            userImage: storeData.userImage || "",
            userRole: storeData.userRole || "",
            userId: storeData.userId || "",
            organizationName: storeData.organizationName || "",
            organizationLogo: storeData.organizationLogo || "",
            organizationId: storeData.organizationId || ""
        });
    }, [storeData]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Convertir valores vacíos a null o undefined para la store
        const sessionUpdate = Object.entries(formData).reduce((acc, [key, value]) => {
            acc[key as keyof typeof formData] = value || null;
            return acc;
        }, {} as typeof formData);

        setSession(sessionUpdate);
    };

    return (
        <div className="container mx-auto py-10 space-y-6">
            <h1 className="text-3xl font-bold">DevTools Debug</h1>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Formulario para modificar el store */}
                <Card>
                    <CardHeader>
                        <CardTitle>Modificar estado de sesión</CardTitle>
                        <CardDescription>
                            Actualiza los valores del store de sesión para probar
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <h3 className="text-lg font-medium">Datos de Usuario</h3>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">ID de Usuario</label>
                                <Input
                                    name="userId"
                                    value={formData.userId}
                                    onChange={handleInputChange}
                                    placeholder="ID de usuario"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nombre de Usuario</label>
                                <Input
                                    name="userName"
                                    value={formData.userName}
                                    onChange={handleInputChange}
                                    placeholder="Nombre completo"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email</label>
                                <Input
                                    name="userEmail"
                                    value={formData.userEmail}
                                    onChange={handleInputChange}
                                    placeholder="Email"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Imagen de Usuario</label>
                                <Input
                                    name="userImage"
                                    value={formData.userImage}
                                    onChange={handleInputChange}
                                    placeholder="URL de imagen de usuario"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Rol de Usuario</label>
                                <Input
                                    name="userRole"
                                    value={formData.userRole}
                                    onChange={handleInputChange}
                                    placeholder="Rol (admin, user, etc.)"
                                />
                            </div>

                            <h3 className="text-lg font-medium pt-2">Datos de Organización</h3>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">ID de Organización</label>
                                <Input
                                    name="organizationId"
                                    value={formData.organizationId}
                                    onChange={handleInputChange}
                                    placeholder="ID de organización"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Nombre de Organización</label>
                                <Input
                                    name="organizationName"
                                    value={formData.organizationName}
                                    onChange={handleInputChange}
                                    placeholder="Nombre de organización"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium">Logo URL</label>
                                <Input
                                    name="organizationLogo"
                                    value={formData.organizationLogo}
                                    onChange={handleInputChange}
                                    placeholder="URL de imagen de logo"
                                />
                            </div>

                            <div className="flex gap-2">
                                <Button type="submit">Actualizar Store</Button>
                                <Button
                                    type="button"
                                    variant="destructive"
                                    onClick={() => clearSession()}
                                >
                                    Limpiar Store
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>

                {/* Visualización del store actual */}
                <Card>
                    <CardHeader>
                        <CardTitle>Estado actual del store</CardTitle>
                        <CardDescription>
                            Valores actuales en el store de sesión
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-center mb-6">
                            <AvatarUser useSessionData={true} />
                        </div>

                        <div className="rounded-md bg-muted p-4">
                            <pre className="text-sm overflow-auto">
                                {JSON.stringify(
                                    {
                                        // Usuario
                                        userId: storeData.userId,
                                        userName: storeData.userName,
                                        userEmail: storeData.userEmail,
                                        userImage: storeData.userImage,
                                        userRole: storeData.userRole,
                                        // Organización
                                        organizationId: storeData.organizationId,
                                        organizationName: storeData.organizationName,
                                        organizationLogo: storeData.organizationLogo
                                    },
                                    null,
                                    2
                                )}
                            </pre>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
} 