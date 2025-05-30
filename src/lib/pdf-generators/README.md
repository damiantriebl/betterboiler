# Generadores de PDF - Template Unificado

Este directorio contiene el sistema unificado para generar PDFs en la aplicación, basado en un template general que maneja elementos comunes como header, logo, pie de página y estructura.

## 🏗️ Arquitectura

### Template Principal (`pdf-template.ts`)
El `PDFTemplate` es la clase base que maneja:
- **Header automático** con logo de la organización
- **Títulos y subtítulos** configurables
- **Fechas de generación** o rangos de fechas
- **Pie de página** con información de la organización y numeración
- **Gestión de páginas** automática
- **Secciones modulares** con verificación de espacio

### Estructura de Archivos
```
src/lib/pdf-generators/
├── pdf-template.ts          # Template principal
├── pdf-lib-utils.ts         # Utilidades básicas de PDF
├── inventory-report-pdf.ts  # Generador de reportes de inventario
├── sales-report-pdf.ts      # Generador de reportes de ventas
└── README.md               # Esta documentación
```

## 🚀 Uso del Template

### 1. Crear un Nuevo Generador de PDF

```typescript
import { PDFTemplate, PDFSection, PDFSectionHelpers, createPDFResponse } from './pdf-template';
import { colors, fontSizes, margins, PDFBuilder } from '@/lib/pdf-lib-utils';

export async function generateMyReportPDF(
  data: MyReportData,
  dateRange?: { from?: Date; to?: Date }
): Promise<Uint8Array> {
  
  // 1. Crear template con configuración
  const template = new PDFTemplate({
    title: 'Mi Reporte',
    subtitle: 'Descripción del reporte', // Opcional
    dateRange, // Opcional
    filename: 'mi-reporte.pdf',
    includeGenerationDate: true, // Por defecto: true
  });

  await template.init();

  // 2. Definir secciones
  const sections: PDFSection[] = [
    {
      title: 'Resumen',
      content: PDFSectionHelpers.createSummarySection({
        'Total Items': data.total,
        'Processed': data.processed,
      }),
    },
    {
      title: 'Detalle',
      content: PDFSectionHelpers.createTableSection(
        ['Columna 1', 'Columna 2'],
        data.items.map(item => [item.name, item.value]),
        { cellHeight: 25 }
      ),
      minSpaceRequired: 200, // Mínimo espacio requerido en la página
    },
  ];

  // 3. Generar PDF
  await template.addSections(sections);
  return template.finalize();
}
```

### 2. Configuración del Template

```typescript
interface PDFTemplateConfig {
  title: string;                    // Título principal (requerido)
  subtitle?: string;                // Subtítulo opcional
  filename?: string;                // Nombre del archivo
  includeGenerationDate?: boolean;  // Incluir fecha de generación
  dateRange?: {                     // Rango de fechas opcional
    from?: Date;
    to?: Date;
  };
}
```

### 3. Tipos de Secciones

```typescript
interface PDFSection {
  title: string;                    // Título de la sección
  content: (pdf, currentY, contentWidth) => Promise<number> | number;
  newPageBefore?: boolean;          // Forzar nueva página antes
  minSpaceRequired?: number;        // Espacio mínimo requerido
}
```

## 🛠️ Helpers Disponibles

### `PDFSectionHelpers.createTableSection()`
```typescript
PDFSectionHelpers.createTableSection(
  headers: string[],
  rows: string[][],
  options: {
    cellHeight?: number;
    fontSize?: number;
    headerColor?: any;
  }
)
```

### `PDFSectionHelpers.createSummarySection()`
```typescript
PDFSectionHelpers.createSummarySection({
  'Concepto 1': 'Valor 1',
  'Concepto 2': 'Valor 2',
})
```

### `PDFSectionHelpers.createTextSection()`
```typescript
PDFSectionHelpers.createTextSection(
  'Texto a mostrar',
  {
    fontSize?: number;
    centered?: boolean;
  }
)
```

## 🎨 Personalización Avanzada

### Contenido Personalizado
```typescript
{
  title: 'Sección Personalizada',
  content: (pdf: PDFBuilder, currentY: number, contentWidth: number) => {
    // Tu código personalizado aquí
    pdf.addText('Texto personalizado', {
      x: margins.normal,
      y: currentY,
      size: fontSizes.normal,
    });
    
    return currentY - 20; // Retornar nueva posición Y
  },
}
```

### Múltiples Páginas
```typescript
{
  title: 'Sección en Nueva Página',
  newPageBefore: true, // Fuerza nueva página
  content: (pdf, currentY, contentWidth) => {
    // Contenido de múltiples páginas
    while (hasMoreData) {
      if (currentY < 100) {
        pdf.addPage();
        currentY = template.getHeight() - margins.normal;
      }
      // Agregar contenido
    }
    return currentY;
  },
}
```

## 🔧 Características Automáticas

### Logo de la Organización
- Se obtiene automáticamente de la sesión del usuario
- Se maneja la descarga desde S3 con URL firmada
- Fallback elegante si no hay logo disponible

### Pie de Página
- Fecha y hora de generación
- Nombre de la organización
- Numeración de páginas automática

### Gestión de Espacio
- Verificación automática de espacio disponible
- Salto de página inteligente
- `minSpaceRequired` para controlar saltos

### Tipografía Consistente
- Tamaños de fuente estandarizados
- Colores corporativos
- Márgenes uniformes

## 📝 Ejemplos Completos

Ver los archivos existentes:
- `inventory-report-pdf.ts` - Reporte complejo con múltiples secciones
- `sales-report-pdf.ts` - Reporte con datos dinámicos

## 🔄 Migración de PDFs Existentes

Para migrar un PDF existente al template:

1. **Reemplazar imports:**
   ```typescript
   // Antes
   import { PDFBuilder } from '@/lib/pdf-lib-utils';
   
   // Después
   import { PDFTemplate, PDFSection, PDFSectionHelpers } from './pdf-template';
   ```

2. **Reemplazar inicialización:**
   ```typescript
   // Antes
   const pdf = await PDFBuilder.create();
   
   // Después
   const template = new PDFTemplate({ title: 'Mi Reporte' });
   await template.init();
   ```

3. **Convertir contenido a secciones:**
   ```typescript
   // Antes
   pdf.addSection('Título');
   pdf.addTable(...);
   
   // Después
   const sections = [{
     title: 'Título',
     content: PDFSectionHelpers.createTableSection(...),
   }];
   ```

4. **Finalizar:**
   ```typescript
   // Antes
   return pdf.finalize();
   
   // Después
   await template.addSections(sections);
   return template.finalize();
   ```

## 🎯 Beneficios

- **Consistencia**: Todos los PDFs tienen el mismo estilo
- **Mantenibilidad**: Cambios en un solo lugar afectan todos los PDFs
- **Reutilización**: Helpers comunes para operaciones frecuentes
- **Escalabilidad**: Fácil agregar nuevos tipos de reportes
- **Robustez**: Manejo automático de errores y fallbacks 