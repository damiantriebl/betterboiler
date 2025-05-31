# 🌿 Configuración de Branches en Neon DB

## 📋 Resumen

Este proyecto utiliza Neon Database con branches separadas para desarrollo y producción, permitiendo trabajar de forma segura sin afectar los datos de producción.

## 🏗️ Estructura de Branches

### 1. **Branch Principal (Producción)**
- **Nombre**: `main` 
- **Uso**: Datos de producción
- **URL**: `postgresql://user:pass@ep-xxx-main.neon.tech/neondb`

### 2. **Branch de Desarrollo**
- **Nombre**: `development`
- **Uso**: Desarrollo y pruebas
- **URL**: `postgresql://user:pass@ep-xxx-development.neon.tech/neondb`

## 🚀 Configuración Inicial

### Paso 1: Crear Branches en Neon

1. **Accede a tu dashboard de Neon**: https://console.neon.tech
2. **Selecciona tu proyecto**
3. **Ve a la sección "Branches"**
4. **Crea una nueva branch**:
   - Nombre: `development`
   - Basada en: `main` (para copiar estructura y datos)

### Paso 2: Obtener URLs de Conexión

1. **Para cada branch, copia la connection string**:
   - Ve a "Connection Details"
   - Copia la "Connection string"
   - Guarda ambas URLs (main y development)

### Paso 3: Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto:

```bash
# Copia de .env.example
cp .env.example .env.local
```

Edita `.env.local` con tus valores reales:

```env
# Para desarrollo (usar branch development)
DATABASE_URL="postgresql://user:pass@ep-xxx-development.neon.tech/neondb?sslmode=require"

# Otras variables...
BETTER_AUTH_SECRET="tu-secreto-aqui"
# ... resto de configuración
```

## 🔄 Cambio entre Branches

### Método 1: Script Automático (Recomendado)

```bash
# Cambiar a desarrollo
pnpm run db:dev

# Cambiar a producción  
pnpm run db:prod
```

### Método 2: Manual

1. **Edita `.env.local`**
2. **Cambia la `DATABASE_URL`** por la branch correspondiente
3. **Regenera Prisma**: `pnpm prisma generate`

## 📦 Scripts NPM Recomendados

Agrega estos scripts a tu `package.json`:

```json
{
  "scripts": {
    "db:dev": "node scripts/switch-db-branch.js dev",
    "db:prod": "node scripts/switch-db-branch.js prod",
    "db:status": "prisma migrate status",
    "db:deploy": "prisma migrate deploy",
    "db:pull": "prisma db pull",
    "db:reset:dev": "prisma migrate reset --force"
  }
}
```

## 🛠️ Comandos Útiles

### Verificar Estado
```bash
# Ver qué branch estás usando
pnpm run db:status

# Verificar conexión
pnpm run db:pull
```

### Migraciones
```bash
# Crear migración (solo en desarrollo)
pnpm prisma migrate dev --name nueva-feature

# Aplicar migraciones (producción)
pnpm run db:deploy
```

### Reset de Desarrollo
```bash
# Resetear base de datos de desarrollo (⚠️ Borra todos los datos)
pnpm run db:reset:dev
```

## 🔐 Seguridad

### ✅ Buenas Prácticas

1. **Nunca ejecutes migraciones destructivas en producción directamente**
2. **Prueba todas las migraciones en desarrollo primero**
3. **Mantén backups de producción**
4. **Usa variables de entorno separadas para cada ambiente**

### ⚠️ Advertencias

- **No compartas archivos `.env`** en el repositorio
- **Verifica siempre qué branch estás usando** antes de ejecutar comandos
- **Los datos de desarrollo pueden perderse** durante resets

## 🔍 Troubleshooting

### Error: "Database does not exist"
```bash
# Verifica que la URL sea correcta
echo $DATABASE_URL

# Regenera el cliente
pnpm prisma generate
```

### Error: "Migration failed"
```bash
# Verifica estado de migraciones
pnpm run db:status

# Si es desarrollo, puedes resetear
pnpm run db:reset:dev
```

### Verificar Branch Actual
```bash
# Ejecuta una query simple para verificar conexión
pnpm prisma db pull --preview-feature
```

## 📞 Contacto y Soporte

- **Documentación Neon**: https://neon.tech/docs
- **Documentación Prisma**: https://www.prisma.io/docs 