# Unificación de estado en motocicletas

## Problema
El sistema tenía dos propiedades para representar el estado de las motocicletas:
- `state`: Campo original del modelo Prisma `Motorcycle`
- `estadoVenta`: Campo duplicado en varios tipos y componentes

Esta duplicación causaba inconsistencias y problemas de mantenimiento.

## Solución implementada
Se unificó todo el código para usar exclusivamente la propiedad `state` del modelo Prisma, eliminando todas las referencias a `estadoVenta`. Los cambios incluyen:

1. Se eliminó la propiedad `estadoVenta` de los tipos:
   - `MotorcycleWithReservation` en `MotorcycleTable.tsx`
   - `MotorcycleWithRelations` en `MotorcycleTable.tsx`
   - `MotorcycleWithRelations` en `sales/[id]/page.tsx`

2. Se renombró la propiedad en `get-motorcycles.ts` para mantener consistencia:
   - Tipo `MotorcycleTableRowData`: de `estadoVenta` a `state`
   - Mapeo de resultados: de `estadoVenta: moto.state` a `state: moto.state`

3. Se modificaron todos los componentes para usar `moto.state` en lugar de `moto.estadoVenta`

## Buenas prácticas
- Siempre usar el modelo Prisma `MotorcycleState` importado desde `@prisma/client`
- Para mostrar estados traducidos, usar un objeto de configuración que mapee los valores del enum a etiquetas legibles
- No crear duplicados del estado en diferentes propiedades

## Beneficios
- Código más consistente y fácil de mantener
- Reducción de errores por inconsistencias
- Mejora en la tipificación con TypeScript (único origen de verdad)
- Optimistic UI más predecible al modificar una sola propiedad

## Implementación para futuros estados
Para agregar nuevos estados:
1. Actualizar el enum `MotorcycleState` en `schema.prisma`
2. Ejecutar `npx prisma migrate dev` para generar la migración
3. Usar el nuevo estado importando `MotorcycleState` de `@prisma/client`
4. Actualizar los mapeos de presentación (como `estadoVentaConfig`) para incluir el nuevo estado 