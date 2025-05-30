import { Bike, Calendar, Home, Inbox, Link, Search, Settings, SquarePercent } from "lucide-react";

import { Sidebar, SidebarContent } from "@/components/ui/sidebar";

// Menu items.

export default function AppSidebar() {
  return (
    <Sidebar variant="floating">
      <SidebarContent className="bg-nebulosa bg-cover bg-center rounded-lg p-4 " />
    </Sidebar>
  );
}
