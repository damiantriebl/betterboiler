# Documentación de Pruebas

Este proyecto utiliza [Vitest](https://vitest.dev/) como framework de pruebas.

## Ejecutar Pruebas

El proyecto tiene configurados varios scripts para ejecutar las pruebas:

```bash
# Ejecutar todas las pruebas
pnpm test

# Ejecutar pruebas en modo watch (útil durante el desarrollo)
pnpm test:watch

# Ejecutar pruebas con informe de cobertura
pnpm test:coverage
```

## Estructura de Pruebas

Los archivos de pruebas están ubicados en el directorio `src/__tests__/` y siguen esta convención de nombres:

- `*.test.tsx` - Pruebas para componentes React
- `*.test.ts` - Pruebas para funciones y utilidades

## Escribir Pruebas

### Pruebas de Componentes React

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import MiComponente from '@/ruta/a/MiComponente';

describe('MiComponente', () => {
  it('renderiza correctamente', () => {
    render(<MiComponente />);
    expect(screen.getByText('Texto esperado')).toBeInTheDocument();
  });

  it('maneja eventos correctamente', () => {
    const onClickMock = vi.fn();
    render(<MiComponente onClick={onClickMock} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onClickMock).toHaveBeenCalledTimes(1);
  });
});
```

### Pruebas de Actions (Server Actions)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { miServerAction } from '@/actions/miServerAction';

// Mock de dependencias
vi.mock('@/lib/prisma', () => ({
  default: {
    // Mock de los métodos de Prisma que uses
    model: {
      create: vi.fn(),
      findMany: vi.fn(),
    }
  }
}));

describe('miServerAction', () => {
  it('crea un nuevo registro correctamente', async () => {
    // Configura el comportamiento del mock
    vi.mocked(prisma.model.create).mockResolvedValue({ id: '123', nombre: 'Test' });
    
    // Ejecuta la acción
    const resultado = await miServerAction({ nombre: 'Test' });
    
    // Verifica el resultado
    expect(resultado).toEqual({ id: '123', nombre: 'Test' });
  });
});
```

## Mocks

Usamos `vi.mock()` para simular dependencias como módulos, bases de datos y APIs.

Ejemplo para mockear un módulo:

```typescript
vi.mock('@/lib/api', () => ({
  fetchDatos: vi.fn()
}));

// Luego puedes configurar el comportamiento
import { fetchDatos } from '@/lib/api';
vi.mocked(fetchDatos).mockResolvedValue({ datos: [] });
```

## GitHub Actions

Este proyecto tiene configurados workflows de GitHub Actions que usan pnpm para ejecutar pruebas automáticamente:

- Las pruebas se ejecutan automáticamente en cada push y pull request
- Se genera un informe de cobertura de código
- Se ejecutan verificaciones de linting y formato

## Mejores Prácticas

- Escribe pruebas para componentes complejos y funcionalidades críticas
- Utiliza mocks para aislar el código que estás probando
- Enfócate en probar la funcionalidad, no la implementación
- Considera usar testing-library para probar componentes como lo haría un usuario
- Mantén las pruebas sencillas y enfocadas en un solo aspecto del código 