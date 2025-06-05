# 🏭 CONFIGURACIÓN SOLO PRODUCCIÓN - MERCADOPAGO

## 🎯 OBJETIVO: Eliminar todos los tokens de testing y usar solo producción

### 📝 **PASO 1: Crear/Actualizar `.env.local`**

Crea o actualiza el archivo `.env.local` en la raíz del proyecto con este contenido:

```env
# 🏭 CONFIGURACIÓN SOLO PRODUCCIÓN - MERCADOPAGO
# ============================================

# 🔑 CREDENCIALES DE PRODUCCIÓN MERCADOPAGO (REEMPLAZA CON TUS CREDENCIALES REALES)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-8619959583573876-050910-bfb7590b68e2898e446c0e2a5193dc5d-818037336
MERCADOPAGO_PUBLIC_KEY=APP_USR-0484d251-8331-4fa4-b04d-4d784e779f08

# 🔧 CONFIGURACIÓN OAUTH (OPCIONAL - PARA QUE ORGANIZACIONES SE CONECTEN)
# Si quieres que cada organización pueda conectar su propia cuenta, agrega estas:
# MERCADOPAGO_CLIENT_ID=tu_client_id_aqui
# MERCADOPAGO_CLIENT_SECRET=tu_client_secret_aqui

# 🌐 URLs BASE PARA CALLBACKS Y WEBHOOKS
BASE_URL=http://localhost:3002
NEXT_PUBLIC_APP_URL=http://localhost:3002

# 🔍 DEBUG (OPCIONAL)
DEBUG_KEY=DEBUG_KEY

# ⚠️ IMPORTANTE:
# 1. Estas credenciales SON DE PRODUCCIÓN - procesan pagos reales
# 2. NUNCA subas este archivo a Git (está en .gitignore)  
# 3. Point API SOLO funciona con credenciales de producción
# 4. Los pagos con tarjeta real requieren datos reales del comprador
```

### 🧹 **PASO 2: Limpiar credenciales de testing de la base de datos**

1. Ve a: **http://localhost:3002/debug/production-only**
2. Haz clic en **"Limpiar Credenciales de Testing"**
3. Esto eliminará todas las configuraciones OAuth que usen tokens TEST-

### 🔧 **PASO 3: Verificar configuración**

1. Ve a: **http://localhost:3002/debug/mercadopago-fix**
2. Verifica que:
   - ✅ Access Token: **PRODUCCIÓN** (APP_USR-)
   - ✅ Public Key: **PRODUCCIÓN** (APP_USR-)
   - ✅ Environment: **PRODUCTION**

### 🚀 **PASO 4: Probar pagos**

1. Ve a cualquier venta y selecciona **MercadoPago**
2. Usa datos **reales** del comprador:
   - Email real
   - Nombre y apellido reales
   - DNI real
   - Tarjeta real con fondos

### ⚡ **BENEFICIOS INMEDIATOS:**

- ✅ **Point API funcionará** (solo con producción)
- ✅ **Pagos con tarjeta real aprobados** (sin rechazos por tokens test)
- ✅ **Mejores tasas de aprobación** (datos reales vs fake)
- ✅ **Funcionalidad completa** de MercadoPago

### 🚨 **PRECAUCIONES:**

- **LOS PAGOS SON REALES** - Se cobrarán a las tarjetas
- **USA MONTOS PEQUEÑOS** para testing ($1, $10)
- **DATOS REALES REQUERIDOS** - No uses placeholders
- **WEBHOOKS FUNCIONARÁN** - Los pagos se registrarán en tu sistema

### 🔍 **COMANDOS ÚTILES:**

```bash
# Reiniciar servidor después de cambiar .env.local
pnpm dev

# Verificar variables de entorno (opcional)
node -e "console.log(process.env.MERCADOPAGO_ACCESS_TOKEN)"
```

### 🛡️ **SEGURIDAD:**

- ✅ `.env.local` está en `.gitignore`
- ✅ Nunca hardcodees credenciales en el código
- ✅ Las credenciales se leen desde variables de entorno
- ✅ Los tokens de producción tienen permisos limitados

---

## 📋 **CHECKLIST FINAL:**

- [ ] `.env.local` creado con credenciales APP_USR-
- [ ] Servidor reiniciado (`pnpm dev`)
- [ ] Credenciales de testing eliminadas (`/debug/production-only`)
- [ ] Verificación pasada (`/debug/mercadopago-fix`)
- [ ] Pago de prueba exitoso con datos reales

**🎉 ¡Una vez completado, tendrás MercadoPago funcionando al 100% en producción!** 