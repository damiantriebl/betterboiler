import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function checkAndUpdatePaymentMethod() {
  try {
    // Obtener todas las organizaciones
    const organizations = await prisma.organization.findMany({
      select: { id: true, name: true },
    });

    if (organizations.length === 0) {
      console.log("No se encontraron organizaciones.");
      return;
    }

    // Encontrar el método de pago de Cuenta Corriente
    const currentAccountMethod = await prisma.paymentMethod.findFirst({
      where: { type: "current_account" },
    });

    if (!currentAccountMethod) {
      console.log('No se encontró el método de pago "Cuenta Corriente".');
      return;
    }

    console.log(
      `Método de pago encontrado: ${currentAccountMethod.name} (ID: ${currentAccountMethod.id})`,
    );

    // Para cada organización, verificar el método de pago
    for (const org of organizations) {
      console.log(`\nVerificando organización: ${org.name} (${org.id})`);

      const association = await prisma.organizationPaymentMethod.findFirst({
        where: {
          organizationId: org.id,
          methodId: currentAccountMethod.id,
        },
      });

      if (!association) {
        console.log(`No existe asociación para la organización ${org.id}. Creando...`);

        // Obtener el máximo order para esta organización
        const maxOrderResult = await prisma.organizationPaymentMethod.aggregate({
          where: { organizationId: org.id },
          _max: { order: true },
        });

        const nextOrder = (maxOrderResult._max.order || 0) + 1;

        // Crear la asociación
        const created = await prisma.organizationPaymentMethod.create({
          data: {
            organizationId: org.id,
            methodId: currentAccountMethod.id,
            isEnabled: true,
            order: nextOrder,
          },
        });

        console.log(`Asociación creada con ID: ${created.id}, isEnabled: ${created.isEnabled}`);
      } else {
        console.log(
          `Asociación encontrada: ID ${association.id}, isEnabled: ${association.isEnabled}, order: ${association.order}`,
        );

        // Si no está habilitado, lo habilitamos
        if (!association.isEnabled) {
          console.log(`El método de pago está deshabilitado. Habilitando...`);

          const updated = await prisma.organizationPaymentMethod.update({
            where: { id: association.id },
            data: { isEnabled: true },
          });

          console.log(`Método habilitado correctamente. isEnabled ahora es: ${updated.isEnabled}`);
        }
      }

      // Listar todos los métodos de pago para esta organización
      const allMethods = await prisma.organizationPaymentMethod.findMany({
        where: { organizationId: org.id },
        include: { method: true },
        orderBy: { order: "asc" },
      });

      console.log(`\nMétodos de pago para organización ${org.name}:`);
      allMethods.forEach((m) => {
        console.log(
          `- ${m.method.name} (${m.method.type}): isEnabled=${m.isEnabled}, order=${m.order}`,
        );
      });
    }

    console.log("\nProceso completado.");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndUpdatePaymentMethod();
