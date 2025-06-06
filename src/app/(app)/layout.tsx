import { getOrganizationSessionData } from "@/actions/util/organization-session-unified";
import SessionStoreProvider from "@/components/custom/SessionStoreProvider";
import AuthGuard from "@/components/custom/AuthGuard";
import AppSidebar from "@/components/ui/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export default async function Layout({ children }: { children: React.ReactNode }) {
  // Obtener toda la información de sesión y organización en el servidor
  const sessionData = await getOrganizationSessionData();

  return (
    <SessionStoreProvider sessionData={sessionData}>
      <AuthGuard>
        <SidebarProvider>
          <AppSidebar />
          <main className="flex flex-col flex-1 overflow-y-auto">
            <div className="w-full min-h-screen">{children}</div>
          </main>
        </SidebarProvider>
      </AuthGuard>
    </SessionStoreProvider>
  );
}
