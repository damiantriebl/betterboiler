"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import GestionMarcas from "./components/GestionMarcas";
import GestionModelos from "./components/GestionModelos";

const TABS_ORDER = [
  'marcas',
  'modelos', 
  'sucursales',
  'colores',
  'proveedores'
] as const;

export default function ConfiguracionPage() {
  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Configuración del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="marcas" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="marcas">Marcas</TabsTrigger>
              <TabsTrigger value="modelos">Modelos</TabsTrigger>
              <TabsTrigger value="sucursales">Sucursales</TabsTrigger>
              <TabsTrigger value="colores">Colores</TabsTrigger>
              <TabsTrigger value="proveedores">Proveedores</TabsTrigger>
            </TabsList>
            
            <TabsContent value="marcas">
              <div className="mt-4">
                <GestionMarcas />
              </div>
            </TabsContent>

            <TabsContent value="modelos">
              <div className="mt-4">
                <div className="space-y-4">
                  <select className="w-full p-2 border rounded-md">
                    <option value="">Selecciona una marca</option>
                    {/* Aquí irían las opciones de marcas */}
                  </select>
                  <GestionModelos marcaId={marcaSeleccionada} />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="sucursales">
              <div className="mt-4">
                {/* Aquí irá el componente de gestión de sucursales */}
              </div>
            </TabsContent>

            <TabsContent value="colores">
              <div className="mt-4">
                {/* Aquí irá el componente de gestión de colores */}
              </div>
            </TabsContent>

            <TabsContent value="proveedores">
              <div className="mt-4">
                {/* Aquí irá el componente de gestión de proveedores */}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
} 