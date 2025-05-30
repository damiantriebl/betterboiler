import { auth } from "@/auth";
import OrganizationTable from "@/components/admin/organizationTable";
import UsersTable from "@/components/admin/userTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { headers } from "next/headers";
import { Suspense } from "react";
import CreateOrganization from "./CreateOrEditOrganization";

export const dynamic = "force-dynamic";

export default async function RootDashboard() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const currentUserOrganizationId = session?.user?.organizationId || null;

  return (
    <main className="flex flex-col">
      <div className="flex flex-col gap-4 max-w-7xl mx-auto w-full">
        <div className="flex flex-col gap-2 mb-8">
          <h1 className="text-3xl font-bold">Root Dashboard</h1>
          <p className="text-muted-foreground">Para uso interno de APEX.com</p>
          <CreateOrganization currentUserOrganizationId={currentUserOrganizationId} />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div>Cargando organizaciones...</div>}>
              <OrganizationTable />
            </Suspense>
            <Suspense fallback={<div>Cargando usuarios...</div>}>
              <UsersTable />
            </Suspense>
            <p className="w-full text-center text-lime-500 text-xl pt-10">
              Los cambios realizados se realizaran luego de volverse a loguear
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
