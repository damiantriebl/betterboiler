import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const paymentCards = [
  {
    "name": "Visa",
    "type": "credit",
    "issuer": "Visa Argentina",
    "logoUrl": "https://card-logo.com/wp-content/uploads/2020/09/visa.svg"
  },
  {
    "name": "Visa Débito",
    "type": "debit",
    "issuer": "Visa Argentina",
    "logoUrl": "https://card-logo.com/wp-content/uploads/2020/09/visa.svg"
  },
  {
    "name": "Mastercard",
    "type": "credit",
    "issuer": "Mastercard Argentina",
    "logoUrl": "https://card-logo.com/wp-content/uploads/2020/09/mastercard.svg"
  },
  {
    "name": "Mastercard Débito",
    "type": "debit",
    "issuer": "Mastercard Argentina",
    "logoUrl": "https://card-logo.com/wp-content/uploads/2020/09/mastercard.svg"
  },
  {
    "name": "American Express",
    "type": "credit",
    "issuer": "American Express Argentina",
    "logoUrl": "https://card-logo.com/wp-content/uploads/2020/09/amex.svg"
  },
  {
    "name": "Cabal",
    "type": "credit",
    "issuer": "Red Cabal",
    "logoUrl": "https://card-logo.com/wp-content/uploads/2020/09/cabal.svg"
  },
  {
    "name": "Cabal Débito",
    "type": "debit",
    "issuer": "Red Cabal",
    "logoUrl": "https://card-logo.com/wp-content/uploads/2020/09/cabal.svg"
  },
  {
    "name": "Naranja X",
    "type": "credit",
    "issuer": "Naranja X",
    "logoUrl": "https://card-logo.com/wp-content/uploads/2020/09/naranja.svg"
  },
  {
    "name": "Mercado Pago Mastercard",
    "type": "debit",
    "issuer": "Mercado Pago",
    "logoUrl": "https://card-logo.com/wp-content/uploads/2020/09/mercado-pago.svg"
  },
  {
    "name": "Ualá Mastercard",
    "type": "debit",
    "issuer": "Ualá",
    "logoUrl": "https://card-logo.com/wp-content/uploads/2020/09/uala.svg"
  },
  {
    "name": "BBVA Visa",
    "type": "credit",
    "issuer": "BBVA Argentina",
    "logoUrl": "https://card-logo.com/wp-content/uploads/2020/09/visa.svg"
  },
  {
    "name": "Santander Mastercard",
    "type": "credit",
    "issuer": "Banco Santander Río",
    "logoUrl": "https://card-logo.com/wp-content/uploads/2020/09/mastercard.svg"
  },
  {
    "name": "Galicia Visa",
    "type": "credit",
    "issuer": "Banco Galicia",
    "logoUrl": "https://card-logo.com/wp-content/uploads/2020/09/visa.svg"
  },
  {
    "name": "Banco Nación Mastercard",
    "type": "credit",
    "issuer": "Banco de la Nación Argentina",
    "logoUrl": "https://card-logo.com/wp-content/uploads/2020/09/mastercard.svg"
  },
  {
    "name": "Banco Provincia Visa",
    "type": "credit",
    "issuer": "Banco Provincia",
    "logoUrl": "https://card-logo.com/wp-content/uploads/2020/09/visa.svg"
  },
  {
    "name": "ICBC Mastercard",
    "type": "credit",
    "issuer": "ICBC Argentina",
    "logoUrl": "https://card-logo.com/wp-content/uploads/2020/09/mastercard.svg"
  },
  {
    "name": "HSBC Visa",
    "type": "credit",
    "issuer": "HSBC Argentina",
    "logoUrl": "https://card-logo.com/wp-content/uploads/2020/09/visa.svg"
  },
  {
    "name": "Brubank Visa",
    "type": "debit",
    "issuer": "Brubank",
    "logoUrl": "https://card-logo.com/wp-content/uploads/2020/09/visa.svg"
  },
  {
    "name": "Wilobank Mastercard",
    "type": "debit",
    "issuer": "Wilobank",
    "logoUrl": "https://card-logo.com/wp-content/uploads/2020/09/mastercard.svg"
  },
  {
    "name": "Banco Macro Visa",
    "type": "credit",
    "issuer": "Banco Macro",
    "logoUrl": "https://card-logo.com/wp-content/uploads/2020/09/visa.svg"
  },
  {
    "name": "Banco Patagonia Mastercard",
    "type": "credit",
    "issuer": "Banco Patagonia",
    "logoUrl": "https://card-logo.com/wp-content/uploads/2020/09/mastercard.svg"
  },
  {
    "name": "Banco Supervielle Visa",
    "type": "credit",
    "issuer": "Banco Supervielle",
    "logoUrl": "https://card-logo.com/wp-content/uploads/2020/09/visa.svg"
  },
  {
    "name": "Banco Comafi Mastercard",
    "type": "credit",
    "issuer": "Banco Comafi",
    "logoUrl": "https://card-logo.com/wp-content/uploads/2020/09/mastercard.svg"
  },
  {
    "name": "Banco Hipotecario Visa",
    "type": "credit",
    "issuer": "Banco Hipotecario",
    "logoUrl": "https://card-logo.com/wp-content/uploads/2020/09/visa.svg"
  },
  {
    "name": "Banco Itaú Mastercard",
    "type": "credit",
    "issuer": "Banco Itaú Argentina",
    "logoUrl": "https://card-logo.com/wp-content/uploads/2020/09/mastercard.svg"
  },
  {
    "name": "Banco Ciudad Visa",
    "type": "credit",
    "issuer": "Banco Ciudad",
    "logoUrl": "https://card-logo.com/wp-content/uploads/2020/09/visa.svg"
  },
  {
    "name": "Banco del Sol Mastercard",
    "type": "debit",
    "issuer": "Banco del Sol",
    "logoUrl": "https://card-logo.com/wp-content/uploads/2020/09/mastercard.svg"
  },
  {
    "name": "Banco del Chaco Mastercard",
    "type": "credit",
    "issuer": "Nuevo Banco del Chaco",
    "logoUrl": "https://card-logo.com/wp-content/uploads/2020/09/mastercard.svg"
  },
  {
    "name": "Banco de Córdoba Visa",
    "type": "credit",
    "issuer": "Banco de Córdoba",
    "logoUrl": "https://card-logo.com/wp-content/uploads/2020/09/visa.svg"
  },
  {
    "name": "Banco de Santa Fe Mastercard",
    "type": "credit",
    "issuer": "Banco de Santa Fe",
    "logoUrl": "https://card-logo.com/wp-content/uploads/2020/09/mastercard.svg"
  },
  {
    "name": "Banco de San Juan Visa",
    "type": "credit",
    "issuer": "Banco de San Juan",
    "logoUrl": "https://card-logo.com/wp-content/uploads/2020/09/visa.svg"
  },
  {
    "name": "Banco de Santa Cruz Mastercard",
    "type": "credit",
    "issuer": "Banco de Santa Cruz",
    "logoUrl": "https://card-logo.com/wp-content/uploads/2020/09/mastercard.svg"
  }
];

async function seedPaymentCards() {
  console.log(`Iniciando siembra de ${paymentCards.length} tarjetas de pago...`);
  
  try {
    // Primero, eliminamos todas las tarjetas existentes para evitar duplicados
    // Esto es opcional y depende de si quieres reemplazar todas las tarjetas o mantener las existentes
    // await prisma.paymentCard.deleteMany({});
    // console.log('Tarjetas existentes eliminadas.');
    
    // Insertar todas las tarjetas usando upsert para evitar errores por duplicados
    for (const card of paymentCards) {
      await prisma.paymentCard.upsert({
        where: { name: card.name },
        update: {
          type: card.type,
          issuer: card.issuer,
          logoUrl: card.logoUrl
        },
        create: {
          name: card.name,
          type: card.type,
          issuer: card.issuer,
          logoUrl: card.logoUrl
        }
      });
    }
    
    console.log('Tarjetas de pago sembradas exitosamente.');
  } catch (error) {
    console.error('Error al sembrar tarjetas de pago:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedPaymentCards()
  .catch(e => {
    console.error(e);
    process.exit(1);
  }); 