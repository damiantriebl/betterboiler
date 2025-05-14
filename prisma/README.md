# Migraciones Prisma TypeScript

Este directorio contiene scripts de migración de la base de datos que han sido convertidos de SQL a TypeScript utilizando Prisma.

## Scripts de Migración

| Script TS | Descripción | SQL Original |
|-----------|-------------|--------------|
| `fix-model-updated-at.ts` | Actualiza los campos `updatedAt` nulos en la tabla `Model` para que coincidan con `createdAt` | `fix-model-updated-at.sql` |
| `setup-current-account-method.ts` | Configura el método de pago "Cuenta Corriente" y lo habilita para todas las organizaciones | `migrations/add_current_account_method/migration.sql` |
| `add-active-days-to-banking-promotion.ts` | Verifica/sugiere cómo añadir la columna `activeDays` a la tabla `BankingPromotion` | `migrations/add_active_days_to_banking_promotion.sql` |

## Ejecutar todas las migraciones

Se ha añadido un script centralizado para ejecutar todas las migraciones TypeScript. Para ejecutarlo, utiliza:

```bash
# Usando el script de npm
npm run db:run-migrations

# O usando tsx directamente
npx tsx prisma/run-migrations.ts
```

## Ejecutar migraciones individuales

También puedes ejecutar scripts individuales:

```bash
npx tsx prisma/fix-model-updated-at.ts
npx tsx prisma/setup-current-account-method.ts
npx tsx prisma/add-active-days-to-banking-promotion.ts
```

## Ventajas sobre los scripts SQL

- **Tipado seguro**: Utiliza la API de Prisma con validación TypeScript.
- **Más detallado**: Los scripts muestran mensajes informativos y manejo de errores.
- **Modularidad**: Cada migración se puede ejecutar individualmente o como parte de una secuencia.
- **Código reutilizable**: Las funciones se pueden importar y usar en otros scripts.
- **Mayor flexibilidad**: Se pueden ejecutar consultas condicionales y lógica más compleja. 