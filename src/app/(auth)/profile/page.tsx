
import { headers } from "next/headers";
import ProfileForm from "./ProfileForm";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export default async function ProfilePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session?.user?.email) {
    return <p>Acceso denegado. Por favor, inicia sesión.</p>;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  });

  if (!user) {
    return <p>Usuario no encontrado.</p>;
  }

  return (
    <div className="flex flex-col align-middle justify-center p-20 items-center" >
      <ProfileForm user={{ id: user.id, name: user.name, email: user.email }} />
    </div>
  );
}
