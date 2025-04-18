import UsersTable from "@/components/admin/userTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
            <UsersTable />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
