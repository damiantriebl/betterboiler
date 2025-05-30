import { getOrganizationSessionData } from "@/actions/util/organization-session-unified";
import ScrollableMain from "@/components/custom/ScrollableMain";
import SessionStoreProvider from "@/components/custom/SessionStoreProvider";
import AppSidebar from "@/components/ui/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export default async function Layout({ children }: { children: React.ReactNode }) {
  // Obtener toda la información de sesión y organización en el servidor
  const sessionData = await getOrganizationSessionData();

  // Preparar datos de organización para el NavbarSticky
  const organizationData = sessionData.organizationId
    ? {
        logo: sessionData.organizationLogo,
        thumbnail: sessionData.organizationThumbnail,
        name: sessionData.organizationName || "Organización",
      }
    : null;

  return (
    <SessionStoreProvider sessionData={sessionData}>
      <SidebarProvider>
        <div className="flex h-screen w-full overflow-hidden">
          <AppSidebar />
          <ScrollableMain organizationData={organizationData}>{children}</ScrollableMain>
        </div>
      </SidebarProvider>
    </SessionStoreProvider>
  );
}
