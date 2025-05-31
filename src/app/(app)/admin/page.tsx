import UsersTable from "@/components/admin/UserTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Suspense } from "react";

export default async function AdminDashboard() {
  return (
    <main className="flex flex-col">
      <div className="flex flex-col gap-4 max-w-7xl mx-auto w-full">
        <div className="flex flex-col gap-2 mb-8">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Controla los usuarios por organizacion</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>Cargando usuarios...</div>}>
              <UsersTable />
            </Suspense>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
