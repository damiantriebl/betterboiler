# ⚠️ HTTPS para Callbacks de MercadoPago OAuth

**PROBLEMA**: MercadoPago requiere HTTPS para los callbacks OAuth, pero en desarrollo local solo tenemos HTTP.

## 🚀 **OPCIÓN 1: localhost.run (Recomendada)**

### Ventajas:
- ✅ **Gratis** y sin registro
- ✅ **Rápido** de configurar (1 comando)
- ✅ **Estable** para desarrollo
- ✅ **HTTPS automático**

### Usar localhost.run:
```bash
# Un solo comando para túnel HTTPS:
ssh -R 80:localhost:3000 ssh.localhost.run
```

Esto te dará una URL como:
```
Your URL: https://abc123.localhost.run
```

**Configurar en MercadoPago:**
- Redirect URI: https://abc123.localhost.run/api/configuration/mercadopago/callback

**Configurar en .env.local:**
```bash
BASE_URL=https://abc123.localhost.run
NEXT_PUBLIC_APP_URL=https://abc123.localhost.run
```

## 🔧 **OPCIÓN 2: HTTPS Local**

### Configurar certificado local:
```bash
# Instalar mkcert
choco install mkcert

# Crear certificados
mkcert -install
mkcert localhost 127.0.0.1 ::1

# Configurar Next.js con HTTPS
# (requiere configuración adicional en next.config.js)
```

## 🏗️ **OPCIÓN 3: Usar Dominio de Producción**

### Si tienes dominio configurado:
```bash
# Variables de entorno apuntando a producción
BASE_URL=https://tu-app.vercel.app
NEXT_PUBLIC_APP_URL=https://tu-app.vercel.app
```

**⚠️ ADVERTENCIA**: Solo usar para testing específico, no para desarrollo diario.

## 📝 **Configuración Rápida con localhost.run**

### 1. Instalar dependencias:
- Solo necesitas SSH (viene con Git/Windows)

### 2. Crear túnel HTTPS:
```bash
ssh -R 80:localhost:3000 ssh.localhost.run
```

### 3. Copiar la URL HTTPS que te da localhost.run
Ejemplo: `https://1a2b-3c4d-5e6f.localhost.run`

### 4. Configurar en MercadoPago:
- Ve a tu aplicación en MercadoPago
- Redirect URI: https://1a2b-3c4d-5e6f.localhost.run/api/configuration/mercadopago/callback

### 5. Actualizar .env.local:
```bash
BASE_URL=https://1a2b-3c4d-5e6f.localhost.run
NEXT_PUBLIC_APP_URL=https://1a2b-3c4d-5e6f.localhost.run
```

### 6. Workflow de desarrollo:
1. **Terminal 1:** `pnpm run dev` (servidor local)
2. **Terminal 2:** `ssh -R 80:localhost:3000 ssh.localhost.run` (túnel HTTPS)
3. **MercadoPago:** Configurar redirect URI con URL de localhost.run
4. **Acceder** via URL de localhost.run para testing OAuth

¡Con localhost.run tendrás HTTPS funcionando en 2 minutos! 🚀 