import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";
import { MoreHorizontal } from "lucide-react";
import Image from "next/image";
const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando proceso de seed...");

  // Ejecutar seed del usuario admin
  // console.log("Sembrando usuario admin...");
  // await seedAdminUser();

  // Ejecutar seed de marcas y modelos
  console.log("Sembrando marcas y modelos...");
  await seedBrandsAndModels();

  // Ejecutar seed de tarjetas de pago
  console.log("Sembrando tarjetas de pago...");
  await seedPaymentCards();

  // Ejecutar seed de métodos de pago
  console.log("Sembrando métodos de pago...");
  await seedPaymentMethods();

  // Ejecutar seed de bancos
  console.log("Sembrando bancos...");
  await seedBanks();

  // Ejecutar seed de tipos de tarjetas y asociaciones banco-tarjeta
  console.log("Sembrando tipos de tarjetas y asociaciones banco-tarjeta...");
  await seedCardTypesAndBankCards();

  // Ejecutar seed de promociones bancarias de ejemplo
  console.log("Sembrando promociones bancarias de ejemplo...");
  await seedBankingPromotions();

  // Ejecutar seed de promociones bancarias que usan BankCard
  console.log("Sembrando promociones bancarias con BankCard...");
  await seedBankingPromotionsWithBankCards();

  // Ejecutar seed de colores globales
  console.log("Sembrando colores globales...");
  await seedGlobalColors();

  console.log("Seed finalizado exitosamente.");
  console.log("Cerrando conexión a la base de datos...");
}

// Función para crear usuario admin y organización
/*
async function seedAdminUser() {
  try {
    console.log("Creando organización apex y usuario admin...");

    // Create or get the organization first
    const organization = await prisma.organization.upsert({
      where: { slug: "apex" },
      update: {},
      create: {
        name: "apex",
        slug: "apex",
      },
    });

    console.log("Organización creada/actualizada:", organization.name, "con ID:", organization.id);

    // Hash the password
    const hashedPassword = await bcrypt.hash("123456789", 10);

    // Create the admin user
    const user = await prisma.user.upsert({
      where: { email: "damiantriebl@gmail.com" },
      update: {
        name: "Damian Triebl",
        emailVerified: true,
        role: "root",
        organizationId: organization.id,
      },
      create: {
        name: "Damian Triebl",
        email: "damiantriebl@gmail.com",
        emailVerified: true,
        role: "root",
        organizationId: organization.id,
      },
    });

    console.log("Usuario creado/actualizado:", user.email, "con ID:", user.id);

    // Delete any existing accounts for this user to avoid conflicts
    await prisma.account.deleteMany({
      where: { userId: user.id },
    });

    console.log("Cuentas existentes eliminadas para evitar conflictos");

    // Create account with email providerId for Better Auth
    await prisma.account.create({
      data: {
        userId: user.id,
        providerId: "email", // Cambiado de 'credentials' a 'email' para Better Auth
        accountId: user.email, // Usando el email como accountId
        password: hashedPassword,
      },
    });
    console.log('Nueva cuenta creada con contraseña y providerId "email"');

    // Verificar que la cuenta se haya creado correctamente
    const checkAccount = await prisma.account.findFirst({
      where: {
        userId: user.id,
        providerId: "email",
      },
    });

    if (checkAccount) {
      console.log('✅ Verificación: cuenta encontrada con providerId "email"');
    } else {
      console.log("❌ Advertencia: No se encontró la cuenta después de crearla");
    }

    console.log("✅ Usuario admin creado exitosamente:", user.email);
  } catch (error) {
    console.error("❌ Error al crear usuario admin:", error);
  }
}
*/

async function seedBrandsAndModels() {
  // Define the brand colors
  const marcaColores: Record<string, string> = {
    Honda: "#e60012", // rojo clásico Honda (Corrected hex)
    Yamaha: "#d90000", // rojo profundo
    Bajaj: "#005baa", // azul institucional
    KTM: "#ff6600", // naranja KTM icónico
    Suzuki: "#005bac", // azul Suzuki
    BMW: "#1c69d4", // azul BMW
    Kawasaki: "#66ff00", // verde lima Kawasaki
    RoyalEnfield: "#d9230f", // rojo indio tradicional
    Ducati: "#cc0000", // rojo Ducati
    "Harley-Davidson": "#ff6600", // naranja y negro clásico HD (Quoted key)
    Husqvarna: "#002d56", // azul oscuro sueco
    Zanella: "#9e0b0f", // rojo oscuro Zanella
    Motomel: "#003399", // azul fuerte
    Corven: "#f25c00", // naranja Corven
    Gilera: "#bd0000", // rojo oscuro deportivo
    TVS: "#004aad", // azul TVS
  };

  // Assign the data array to the 'motos' variable
  const motos = [
    {
      marca: "Benelli",
      modelos: [
        "Tnt 15",
        "180 S",
        "251S",
        "302S",
        "TRK 502X",
        "TRK 502",
        "TRK 702",
        "TRK 702 x",
        "TRK 251 full",
        "Leoncino 250",
        "Leoncino trail",
        "Leoncino 800 trail",
        "Imperiale",
        "502C",
        "Tnt 600i",
        "752s",
        "RK 150",
        "202 K light",
        "v302 c"
      ]
    },
    {
      marca: "SYM",
      modelos: [
        "Jet 14 200",
        "Citycom 300I",
        "Orbit II 125",
        "Joyride 16 300",
        "Maxsym TL 508",
      ]
    },
    {
      marca: "Honda",
      modelos: [
        "XR150L",
        "CB1",
        "Storm 125",
        "Biz 125",
        "Wave 110",
        "CB125F Twister",
        "CB190R",
        "CB250 Twister",
        "CB300F Twister",
        "CB750 Hornet",
        "XR190L",
        "XR250 Tornado",
        "XRE300",
        "CRF250R",
        "CRF300L",
        "CRF300 Rally",
        "PCX 160",
        "Navi 110",
        "Elite 125",
        "Africa Twin",
        "NC750X",
        "CB500F",
        "CB500X",
        "CB650R",
        "CBR650R",
        "CBR600RR",
        "CBR1000RR-R Fireblade",
        "Rebel 500",
        "Rebel 1100",
        "Forza 350",
        "Forza 750",
        "ADV350",
        "Gold Wing",
      ],
    },
    {
      marca: "Yamaha",
      modelos: [
        "YBR125",
        "FZ25",
        "MT-03",
        "FZ-S FI V3",
        "FZ-X",
        "FZ V4",
        "MT-07",
        "MT-09",
        "MT-09 SP",
        "MT-10",
        "XSR700",
        "XSR900",
        "XSR900 GP",
        "R3",
        "R6 Race",
        "R1",
        "R1M",
        "XMAX 300",
        "NMAX 155",
        "Ray ZR 125",
        "Fascino 125",
        "XMAX 250",
        "XMAX 400",
        "TMAX 560",
        "Tracer 700",
        "Tracer 900",
        "Tracer 900 GT",
        "Super Ténéré 1200",
        "XTZ125",
        "XTZ150",
        "XTZ250",
        "WR250F",
        "WR450F",
        "YZ125",
        "YZ250",
        "YZ250F",
        "YZ450F",
      ],
    },
    {
      marca: "Bajaj",
      modelos: ["Pulsar P150", "Rouser NS200", "NS160", "Dominar 400"],
    },
    {
      marca: "KTM",
      modelos: ["200 Duke", "250 Duke", "390 Duke", "250 Adventure"],
    },
    {
      marca: "Suzuki",
      modelos: ["V-Strom 1050DE", "GSX-R1000R", "Hayabusa", "DR650SE"],
    },
    {
      marca: "BMW",
      modelos: ["G 310 R", "R 1250 GS", "S 1000 RR", "R 1250 RT"],
    },
    {
      marca: "Kawasaki",
      modelos: ["Ninja 500 ABS", "Z 650 ABS", "Versys X300 ABS", "KLR 650 ABS"],
    },
    {
      marca: "Royal Enfield",
      modelos: ["Meteor 350", "Classic 350", "Himalayan 450", "Interceptor 650"],
    },
    {
      marca: "Ducati",
      modelos: ["Multistrada V2", "Panigale V4", "Scrambler Icon", "Monster 937"],
    },
    {
      marca: "Harley-Davidson",
      modelos: ["Road King Special", "Street Glide", "Road Glide", "Street Glide Ultra"],
    },
    {
      marca: "Husqvarna",
      modelos: ["Vitpilen 401", "Svartpilen 401", "701 Enduro", "701 Supermoto"],
    },
    {
      marca: "Zanella",
      modelos: ["ZB 110 Z1", "RX 150 G3", "ZR 250 LT", "Patagonian Eagle 250"],
    },
    {
      marca: "Motomel",
      modelos: ["Blitz 110", "CG 150 Serie 2", "Sirius 200", "Skua 250"],
    },
    {
      marca: "Corven",
      modelos: ["Energy 110", "Triax 150", "Mirage 110", "TXR 250"],
    },
    {
      marca: "Gilera",
      modelos: ["Smash 110", "VC 150", "Sahel 150", "Yamaha FZ16"],
    },
    {
      marca: "TVS",
      modelos: ["Apache RTR 160 4V", "Apache RTR 200 4V", "RR 310"],
    },
  ]; // End of motos array assignment

  console.log(`Creando ${motos.length} marcas con sus modelos...`);
  let modelosCreados = 0;

  for (const { marca, modelos } of motos) {
    const color = marcaColores[marca.replace(/-/g, "")] || "#CCCCCC"; // Get color, handle hyphens, provide default

    const brand = await prisma.brand.upsert({
      where: { name: marca },
      update: { color: color }, // Update color if brand exists
      create: { name: marca, color: color }, // Create brand with color
    });

    for (const modelo of modelos) {
      await prisma.model.upsert({
        where: { name_brandId: { name: modelo, brandId: brand.id } }, // Assumes @@unique([name, brandId])
        update: {}, // No specific model fields to update here
        create: {
          name: modelo,
          brandId: brand.id,
        },
      });
      modelosCreados++;
    }
  }

  console.log(
    `Seed de marcas y modelos completado: ${motos.length} marcas y ${modelosCreados} modelos creados.`,
  );
}

// Función para sembrar colores globales básicos
async function seedGlobalColors() {
  // Definición de colores globales
  const globalColors = [
    // Colores primarios
    {
      name: "Negro",
      type: "SOLIDO",
      colorOne: "#000000",
      colorTwo: null,
      isGlobal: true,
    },
    {
      name: "Blanco",
      type: "SOLIDO",
      colorOne: "#FFFFFF",
      colorTwo: null,
      isGlobal: true,
    },
    {
      name: "Gris",
      type: "SOLIDO",
      colorOne: "#808080",
      colorTwo: null,
      isGlobal: true,
    },
    {
      name: "Rojo",
      type: "SOLIDO",
      colorOne: "#FF0000",
      colorTwo: null,
      isGlobal: true,
    },
    {
      name: "Azul",
      type: "SOLIDO",
      colorOne: "#0000FF",
      colorTwo: null,
      isGlobal: true,
    },
    {
      name: "Verde",
      type: "SOLIDO",
      colorOne: "#008000",
      colorTwo: null,
      isGlobal: true,
    },
    {
      name: "Amarillo",
      type: "SOLIDO",
      colorOne: "#FFFF00",
      colorTwo: null,
      isGlobal: true,
    },
    {
      name: "Naranja",
      type: "SOLIDO",
      colorOne: "#FFA500",
      colorTwo: null,
      isGlobal: true,
    },
    {
      name: "Violeta",
      type: "SOLIDO",
      colorOne: "#8A2BE2",
      colorTwo: null,
      isGlobal: true,
    },
    {
      name: "Marrón",
      type: "SOLIDO",
      colorOne: "#A52A2A",
      colorTwo: null,
      isGlobal: true,
    },
    {
      name: "Dorado",
      type: "SOLIDO",
      colorOne: "#FFD700",
      colorTwo: null,
      isGlobal: true,
    },
    {
      name: "Plateado",
      type: "SOLIDO",
      colorOne: "#C0C0C0",
      colorTwo: null,
      isGlobal: true,
    },

    // Bitonos comunes
    {
      name: "Negro y Rojo",
      type: "BITONO",
      colorOne: "#000000",
      colorTwo: "#FF0000",
      isGlobal: true,
    },
    {
      name: "Negro y Azul",
      type: "BITONO",
      colorOne: "#000000",
      colorTwo: "#0000FF",
      isGlobal: true,
    },
    {
      name: "Rojo y Blanco",
      type: "BITONO",
      colorOne: "#FF0000",
      colorTwo: "#FFFFFF",
      isGlobal: true,
    },
    {
      name: "Azul y Blanco",
      type: "BITONO",
      colorOne: "#0000FF",
      colorTwo: "#FFFFFF",
      isGlobal: true,
    },

    // Patrones comunes
    {
      name: "Camuflaje Gris",
      type: "PATRON",
      colorOne: "#808080",
      colorTwo: "#333333",
      isGlobal: true,
    },
    {
      name: "Racing Stripe",
      type: "PATRON",
      colorOne: "#FFFFFF",
      colorTwo: "#000000",
      isGlobal: true,
    },
  ];

  console.log(`Creando ${globalColors.length} colores globales...`);

  // Necesitamos crear estos colores para todas las organizaciones existentes
  const organizations = await prisma.organization.findMany({
    select: { id: true },
  });

  if (organizations.length === 0) {
    console.log("No hay organizaciones en la base de datos para asignar colores globales.");
    return;
  }

  let coloresCreados = 0;

  // Iterar sobre cada organización
  for (const org of organizations) {
    console.log(`Procesando colores para organización ID: ${org.id}`);

    // Para cada organización, crear los colores globales
    for (const [index, color] of globalColors.entries()) {
      await prisma.motoColor.upsert({
        where: {
          organizationId_name: {
            organizationId: org.id,
            name: color.name,
          },
        },
        update: {
          colorOne: color.colorOne,
          colorTwo: color.colorTwo,
          type: color.type,
          isGlobal: true,
        },
        create: {
          name: color.name,
          type: color.type,
          colorOne: color.colorOne,
          colorTwo: color.colorTwo,
          order: index,
          isGlobal: true,
          organizationId: org.id,
        },
      });
      coloresCreados++;
    }
  }

  console.log(
    `Seed de colores globales completado: ${coloresCreados} colores creados/actualizados.`,
  );
}

// Función para sembrar las tarjetas de pago
async function seedPaymentCards() {
  const paymentCards = [
    {
      name: "Visa",
      type: "credit",
      issuer: "Visa Argentina",
      logoUrl: "https://card-logo.com/wp-content/uploads/2020/09/visa.svg",
    },
    {
      name: "Visa Débito",
      type: "debit",
      issuer: "Visa Argentina",
      logoUrl: "https://card-logo.com/wp-content/uploads/2020/09/visa.svg",
    },
    {
      name: "Mastercard",
      type: "credit",
      issuer: "Mastercard Argentina",
      logoUrl: "https://card-logo.com/wp-content/uploads/2020/09/mastercard.svg",
    },
    {
      name: "Mastercard Débito",
      type: "debit",
      issuer: "Mastercard Argentina",
      logoUrl: "https://card-logo.com/wp-content/uploads/2020/09/mastercard.svg",
    },
    {
      name: "American Express",
      type: "credit",
      issuer: "American Express Argentina",
      logoUrl: "https://card-logo.com/wp-content/uploads/2020/09/amex.svg",
    },
    {
      name: "Cabal",
      type: "credit",
      issuer: "Red Cabal",
      logoUrl: "https://card-logo.com/wp-content/uploads/2020/09/cabal.svg",
    },
    {
      name: "Cabal Débito",
      type: "debit",
      issuer: "Red Cabal",
      logoUrl: "https://card-logo.com/wp-content/uploads/2020/09/cabal.svg",
    },
    {
      name: "Naranja X",
      type: "credit",
      issuer: "Naranja X",
      logoUrl: "https://card-logo.com/wp-content/uploads/2020/09/naranja.svg",
    },
    {
      name: "Mercado Pago Mastercard",
      type: "debit",
      issuer: "Mercado Pago",
      logoUrl: "https://card-logo.com/wp-content/uploads/2020/09/mercado-pago.svg",
    },
    {
      name: "Ualá Mastercard",
      type: "debit",
      issuer: "Ualá",
      logoUrl: "https://card-logo.com/wp-content/uploads/2020/09/uala.svg",
    },
    {
      name: "BBVA Visa",
      type: "credit",
      issuer: "BBVA Argentina",
      logoUrl: "https://card-logo.com/wp-content/uploads/2020/09/visa.svg",
    },
    {
      name: "Santander Mastercard",
      type: "credit",
      issuer: "Banco Santander Río",
      logoUrl: "https://card-logo.com/wp-content/uploads/2020/09/mastercard.svg",
    },
    {
      name: "Galicia Visa",
      type: "credit",
      issuer: "Banco Galicia",
      logoUrl: "https://card-logo.com/wp-content/uploads/2020/09/visa.svg",
    },
    {
      name: "Banco Nación Mastercard",
      type: "credit",
      issuer: "Banco de la Nación Argentina",
      logoUrl: "https://card-logo.com/wp-content/uploads/2020/09/mastercard.svg",
    },
    {
      name: "Banco Provincia Visa",
      type: "credit",
      issuer: "Banco Provincia",
      logoUrl: "https://card-logo.com/wp-content/uploads/2020/09/visa.svg",
    },
    {
      name: "ICBC Mastercard",
      type: "credit",
      issuer: "ICBC Argentina",
      logoUrl: "https://card-logo.com/wp-content/uploads/2020/09/mastercard.svg",
    },
    {
      name: "HSBC Visa",
      type: "credit",
      issuer: "HSBC Argentina",
      logoUrl: "https://card-logo.com/wp-content/uploads/2020/09/visa.svg",
    },
    {
      name: "Brubank Visa",
      type: "debit",
      issuer: "Brubank",
      logoUrl: "https://card-logo.com/wp-content/uploads/2020/09/visa.svg",
    },
    {
      name: "Wilobank Mastercard",
      type: "debit",
      issuer: "Wilobank",
      logoUrl: "https://card-logo.com/wp-content/uploads/2020/09/mastercard.svg",
    },
    {
      name: "Banco Macro Visa",
      type: "credit",
      issuer: "Banco Macro",
      logoUrl: "https://card-logo.com/wp-content/uploads/2020/09/visa.svg",
    },
    {
      name: "Banco Patagonia Mastercard",
      type: "credit",
      issuer: "Banco Patagonia",
      logoUrl: "https://card-logo.com/wp-content/uploads/2020/09/mastercard.svg",
    },
    {
      name: "Banco Supervielle Visa",
      type: "credit",
      issuer: "Banco Supervielle",
      logoUrl: "https://card-logo.com/wp-content/uploads/2020/09/visa.svg",
    },
    {
      name: "Banco Comafi Mastercard",
      type: "credit",
      issuer: "Banco Comafi",
      logoUrl: "https://card-logo.com/wp-content/uploads/2020/09/mastercard.svg",
    },
    {
      name: "Banco Hipotecario Visa",
      type: "credit",
      issuer: "Banco Hipotecario",
      logoUrl: "https://card-logo.com/wp-content/uploads/2020/09/visa.svg",
    },
    {
      name: "Banco Itaú Mastercard",
      type: "credit",
      issuer: "Banco Itaú Argentina",
      logoUrl: "https://card-logo.com/wp-content/uploads/2020/09/mastercard.svg",
    },
    {
      name: "Banco Ciudad Visa",
      type: "credit",
      issuer: "Banco Ciudad",
      logoUrl: "https://card-logo.com/wp-content/uploads/2020/09/visa.svg",
    },
    {
      name: "Banco del Sol Mastercard",
      type: "debit",
      issuer: "Banco del Sol",
      logoUrl: "https://card-logo.com/wp-content/uploads/2020/09/mastercard.svg",
    },
    {
      name: "Banco del Chaco Mastercard",
      type: "credit",
      issuer: "Nuevo Banco del Chaco",
      logoUrl: "https://card-logo.com/wp-content/uploads/2020/09/mastercard.svg",
    },
    {
      name: "Banco de Córdoba Visa",
      type: "credit",
      issuer: "Banco de Córdoba",
      logoUrl: "https://card-logo.com/wp-content/uploads/2020/09/visa.svg",
    },
    {
      name: "Banco de Santa Fe Mastercard",
      type: "credit",
      issuer: "Banco de Santa Fe",
      logoUrl: "https://card-logo.com/wp-content/uploads/2020/09/mastercard.svg",
    },
    {
      name: "Banco de San Juan Visa",
      type: "credit",
      issuer: "Banco de San Juan",
      logoUrl: "https://card-logo.com/wp-content/uploads/2020/09/visa.svg",
    },
    {
      name: "Banco de Santa Cruz Mastercard",
      type: "credit",
      issuer: "Banco de Santa Cruz",
      logoUrl: "https://card-logo.com/wp-content/uploads/2020/09/mastercard.svg",
    },
  ];

  console.log(`Creando ${paymentCards.length} tarjetas de pago...`);

  for (const card of paymentCards) {
    await prisma.paymentCard.upsert({
      where: { name: card.name },
      update: {
        type: card.type,
        issuer: card.issuer,
        logoUrl: card.logoUrl,
      },
      create: {
        name: card.name,
        type: card.type,
        issuer: card.issuer,
        logoUrl: card.logoUrl,
      },
    });
  }

  console.log("Tarjetas de pago creadas exitosamente!");
}

// Función para sembrar métodos de pago
async function seedPaymentMethods() {
  const DEFAULT_PAYMENT_METHODS = [
    {
      name: "Efectivo",
      type: "cash",
      description: "Pago en efectivo",
      iconUrl: "/icons/payment-methods/cash.svg",
    },
    {
      name: "Tarjeta de Crédito",
      type: "credit",
      description: "Pago con tarjeta de crédito",
      iconUrl: "/icons/payment-methods/credit-card.svg",
    },
    {
      name: "Tarjeta de Débito",
      type: "debit",
      description: "Pago con tarjeta de débito",
      iconUrl: "/icons/payment-methods/debit-card.svg",
    },
    {
      name: "Transferencia Bancaria",
      type: "transfer",
      description: "Pago por transferencia bancaria",
      iconUrl: "/icons/payment-methods/bank-transfer.svg",
    },
    {
      name: "Cheque",
      type: "check",
      description: "Pago con cheque",
      iconUrl: "/icons/payment-methods/check.svg",
    },
    {
      name: "Depósito Bancario",
      type: "deposit",
      description: "Pago por depósito bancario",
      iconUrl: "/icons/payment-methods/bank-deposit.svg",
    },
    {
      name: "MercadoPago",
      type: "mercadopago",
      description: "Pago a través de MercadoPago",
      iconUrl: "/icons/payment-methods/mercadopago.svg",
    },
    {
      name: "Código QR",
      type: "qr",
      description: "Pago mediante escaneo de código QR",
      iconUrl: "/icons/payment-methods/qr-code.svg",
    },
    {
      name: "Criptomonedas/USDT",
      type: "crypto",
      description: "Pago con criptomonedas o USDT",
      iconUrl: "/icons/payment-methods/crypto.svg",
    },
    {
      name: "Cuenta Corriente",
      type: "current_account",
      description: "Pago con cuenta corriente financiada",
      iconUrl: "/icons/payment-methods/current-account.svg",
    },
  ];

  console.log(
    `Sincronizando ${DEFAULT_PAYMENT_METHODS.length} métodos de pago en la tabla PaymentMethod...`,
  );

  for (const defaultMethod of DEFAULT_PAYMENT_METHODS) {
    await prisma.paymentMethod.upsert({
      where: { type: defaultMethod.type },
      update: {
        name: defaultMethod.name,
        description: defaultMethod.description,
        iconUrl: defaultMethod.iconUrl,
      },
      create: {
        name: defaultMethod.name,
        type: defaultMethod.type,
        description: defaultMethod.description,
        iconUrl: defaultMethod.iconUrl,
      },
    });
  }
  console.log("✅ Tabla PaymentMethod sincronizada.");

  // Obtener todas las organizaciones
  const organizations = await prisma.organization.findMany({
    select: { id: true },
  });

  if (organizations.length === 0) {
    console.log("No hay organizaciones para asignar métodos de pago.");
    return;
  }

  // Obtener todos los métodos de pago de la BD (ya sincronizados)
  const allPaymentMethodsInDB = await prisma.paymentMethod.findMany();

  for (const org of organizations) {
    console.log(`Procesando métodos de pago para la organización ID: ${org.id}`);
    for (const [index, methodInDB] of allPaymentMethodsInDB.entries()) {
      const isCurrentAccount = methodInDB.type === "current_account";
      await prisma.organizationPaymentMethod.upsert({
        where: {
          organizationId_methodId: {
            organizationId: org.id,
            methodId: methodInDB.id,
          },
        },
        update: {
          // No actualizamos isEnabled aquí para permitir configuraciones manuales,
          // excepto si es Cuenta Corriente y no existe, la habilitamos.
          // Si ya existe, respetamos su estado actual.
        },
        create: {
          organizationId: org.id,
          methodId: methodInDB.id,
          isEnabled: isCurrentAccount, // Habilitar 'Cuenta Corriente' por defecto
          order: index, // Usar el índice como orden inicial
        },
      });
    }
    console.log(`✅ Métodos de pago procesados para la organización ID: ${org.id}`);
  }

  console.log(`✅ Sincronización de métodos de pago para organizaciones completada.`);
}

// Función para sembrar bancos
async function seedBanks() {
  const banks = [
    {
      name: "Banco de la Nación Argentina",
      logoUrl: "https://bank-logo.com/wp-content/uploads/2020/09/banco-nacion.svg",
    },
    {
      name: "Banco Provincia",
      logoUrl: "https://bank-logo.com/wp-content/uploads/2020/09/banco-provincia.svg",
    },
    {
      name: "Banco Ciudad",
      logoUrl: "https://bank-logo.com/wp-content/uploads/2020/09/banco-ciudad.svg",
    },
    {
      name: "Banco Santander",
      logoUrl: "https://bank-logo.com/wp-content/uploads/2020/09/santander.svg",
    },
    {
      name: "Banco Galicia",
      logoUrl: "https://bank-logo.com/wp-content/uploads/2020/09/galicia.svg",
    },
    {
      name: "BBVA",
      logoUrl: "https://bank-logo.com/wp-content/uploads/2020/09/bbva.svg",
    },
    {
      name: "HSBC",
      logoUrl: "https://bank-logo.com/wp-content/uploads/2020/09/hsbc.svg",
    },
    {
      name: "Banco Macro",
      logoUrl: "https://bank-logo.com/wp-content/uploads/2020/09/macro.svg",
    },
    {
      name: "Banco Patagonia",
      logoUrl: "https://bank-logo.com/wp-content/uploads/2020/09/patagonia.svg",
    },
    {
      name: "Banco Hipotecario",
      logoUrl: "https://bank-logo.com/wp-content/uploads/2020/09/hipotecario.svg",
    },
    {
      name: "ICBC",
      logoUrl: "https://bank-logo.com/wp-content/uploads/2020/09/icbc.svg",
    },
    {
      name: "Banco Supervielle",
      logoUrl: "https://bank-logo.com/wp-content/uploads/2020/09/supervielle.svg",
    },
    {
      name: "Banco Comafi",
      logoUrl: "https://bank-logo.com/wp-content/uploads/2020/09/comafi.svg",
    },
    {
      name: "Banco Itaú",
      logoUrl: "https://bank-logo.com/wp-content/uploads/2020/09/itau.svg",
    },
    {
      name: "Banco de Córdoba",
      logoUrl: "https://bank-logo.com/wp-content/uploads/2020/09/bancor.svg",
    },
    {
      name: "Banco de Santa Fe",
      logoUrl: "https://bank-logo.com/wp-content/uploads/2020/09/banco-santa-fe.svg",
    },
    {
      name: "Brubank",
      logoUrl: "https://bank-logo.com/wp-content/uploads/2020/09/brubank.svg",
    },
    {
      name: "Banco del Sol",
      logoUrl: "https://bank-logo.com/wp-content/uploads/2020/09/banco-del-sol.svg",
    },
    {
      name: "Reba",
      logoUrl: "https://bank-logo.com/wp-content/uploads/2020/09/reba.svg",
    },
    {
      name: "Mercado Pago",
      logoUrl: "https://bank-logo.com/wp-content/uploads/2020/09/mercado-pago.svg",
    },
    {
      name: "Ualá",
      logoUrl: "https://bank-logo.com/wp-content/uploads/2020/09/uala.svg",
    },
    {
      name: "Naranja X",
      logoUrl: "https://bank-logo.com/wp-content/uploads/2020/09/naranja-x.svg",
    },
    {
      name: "Cuenta DNI",
      logoUrl: "https://bank-logo.com/wp-content/uploads/2020/09/cuenta-dni.svg",
    },
  ];

  console.log(`Verificando bancos existentes...`);
  // Verificar si ya existen bancos en la base de datos
  const existingCount = await prisma.bank.count();

  if (existingCount > 0) {
    console.log(
      `⚠️ Ya existen ${existingCount} bancos en la base de datos. No se cargarán datos duplicados.`,
    );
    return;
  }

  console.log(`Creando ${banks.length} bancos...`);

  for (const bank of banks) {
    await prisma.bank.upsert({
      where: { name: bank.name },
      update: {
        logoUrl: bank.logoUrl,
      },
      create: {
        name: bank.name,
        logoUrl: bank.logoUrl,
      },
    });
  }

  console.log(`✅ Bancos creados exitosamente!`);
}

// Función para sembrar tipos de tarjetas y asociaciones banco-tarjeta
async function seedCardTypesAndBankCards() {
  try {
    // Verificar si la tabla CardType existe
    const cardTypeTableExists = await checkIfTableExists("CardType");
    if (!cardTypeTableExists) {
      console.log("⚠️ La tabla CardType no existe aún. Saltando seed de tipos de tarjetas.");
      return;
    }

    // Verificar si ya existen tipos de tarjetas en la base de datos
    const existingCardTypes = await prisma.cardType.count();
    if (existingCardTypes === 0) {
      console.log("Creando tipos de tarjetas...");

      // Crear tipos de tarjetas
      const cardTypes = [
        {
          name: "Visa",
          type: "credit",
          logoUrl: "https://placehold.co/50x30/blue/white?text=VISA",
        },
        {
          name: "Mastercard",
          type: "credit",
          logoUrl: "https://placehold.co/50x30/red/white?text=MC",
        },
        {
          name: "American Express",
          type: "credit",
          logoUrl: "https://placehold.co/50x30/green/white?text=AMEX",
        },
        {
          name: "Visa Débito",
          type: "debit",
          logoUrl: "https://placehold.co/50x30/blue/white?text=VISA-D",
        },
        {
          name: "Maestro",
          type: "debit",
          logoUrl: "https://placehold.co/50x30/red/white?text=MAESTRO",
        },
      ];

      for (const cardType of cardTypes) {
        await prisma.cardType.upsert({
          where: { name: cardType.name },
          update: cardType,
          create: cardType,
        });
      }

      console.log(`✅ ${cardTypes.length} tipos de tarjetas creadas exitosamente!`);
    } else {
      console.log(`⚠️ Ya existen ${existingCardTypes} tipos de tarjetas en la base de datos.`);
    }

    // Verificar si la tabla BankCard existe
    const bankCardTableExists = await checkIfTableExists("BankCard");
    if (!bankCardTableExists) {
      console.log(
        "⚠️ La tabla BankCard no existe aún. Saltando seed de asociaciones banco-tarjeta.",
      );
      return;
    }

    // Obtener todas las organizaciones para asignarles asociaciones banco-tarjeta
    const organizations = await prisma.organization.findMany({
      select: { id: true },
    });

    if (organizations.length === 0) {
      console.log(
        "No hay organizaciones en la base de datos para asignar asociaciones banco-tarjeta.",
      );
      return;
    }

    // Obtener bancos y tipos de tarjetas
    const banks = await prisma.bank.findMany();
    const cardTypes = await prisma.cardType.findMany();

    if (banks.length === 0 || cardTypes.length === 0) {
      console.log("No hay bancos o tipos de tarjetas para crear asociaciones.");
      return;
    }

    // Mapear bancos y tipos de tarjetas por nombre para facilitar la búsqueda
    const bankMap = new Map(banks.map((bank) => [bank.name, bank.id]));
    const cardTypeMap = new Map(cardTypes.map((ct) => [ct.name, ct.id]));

    // Para cada organización, crear asociaciones banco-tarjeta
    for (const org of organizations) {
      console.log(`Creando asociaciones banco-tarjeta para organización ID: ${org.id}`);

      // Verificar si ya existen asociaciones para esta organización
      const existingAssociations = await prisma.bankCard.count({
        where: { organizationId: org.id },
      });

      if (existingAssociations > 0) {
        console.log(
          `⚠️ Ya existen ${existingAssociations} asociaciones banco-tarjeta para esta organización.`,
        );
        continue;
      }

      // Definir asociaciones entre bancos y tarjetas
      const bankCardAssociations = [
        // Banco Provincia
        { bankName: "Banco Provincia", cardTypeName: "Visa", order: 0 },
        { bankName: "Banco Provincia", cardTypeName: "Mastercard", order: 1 },
        { bankName: "Banco Provincia", cardTypeName: "Visa Débito", order: 2 },

        // Banco de la Nación Argentina
        { bankName: "Banco de la Nación Argentina", cardTypeName: "Visa", order: 0 },
        { bankName: "Banco de la Nación Argentina", cardTypeName: "Mastercard", order: 1 },
        { bankName: "Banco de la Nación Argentina", cardTypeName: "Maestro", order: 2 },

        // Banco Santander
        { bankName: "Banco Santander", cardTypeName: "Visa", order: 0 },
        { bankName: "Banco Santander", cardTypeName: "American Express", order: 1 },

        // Banco Galicia
        { bankName: "Banco Galicia", cardTypeName: "Visa", order: 0 },
        { bankName: "Banco Galicia", cardTypeName: "Mastercard", order: 1 },

        // BBVA
        { bankName: "BBVA", cardTypeName: "Visa", order: 0 },
        { bankName: "BBVA", cardTypeName: "Mastercard", order: 1 },
        { bankName: "BBVA", cardTypeName: "American Express", order: 2 },
      ];

      // Crear asociaciones
      for (const assoc of bankCardAssociations) {
        const bankId = bankMap.get(assoc.bankName);
        const cardTypeId = cardTypeMap.get(assoc.cardTypeName);

        if (bankId && cardTypeId) {
          await prisma.bankCard.create({
            data: {
              bankId,
              cardTypeId,
              organizationId: org.id,
              isEnabled: true,
              order: assoc.order,
            },
          });
        }
      }

      console.log(
        `✅ ${bankCardAssociations.length} asociaciones banco-tarjeta creadas para la organización ${org.id}!`,
      );
    }
  } catch (error) {
    console.error("❌ Error al sembrar tipos de tarjetas y asociaciones:", error);
  }
}

// Función para sembrar promociones bancarias de ejemplo
async function seedBankingPromotions() {
  try {
    // Verificar si la tabla de promociones existe - se podría fallar silenciosamente si no
    const tableExists = await checkIfTableExists("BankingPromotion");
    if (!tableExists) {
      console.log(
        "⚠️ La tabla BankingPromotion no existe aún. Saltando seed de promociones bancarias.",
      );
      return;
    }

    // Verificar si ya existen promociones en la base de datos
    const existingCount = await prisma.bankingPromotion.count();
    if (existingCount > 0) {
      console.log(
        `⚠️ Ya existen ${existingCount} promociones bancarias en la base de datos. No se cargarán datos de ejemplo.`,
      );
      return;
    }

    // Obtener todas las organizaciones para asignarles promociones de ejemplo
    const organizations = await prisma.organization.findMany({
      select: { id: true },
    });

    if (organizations.length === 0) {
      console.log("No hay organizaciones en la base de datos para asignar promociones bancarias.");
      return;
    }

    // Obtener métodos de pago para relacionarlos con las promociones
    const paymentMethods = await prisma.paymentMethod.findMany();
    if (paymentMethods.length === 0) {
      console.log("No hay métodos de pago en la base de datos para crear promociones.");
      return;
    }

    // Obtener bancos para relacionarlos con las promociones
    const banks = await prisma.bank.findMany();
    if (banks.length === 0) {
      console.log("No hay bancos en la base de datos para crear promociones.");
      return;
    }

    // Obtener tarjetas para relacionarlas con las promociones
    const cards = await prisma.paymentCard.findMany({
      where: {
        type: "credit",
      },
    });
    if (cards.length === 0) {
      console.log("No hay tarjetas de crédito en la base de datos para crear promociones.");
      return;
    }

    // Mapear métodos de pago por tipo para facilitar la búsqueda
    const methodsByType = paymentMethods.reduce(
      (acc, method) => {
        acc[method.type] = method;
        return acc;
      },
      {} as Record<string, any>,
    );

    // Para cada organización, crear promociones de ejemplo
    for (const org of organizations) {
      console.log(`Creando promociones bancarias para organización ID: ${org.id}`);

      // 1. Promoción de efectivo con descuento
      if (methodsByType.cash) {
        await prisma.bankingPromotion.create({
          data: {
            name: "10% de descuento en efectivo",
            description: "Pago en efectivo con 10% de descuento sobre el precio total",
            organizationId: org.id,
            paymentMethodId: methodsByType.cash.id,
            discountRate: 10,
            isEnabled: true,
          },
        });
      }

      // 2. Promoción de transferencia con recargo
      if (methodsByType.transfer) {
        await prisma.bankingPromotion.create({
          data: {
            name: "Transferencia bancaria (2% recargo)",
            description:
              "Pago por transferencia bancaria con 2% de recargo por gastos administrativos",
            organizationId: org.id,
            paymentMethodId: methodsByType.transfer.id,
            surchargeRate: 2,
            isEnabled: true,
          },
        });
      }

      // 3. Promoción de tarjeta de crédito con cuotas
      if (methodsByType.credit && cards.length > 0 && banks.length > 0) {
        // Buscar una tarjeta Visa o Mastercard de un banco principal para el ejemplo
        const bankProvinciaCard = cards.find(
          (card) =>
            card.name.toLowerCase().includes("visa") &&
            card.issuer.toLowerCase().includes("provincia"),
        );

        const exampleCard = bankProvinciaCard || cards[0];
        const exampleBank = banks.find((bank) => bank.name.includes("Provincia")) || banks[0];

        // Crear promoción con plan de cuotas
        const promocionCuotas = await prisma.bankingPromotion.create({
          data: {
            name: "Cuotas Banco Provincia",
            description: "Promoción con 3 y 12 cuotas sin interés, 6 cuotas (10%) y 9 cuotas (17%)",
            organizationId: org.id,
            paymentMethodId: methodsByType.credit.id,
            cardId: exampleCard.id,
            bankId: exampleBank.id,
            isEnabled: true,
          },
        });

        // Crear planes de cuotas para la promoción
        await prisma.installmentPlan.createMany({
          data: [
            {
              bankingPromotionId: promocionCuotas.id,
              installments: 3,
              interestRate: 0, // Sin interés
              isEnabled: true,
            },
            {
              bankingPromotionId: promocionCuotas.id,
              installments: 6,
              interestRate: 10, // 10% interés
              isEnabled: true,
            },
            {
              bankingPromotionId: promocionCuotas.id,
              installments: 9,
              interestRate: 17, // 17% interés
              isEnabled: true,
            },
            {
              bankingPromotionId: promocionCuotas.id,
              installments: 12,
              interestRate: 0, // Sin interés
              isEnabled: true,
            },
          ],
        });
      }

      // 4. Promoción de MercadoPago
      if (methodsByType.mercadopago) {
        await prisma.bankingPromotion.create({
          data: {
            name: "MercadoPago (5% recargo)",
            description: "Pago con MercadoPago con 5% de recargo por comisiones",
            organizationId: org.id,
            paymentMethodId: methodsByType.mercadopago.id,
            surchargeRate: 5,
            isEnabled: true,
          },
        });
      }

      // 5. Promoción de Criptomonedas/USDT
      if (methodsByType.crypto) {
        await prisma.bankingPromotion.create({
          data: {
            name: "Criptomonedas/USDT (5% descuento)",
            description: "Pago con criptomonedas o USDT con 5% de descuento",
            organizationId: org.id,
            paymentMethodId: methodsByType.crypto.id,
            discountRate: 5,
            isEnabled: true,
          },
        });
      }
    }

    console.log("✅ Promociones bancarias de ejemplo creadas exitosamente!");
  } catch (error) {
    console.error("❌ Error al sembrar promociones bancarias:", error);
  }
}

// Función para sembrar promociones bancarias que usan BankCard
async function seedBankingPromotionsWithBankCards() {
  try {
    // Verificar si la tabla de promociones existe
    const tableExists = await checkIfTableExists("BankingPromotion");
    if (!tableExists) {
      console.log(
        "⚠️ La tabla BankingPromotion no existe aún. Saltando seed de promociones bancarias.",
      );
      return;
    }

    // Verificar si ya existen promociones que usan bankCardId en la base de datos
    const existingCount = await prisma.bankingPromotion.count({
      where: {
        bankCardId: { not: null },
      },
    });

    if (existingCount > 0) {
      console.log(
        `⚠️ Ya existen ${existingCount} promociones bancarias con BankCard en la base de datos.`,
      );
      return;
    }

    // Obtener todas las organizaciones
    const organizations = await prisma.organization.findMany({
      select: { id: true },
    });

    if (organizations.length === 0) {
      console.log("No hay organizaciones en la base de datos para asignar promociones bancarias.");
      return;
    }

    // Obtener métodos de pago para relacionarlos con las promociones
    const paymentMethods = await prisma.paymentMethod.findMany();
    if (paymentMethods.length === 0) {
      console.log("No hay métodos de pago en la base de datos para crear promociones.");
      return;
    }

    // Mapear métodos de pago por tipo para facilitar la búsqueda
    const methodsByType = paymentMethods.reduce(
      (acc, method) => {
        acc[method.type] = method;
        return acc;
      },
      {} as Record<string, any>,
    );

    // Para cada organización, crear promociones que usen BankCard
    for (const org of organizations) {
      console.log(`Creando promociones bancarias con BankCard para organización ID: ${org.id}`);

      // Obtener las asociaciones banco-tarjeta de esta organización
      const bankCards = await prisma.bankCard.findMany({
        where: {
          organizationId: org.id,
          isEnabled: true,
        },
        include: {
          bank: true,
          cardType: true,
        },
      });

      if (bankCards.length === 0) {
        console.log(`No hay asociaciones banco-tarjeta para la organización ${org.id}.`);
        continue;
      }

      // Buscar una asociación de Visa con Banco Provincia para el ejemplo
      let exampleBankCard = bankCards.find(
        (bc) =>
          bc.bank.name.includes("Provincia") &&
          bc.cardType.name.includes("Visa") &&
          bc.cardType.type === "credit",
      );

      // Si no se encuentra, usar cualquier tarjeta de crédito
      if (!exampleBankCard) {
        exampleBankCard = bankCards.find((bc) => bc.cardType.type === "credit");
      }

      // Si tenemos una tarjeta de crédito válida y el método de pago correspondiente
      if (exampleBankCard && methodsByType.credit) {
        // Crear promoción con plan de cuotas usando bankCardId
        const promocionCuotas = await prisma.bankingPromotion.create({
          data: {
            name: `${exampleBankCard.cardType.name} ${exampleBankCard.bank.name} - 12 cuotas`,
            description: `Promoción con 3 y 12 cuotas sin interés, 6 cuotas (10%) y 9 cuotas (17%) para ${exampleBankCard.cardType.name} de ${exampleBankCard.bank.name}`,
            organizationId: org.id,
            paymentMethodId: methodsByType.credit.id,
            bankCardId: exampleBankCard.id, // Usar el ID de la asociación banco-tarjeta
            isEnabled: true,
          },
        });

        // Crear planes de cuotas para la promoción
        await prisma.installmentPlan.createMany({
          data: [
            {
              bankingPromotionId: promocionCuotas.id,
              installments: 3,
              interestRate: 0, // Sin interés
              isEnabled: true,
            },
            {
              bankingPromotionId: promocionCuotas.id,
              installments: 6,
              interestRate: 10, // 10% interés
              isEnabled: true,
            },
            {
              bankingPromotionId: promocionCuotas.id,
              installments: 9,
              interestRate: 17, // 17% interés
              isEnabled: true,
            },
            {
              bankingPromotionId: promocionCuotas.id,
              installments: 12,
              interestRate: 0, // Sin interés
              isEnabled: true,
            },
          ],
        });

        console.log(
          `✅ Promoción con BankCard creada para ${exampleBankCard.cardType.name} de ${exampleBankCard.bank.name}`,
        );
      }
    }

    console.log("✅ Promociones bancarias con BankCard creadas exitosamente!");
  } catch (error) {
    console.error("❌ Error al sembrar promociones bancarias con BankCard:", error);
  }
}

// Función auxiliar para verificar si una tabla existe
async function checkIfTableExists(tableName: string): Promise<boolean> {
  try {
    await prisma.$queryRawUnsafe(`SELECT * FROM "${tableName}" LIMIT 1`);
    return true;
  } catch (error) {
    return false;
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
