import { Bike, Calendar, Home, Inbox, Link, Search, Settings, SquarePercent } from "lucide-react"

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
import LogoutButton from "../custom/LogoutButton"
import { Button } from "./button"

// Menu items.

export function AppSidebar() {
    return (
        <Sidebar className="">
            <SidebarContent className="bg-nebulosa bg-cover bg-center min-h-screen">

            </SidebarContent>
        </Sidebar>
    )
}
