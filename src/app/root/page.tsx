import UsersTable from "@/components/admin/userTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import OrganizationTable from "../../components/admin/organizationTable";
import CreateOrganization from "./CreateOrEditOrganization";
import { auth } from "@/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function RootDashboard() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return (
    <main className="flex flex-col">
      <div className="flex flex-col gap-4 max-w-7xl mx-auto w-full">
        <div className="flex flex-col gap-2 mb-8">
          <h1 className="text-3xl font-bold">Root Dashboard</h1>
          <p className="text-muted-foreground">Para uso interno de APEX.com</p>
          <CreateOrganization />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <OrganizationTable />
            <UsersTable />
            <p className="w-full text-center text-lime-500 text-xl pt-10">
              Los cambios realizados se realizaran luego de volverse a loguear
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
