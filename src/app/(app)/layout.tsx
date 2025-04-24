import AppSidebar from "@/components/ui/app-sidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { PriceModeSelector } from "@/components/ui/price-mode-selector";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex flex-col w-full h-screen overflow-hidden bg-background h-screen overflow-y-auto pb-10">
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 bg-background border-b">
          <SidebarTrigger />
          <PriceModeSelector />
        </div>
        <div className="flex flex-col gap-20 px-10 bg-background">{children}</div>
      </main>
    </SidebarProvider>
  );
}
