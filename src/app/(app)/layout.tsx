import { getOrganizationSessionData } from "@/actions/util/organization-session-unified";
import AuthGuard from "@/components/custom/AuthGuard";
import PaymentNotificationManager from "@/components/custom/PaymentNotificationManager";
import { PerformanceMonitor } from "@/components/custom/PerformanceMonitor";
import ScrollableMain from "@/components/custom/ScrollableMain";
import SessionStoreProvider from "@/components/custom/SessionStoreProvider";
import AppSidebar from "@/components/ui/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export default async function Layout({ children }: { children: React.ReactNode }) {
  console.log(`🏗️ [LAYOUT] Iniciando layout de la app - ${new Date().toISOString()}`);

  // Obtener toda la información de sesión y organización en el servidor
  const sessionData = await getOrganizationSessionData();

  console.log("📊 [LAYOUT] Datos de sesión obtenidos:", {
    hasUserId: !!sessionData.userId,
    hasOrganizationId: !!sessionData.organizationId,
    userEmail: sessionData.userEmail,
    userRole: sessionData.userRole,
    hasError: !!sessionData.error,
    error: sessionData.error,
  });

  if (sessionData.error) {
    console.error(`🚨 [LAYOUT] Error en datos de sesión: ${sessionData.error}`);
  }

  return (
    <SessionStoreProvider sessionData={sessionData}>
      <AuthGuard>
        <SidebarProvider>
          <AppSidebar />
          <ScrollableMain>{children}</ScrollableMain>
        </SidebarProvider>
        <PaymentNotificationManager />
      </AuthGuard>
    </SessionStoreProvider>
  );
}
