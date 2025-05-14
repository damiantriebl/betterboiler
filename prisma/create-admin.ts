import * as crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Crea un usuario administrador usando la misma estructura que Better Auth
 */
async function createAdminUser() {
  try {
    console.log("Creando organización apex...");

    // Crear organización
    const organization = await prisma.organization.upsert({
      where: { slug: "apex" },
      update: {},
      create: {
        name: "apex",
        slug: "apex",
      },
    });

    console.log("Organización creada/actualizada con ID:", organization.id);

    // Datos del usuario
    const email = "damiantriebl@gmail.com";
    const password = "123456789";
    const name = "Damian Triebl";

    // Crear o actualizar usuario
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name,
        emailVerified: true,
        role: "root",
        organizationId: organization.id,
      },
      create: {
        name,
        email,
        emailVerified: true,
        role: "root",
        organizationId: organization.id,
      },
    });

    console.log("Usuario creado/actualizado con ID:", user.id);

    // Eliminar cuentas existentes para evitar conflictos
    await prisma.account.deleteMany({
      where: { userId: user.id },
    });

    console.log("Cuentas previas eliminadas");

    // Generar salt y hash de la contraseña (similar a Better Auth)
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");

    // Crear cuenta con formato compatible con Better Auth
    await prisma.account.create({
      data: {
        userId: user.id,
        providerId: "email",
        accountId: email,
        // Formato compatible con Better Auth
        password: `${hash}.${salt}`,
      },
    });

    console.log('✅ Cuenta creada con providerId "email" y formato compatible');
    console.log("✅ Usuario admin creado exitosamente:", email);

    return { success: true };
  } catch (error) {
    console.error("❌ Error al crear usuario admin:", error);
    return { success: false, error };
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar función
createAdminUser()
  .then(() => {
    console.log("Script finalizado");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error en script:", error);
    process.exit(1);
  });
