// Script para cargar métodos de pago predefinidos en la base de datos
// Ejecutar con: node prisma/seed-payment-methods.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DEFAULT_PAYMENT_METHODS = [
  {
    name: "Efectivo",
    type: "cash",
    description: "Pago en efectivo",
    iconUrl: "/icons/payment-methods/cash.svg"
  },
  {
    name: "Tarjeta de Crédito",
    type: "credit",
    description: "Pago con tarjeta de crédito",
    iconUrl: "/icons/payment-methods/credit-card.svg"
  },
  {
    name: "Tarjeta de Débito",
    type: "debit",
    description: "Pago con tarjeta de débito",
    iconUrl: "/icons/payment-methods/debit-card.svg"
  },
  {
    name: "Transferencia Bancaria",
    type: "transfer",
    description: "Pago por transferencia bancaria",
    iconUrl: "/icons/payment-methods/bank-transfer.svg"
  },
  {
    name: "Cheque",
    type: "check",
    description: "Pago con cheque",
    iconUrl: "/icons/payment-methods/check.svg"
  },
  {
    name: "Depósito Bancario",
    type: "deposit",
    description: "Pago por depósito bancario",
    iconUrl: "/icons/payment-methods/bank-deposit.svg"
  },
  {
    name: "MercadoPago",
    type: "mercadopago",
    description: "Pago a través de MercadoPago",
    iconUrl: "/icons/payment-methods/mercadopago.svg"
  },
  {
    name: "Código QR",
    type: "qr",
    description: "Pago mediante escaneo de código QR",
    iconUrl: "/icons/payment-methods/qr-code.svg"
  },
  {
    name: "Cuenta Corriente",
    type: "current_account",
    description: "Pago con cuenta corriente financiada",
    iconUrl: "/icons/payment-methods/current-account.svg"
  }
];

async function main() {
  console.log(`🔄 Cargando ${DEFAULT_PAYMENT_METHODS.length} métodos de pago predefinidos...`);

  // Verificar si ya existen métodos de pago en la base de datos
  const existingCount = await prisma.paymentMethod.count();
  
  if (existingCount > 0) {
    console.log(`⚠️ Ya existen ${existingCount} métodos de pago en la base de datos. No se cargarán datos duplicados.`);
    return;
  }

  // Insertar los métodos de pago predefinidos
  const result = await prisma.paymentMethod.createMany({
    data: DEFAULT_PAYMENT_METHODS,
    skipDuplicates: true,
  });

  console.log(`✅ Cargados ${result.count} métodos de pago con éxito.`);
}

main()
  .catch((e) => {
    console.error('❌ Error al cargar los métodos de pago:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 