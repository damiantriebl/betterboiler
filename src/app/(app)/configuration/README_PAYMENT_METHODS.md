# Métodos de Pago - Documentación de Implementación

Este documento explica la implementación de la funcionalidad de métodos de pago en el sistema Better.

## Archivos Implementados

1. **Componentes UI**:
   - `ManagePaymentMethods.tsx`: Componente principal para administrar métodos de pago
   - `PaymentMethodItem.tsx`: Componente para mostrar un método de pago individual

2. **Tipos**:
   - `src/types/payment-methods.ts`: Definiciones de tipos para métodos de pago

3. **Validación**:
   - `src/zod/payment-method-schemas.ts`: Esquemas Zod para validación de datos

4. **Acciones del Servidor**:
   - `src/actions/payment-methods/get-payment-methods.ts`: Acciones para obtener métodos de pago
   - `src/actions/payment-methods/manage-payment-methods.ts`: Acciones para gestionar métodos de pago

5. **Esquema de Base de Datos**:
   - Modificaciones en `prisma/schema.prisma` para agregar modelos de métodos de pago
   - `prisma/seed-payment-methods.js`: Script para poblar métodos de pago predefinidos

6. **Iconos SVG**:
   - Iconos para cada método de pago en `public/icons/payment-methods/`

## Esquema de Base de Datos

Se agregaron dos nuevos modelos a Prisma:

```prisma
// Tipos de métodos de pago (efectivo, crédito, débito, etc.)
model PaymentMethod {
  id           Int      @id @default(autoincrement())
  name         String
  type         String   // cash, credit, debit, transfer, etc.
  description  String
  iconUrl      String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  // Relations
  organizationPaymentMethods OrganizationPaymentMethod[]
}

// Tabla de unión para Organization y PaymentMethod
model OrganizationPaymentMethod {
  id            Int          @id @default(autoincrement())
  organizationId String
  methodId      Int
  isEnabled     Boolean      @default(true)
  order         Int          @default(0)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  // Relations
  organization  Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  method        PaymentMethod @relation(fields: [methodId], references: [id], onDelete: Cascade)

  // Unique constraint to prevent duplication
  @@unique([organizationId, methodId])
}
```

## Métodos de Pago Predefinidos

El sistema incluye los siguientes métodos de pago predefinidos:

1. Efectivo
2. Tarjeta de Crédito
3. Tarjeta de Débito
4. Transferencia Bancaria
5. Cheque
6. Depósito Bancario
7. MercadoPago
8. Código QR

## Migración de Base de Datos

Para aplicar los cambios en la base de datos, se pueden utilizar dos métodos:

### Método 1: Prisma Migrate (Recomendado)

```bash
npx prisma migrate dev --name add_payment_methods
```

### Método 2: SQL Manual

Si Prisma Migrate no funciona o prefieres aplicar manualmente los cambios, puedes usar el script SQL proporcionado en `migration-payment-methods.sql`.

## Funcionamiento

La interfaz permite:

1. Ver métodos de pago disponibles en el sistema
2. Agregar métodos de pago a la organización
3. Activar/desactivar métodos de pago
4. Reordenar métodos de pago mediante arrastrar y soltar
5. Eliminar métodos de pago de la organización

## Fallback a Métodos por Defecto

Si las tablas de base de datos aún no existen, el sistema utilizará una lista predefinida de métodos de pago como fallback, lo que permite que la interfaz funcione incluso antes de realizar las migraciones de base de datos.

## Próximos Pasos

1. Ejecutar la migración de base de datos
2. Integrar los métodos de pago con el flujo de ventas
3. Agregar configuraciones específicas por método (por ejemplo, cuotas para tarjetas de crédito) 