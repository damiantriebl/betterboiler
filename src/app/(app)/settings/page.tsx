"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Save } from "lucide-react";

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <Card className="p-6">
                <div className="flex items-center gap-2 mb-4">
                    <Settings className="h-5 w-5" />
                    <h2 className="text-xl font-semibold">Configuración General</h2>
                </div>

                <div className="space-y-4">
                    <div>
                        <Label htmlFor="organization-name">Nombre de la Organización</Label>
                        <Input
                            id="organization-name"
                            placeholder="Nombre de tu empresa"
                            disabled
                        />
                        <p className="text-sm text-muted-foreground mt-1">
                            Contacta al administrador para cambiar el nombre de la organización
                        </p>
                    </div>

                    <div>
                        <Label htmlFor="organization-email">Email de Contacto</Label>
                        <Input
                            id="organization-email"
                            type="email"
                            placeholder="contacto@tuempresa.com"
                            disabled
                        />
                    </div>

                    <div>
                        <Label htmlFor="organization-phone">Teléfono</Label>
                        <Input
                            id="organization-phone"
                            placeholder="+54 11 1234-5678"
                            disabled
                        />
                    </div>

                    <div className="pt-4">
                        <Button disabled>
                            <Save className="h-4 w-4 mr-2" />
                            Guardar Cambios
                        </Button>
                    </div>
                </div>
            </Card>

            <Card className="p-6 bg-blue-50 border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">¿Necesitas ayuda?</h3>
                <p className="text-sm text-blue-800">
                    Para configurar métodos de pago, ve a la pestaña correspondiente en la navegación superior.
                </p>
            </Card>
        </div>
    );
} 