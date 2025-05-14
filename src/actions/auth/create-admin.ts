"use server";

import { auth } from "@/auth";
import prisma from "@/lib/prisma";

/**
 * Crea un usuario administrador con una organización para el seed
 */
export async function createAdminUser(
  email: string,
  password: string,
  name: string,
  organizationSlug: string,
  organizationName: string,
  role = "root",
) {
  try {
    console.log(`Creando/verificando organización ${organizationName}...`);
    // Crear organización si no existe
    const organization = await prisma.organization.upsert({
      where: { slug: organizationSlug },
      update: {},
      create: {
        name: organizationName,
        slug: organizationSlug,
      },
    });

    console.log(`Organización creada/actualizada con ID: ${organization.id}`);

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email },
      include: { accounts: true },
    });

    // Si el usuario existe, actualizar sus datos
    if (existingUser) {
      console.log(`Usuario ${email} ya existe, actualizando...`);

      // Actualizar el usuario
      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name,
          emailVerified: true,
          role,
          organizationId: organization.id,
        },
      });

      // Limpiar y crear la cuenta correctamente
      await prisma.account.deleteMany({
        where: { userId: existingUser.id },
      });

      // Registrar el usuario con Better Auth
      const result = await auth.emailAndPassword.createUser({
        userId: existingUser.id,
        email,
        password,
        emailVerified: true,
      });

      console.log(`Usuario actualizado: ${result?.id || "error"}`);
      return {
        success: true,
        message: "Usuario administrador actualizado correctamente",
        userId: existingUser.id,
      };
    }

    // Si el usuario no existe, crearlo
    console.log(`Creando nuevo usuario ${email}...`);

    // Crear usuario con datos básicos (sin cuenta aún)
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        emailVerified: true,
        role,
        organizationId: organization.id,
      },
    });

    // Registrar el usuario con Better Auth
    const result = await auth.emailAndPassword.createUser({
      userId: newUser.id,
      email,
      password,
      emailVerified: true,
    });

    console.log(`Usuario creado: ${result?.id || "error"}`);
    return {
      success: true,
      message: "Usuario administrador creado correctamente",
      userId: newUser.id,
    };
  } catch (error: any) {
    console.error("Error al crear usuario administrador:", error);
    return { success: false, message: `Error: ${error.message}`, error };
  }
}
