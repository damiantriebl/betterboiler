const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function addCurrentAccountPaymentMethod() {
  try {
    // Check if the method already exists
    const existingMethod = await prisma.paymentMethod.findFirst({
      where: {
        type: "current_account",
      },
    });

    if (existingMethod) {
      console.log('Método de pago "Cuenta Corriente" ya existe:', existingMethod);
      return existingMethod;
    }

    // Add the method if it doesn't exist
    const newMethod = await prisma.paymentMethod.create({
      data: {
        name: "Cuenta Corriente",
        type: "current_account",
        description: "Pago con cuenta corriente financiada",
        iconUrl: "/icons/payment-methods/current-account.svg",
      },
    });

    console.log('Método de pago "Cuenta Corriente" creado:', newMethod);
    return newMethod;
  } catch (error) {
    console.error("Error al crear método de pago:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

addCurrentAccountPaymentMethod().catch(console.error);
