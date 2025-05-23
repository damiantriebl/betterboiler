import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { headers } from "next/headers";
import ProfileForm from "./profileForm";

export default async function ProfilePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.email) {
    return <p>Acceso denegado. Por favor, inicia sesión.</p>;
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      profileOriginal: true,
      profileCrop: true,
    },
  });

  if (!user) {
    return <p>Usuario no encontrado.</p>;
  }

  return (
    <div className="flex flex-col align-middle justify-center p-20 items-center">
      <ProfileForm
        user={{
          id: user.id,
          name: user.name || "",
          email: user.email || "",
          phone: user.phone,
          address: user.address,
          profileOriginal: user.profileOriginal,
          profileCrop: user.profileCrop,
        }}
      />
    </div>
  );
}
