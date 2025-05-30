"use client";
import AvatarUser from "@/components/custom/AvatarUser";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSessionStore } from "@/stores/SessionStore";
import { useEffect, useState } from "react";

export default function DevToolsDebug() {
  const [formData, setFormData] = useState<{
    userName: string | null;
    userEmail: string | null;
    userImage: string | null;
    userRole: string | null;
    userId: string | null;
    organizationName: string | null;
    organizationLogo: string | null;
    organizationId: string | null;
  }>({
    userName: "",
    userEmail: "",
    userImage: "",
    userRole: "",
    userId: "",
    organizationName: "",
    organizationLogo: "",
    organizationId: "",
  });

  // Estado actual del store
  const storeData = useSessionStore();
  const setSession = useSessionStore((s) => s.setSession);
  const clearSession = useSessionStore((s) => s.clearSession);

  // Inicializar el formulario con los datos actuales del store
  useEffect(() => {
    setFormData({
      userName: storeData.userName || null,
      userEmail: storeData.userEmail || null,
      userImage: storeData.userImage || null,
      userRole: storeData.userRole || null,
      userId: storeData.userId || null,
      organizationName: storeData.organizationName || null,
      organizationLogo: storeData.organizationLogo || null,
      organizationId: storeData.organizationId || null,
    });
  }, [storeData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value || null }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Convertir valores vacíos a null o undefined para la store
    const sessionUpdate = Object.entries(formData).reduce(
      (acc, [key, value]) => {
        acc[key as keyof typeof formData] = value;
        return acc;
      },
      {} as typeof formData,
    );

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
            <CardDescription>Actualiza los valores del store de sesión para probar</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <h3 className="text-lg font-medium">Datos de Usuario</h3>
              <div className="space-y-2">
                <label htmlFor="userId" className="text-sm font-medium">
                  ID de Usuario
                </label>
                <Input
                  id="userId"
                  name="userId"
                  value={formData.userId || ""}
                  onChange={handleInputChange}
                  placeholder="ID de usuario"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="userName" className="text-sm font-medium">
                  Nombre de Usuario
                </label>
                <Input
                  id="userName"
                  name="userName"
                  value={formData.userName || ""}
                  onChange={handleInputChange}
                  placeholder="Nombre completo"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="userEmail" className="text-sm font-medium">
                  Email
                </label>
                <Input
                  id="userEmail"
                  name="userEmail"
                  value={formData.userEmail || ""}
                  onChange={handleInputChange}
                  placeholder="Email"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="userImage" className="text-sm font-medium">
                  Imagen de Usuario
                </label>
                <Input
                  id="userImage"
                  name="userImage"
                  value={formData.userImage || ""}
                  onChange={handleInputChange}
                  placeholder="URL de imagen de usuario"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="userRole" className="text-sm font-medium">
                  Rol de Usuario
                </label>
                <Input
                  id="userRole"
                  name="userRole"
                  value={formData.userRole || ""}
                  onChange={handleInputChange}
                  placeholder="Rol (admin, user, etc.)"
                />
              </div>

              <h3 className="text-lg font-medium pt-2">Datos de Organización</h3>
              <div className="space-y-2">
                <label htmlFor="organizationId" className="text-sm font-medium">
                  ID de Organización
                </label>
                <Input
                  id="organizationId"
                  name="organizationId"
                  value={formData.organizationId || ""}
                  onChange={handleInputChange}
                  placeholder="ID de organización"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="organizationName" className="text-sm font-medium">
                  Nombre de Organización
                </label>
                <Input
                  id="organizationName"
                  name="organizationName"
                  value={formData.organizationName || ""}
                  onChange={handleInputChange}
                  placeholder="Nombre de organización"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="organizationLogo" className="text-sm font-medium">
                  Logo URL
                </label>
                <Input
                  id="organizationLogo"
                  name="organizationLogo"
                  value={formData.organizationLogo || ""}
                  onChange={handleInputChange}
                  placeholder="URL de imagen de logo"
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit">Actualizar Store</Button>
                <Button type="button" variant="destructive" onClick={() => clearSession()}>
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
            <CardDescription>Valores actuales en el store de sesión</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center mb-6">
              <AvatarUser src={storeData.userImage} name={storeData.userName || "Usuario"} />
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
                    organizationLogo: storeData.organizationLogo,
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
