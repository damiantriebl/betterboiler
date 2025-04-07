import { Bike, Calendar, Home, Inbox, Search, Settings, SquarePercent } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import LogoutButton from "../custom/logoutButton"

// Menu items.
const items = [
  {
    title: "Dashboard",
    url: "#",
    icon: Home,
  },
  {
    title: "Ventas",
    url: "/ventas",
    icon: SquarePercent,
  },
  {
    title: "Stock",
    url: "#",
    icon: Bike,
  },
  {
    title: "Buscador",
    url: "#",
    icon: Search,
  },
  {
    title: "Configuracion",
    url: "#",
    icon: Settings,
  },
]

export function AppSidebar() {
  return (
    <Sidebar className="">
      <SidebarContent className="bg-nebulosa bg-cover bg-center min-h-screen">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton variant={"black"} asChild >
                    <a href={item.url}>
                      <item.icon className="size-12 shrink-0" />
                      <span className="text-lg">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            <SidebarFooter>
              <LogoutButton />
            </SidebarFooter>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
