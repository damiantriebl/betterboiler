# Agregar Marcas y Modelos Rápidamente

## 🚀 Funcionalidad de Agregar Rápido

Esta funcionalidad permite agregar marcas y modelos específicos para motos únicas o descontinuadas sin afectar el catálogo global de la organización.

## 🎯 Casos de uso

- **Motos antiguas/vintage**: Marcas y modelos que ya no se fabrican
- **Motos únicas**: Modelos específicos que no se van a volver a traer
- **Marcas locales**: Marcas que solo maneja tu organización
- **Modelos personalizados**: Variantes específicas con años o características únicas

## 🔧 Cómo usar

### En el formulario de nueva moto:

1. **Busca marca/modelo**: Usa el combobox normal para buscar
2. **No encuentras lo que buscas**: Haz clic en el botón ⚡ amarillo
3. **Agregar inteligente (RECOMENDADO)**:
   - Usa la pestaña "Marca + Modelo" (por defecto)
   - Escribe la marca: ej: "HO" → Aparecerá "Honda" si existe globalmente
   - Escribe el modelo: ej: "CB" → Aparecerán modelos Honda existentes
   - Si no existe, simplemente escribe el nombre completo
   - Haz clic en "Agregar Marca y Modelo"

### Pestañas individuales (control granular):

4. **Agregar marca nueva**:
   - Ve a la pestaña "Nueva Marca"
   - Ingresa el nombre (ej: "Honda Vintage", "Yamaha Clásica")
   - Selecciona un color de identificación
   - Haz clic en "Crear Marca"
5. **Agregar modelo nuevo**:
   - Ve a la pestaña "Nuevo Modelo"
   - Selecciona una marca existente
   - Ingresa el nombre del modelo (ej: "CB 400F 1975", "XTZ 250 2010")
   - Haz clic en "Crear Modelo"

## 🧠 Funcionalidad Inteligente

### Autocompletado Global
- **Marcas**: Escribe 2+ caracteres y aparecerán sugerencias del catálogo global
- **Modelos**: Una vez seleccionada la marca, escribe 1+ carácter para ver modelos
- **Indicadores visuales**: 
  - ✅ Verde cuando se selecciona una marca existente
  - 🔵 "Global" indica que viene del catálogo mundial

### Creación Automática
- Si la marca existe globalmente → Se asocia a tu organización
- Si la marca NO existe → Se crea nueva en el catálogo global y se asocia
- Si el modelo existe para esa marca → Se asocia a tu organización  
- Si el modelo NO existe → Se crea nuevo y se asocia

### Ejemplos prácticos:
```
Escenario 1: Honda CB 400F 1975
- Escribes "HO" → Aparece "Honda" (existe globalmente)
- Seleccionas Honda → Se asocia a tu organización
- Escribes "CB 4" → Aparecen modelos Honda existentes
- No encuentras "CB 400F 1975" → Lo escribes completo
- Se crea el modelo nuevo "CB 400F 1975" para Honda

Escenario 2: Marca Local Nueva  
- Escribes "Motomel Custom" → No existe globalmente
- Escribes "MX 200 Especial" como modelo
- Se crea la marca "Motomel Custom" y el modelo "MX 200 Especial"
```

## 🔍 Diferencias con el catálogo global

| Catálogo Global | Agregar Rápido |
|-----------------|----------------|
| Disponible para todas las organizaciones | Solo para tu organización |
| Requiere configuración en `/configuration` | Inmediato desde el formulario |
| Gestión completa de modelos | Agregar rápido según necesidad |
| Para marcas/modelos recurrentes | Para casos únicos/esporádicos |
| Sin autocompletado | Con autocompletado inteligente |

## 💡 Tips

- **Usa autocompletado**: Empieza con pocas letras para ver sugerencias
- **Nombra específicamente**: "Honda CB 600F 2005" mejor que solo "CB 600F"
- **Incluye año**: Ayuda a identificar la versión exacta
- **Aprovecha marcas existentes**: Si escribes "YA" y aparece "Yamaha", úsala
- **Modo rápido**: La pestaña "Marca + Modelo" es el flujo más eficiente

## 🔄 Actualización automática

Después de agregar una marca o modelo, la lista se actualiza automáticamente y puedes seleccionar inmediatamente la nueva opción en el combobox principal.

## ⚙️ Implementación técnica

- **Server Actions**: `src/actions/stock/quick-brand-model.ts`
  - `searchGlobalBrands()`: Busca marcas en catálogo global
  - `searchGlobalModels()`: Busca modelos para una marca
  - `createQuickBrandAndModel()`: Crea marca+modelo inteligentemente
- **Componentes UI**: 
  - `src/components/custom/QuickBrandModelDialog.tsx`: Modal principal
  - `src/components/custom/AutocompleteBrandModel.tsx`: Autocompletado inteligente
  - `src/components/custom/BrandModelComboboxEnhanced.tsx`: Combobox mejorado
- **Dependencias**: `use-debounce` para búsqueda eficiente
- **Integración**: Automática en formularios de stock que usen el combobox mejorado

## 🎯 Flujo de trabajo recomendado

1. **Primero**: Prueba buscar en el combobox principal
2. **Si no existe**: Haz clic en ⚡ (agregar rápido)
3. **Usa autocompletado**: Pestaña "Marca + Modelo" por defecto
4. **Escribe parcialmente**: "HO" → Honda, "YA" → Yamaha
5. **Completa el modelo**: Usa sugerencias o escribe completo
6. **Confirma**: Se crea automáticamente y queda disponible 