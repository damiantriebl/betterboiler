import { AppSidebar } from "@/components/ui/app-sidebar"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="flex flex-col w-full h-screen overflow-hidden bg-background h-screen overflow-y-auto pb-10">
        <SidebarTrigger />
        <div className="flex   flex-col gap-20 px-10  bg-background">
          {children}
        </div>
      </main>
    </SidebarProvider>
  )
}
