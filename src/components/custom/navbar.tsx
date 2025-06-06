import Link from "next/link";
import { UserButton } from "./UserButton";

import type { Session } from "@/auth";
import { headers } from "next/headers";
import { Button } from "../ui/button";
import AvatarUser from "./AvatarUser";
import SessionButtons from "./SessionButtons";

interface NavbarProps {
  session: Session | null;
  organization?: { name: string } | null;
}

export default async function Navbar({ session, organization }: NavbarProps) {
  const headersList = headers();
  const fullUrl = (await headersList).get("referer") || "";
  const isAdminRoute = fullUrl.includes("/admin");
  const isRootRoute = fullUrl.includes("/root");

  return (
    <nav className="flex justify-between items-center py-3 px-4 fixed top-0 left-0 right-0 z-50 bg-slate-100">
      {session && (
        <Link href="/profile">
          <AvatarUser name={session.user.name} src={session.user.profileCrop} />
        </Link>
      )}
      <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight">
        {organization?.name ?? "Aun no se le asignado ninguna organizacion"}
      </h3>
      <div className="flex gap-2 justify-center">
        {session?.user.role === "root" && !isRootRoute && (
          <Button>
            <Link href={"/root"}>Admin Root</Link>
          </Button>
        )}
        {session?.user.role === "admin" && !isAdminRoute && (
          <Button>
            <Link href={"/admin"}>Administracion</Link>
          </Button>
        )}
        {session ? <UserButton /> : <SessionButtons />}
      </div>
    </nav>
  );
}
