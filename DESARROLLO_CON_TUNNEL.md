# 🚀 DESARROLLO CON TÚNEL HTTPS

## 📋 **Scripts disponibles:**

### 🔧 **Para desarrollo normal:**
```bash
pnpm dev
```

### 🌐 **Para desarrollo con OAuth (Mercado Pago):**

#### Opción 1: Manual (2 terminales)
```bash
# Terminal 1 - Servidor de desarrollo
pnpm dev

# Terminal 2 - Túnel HTTPS
pnpm run tunnel:mercadopago
```

#### Opción 2: Con ayuda visual
```bash
# Muestra instrucciones y ejecuta dev
pnpm run dev:tunnel
```

#### Opción 3: Solo túnel
```bash
# Solo el túnel SSH
pnpm run tunnel
```

## 🔄 **Flujo de trabajo para OAuth:**

### 1. **Iniciar túnel:**
```bash
pnpm run tunnel:mercadopago
```
**Salida esperada:**
```
🚀 Iniciando túnel HTTPS para Mercado Pago OAuth...
🔗 Tu URL HTTPS aparecerá abajo:
===============================================================================
Welcome to localhost.run!
...
** your connection id is abc123... **
8de3c0b45f10af.lhr.life tunneled with tls termination, https://8de3c0b45f10af.lhr.life
```

### 2. **Copiar URL HTTPS:**
Ejemplo: `https://8de3c0b45f10af.lhr.life`

### 3. **Actualizar .env.local:**
```bash
BASE_URL=https://8de3c0b45f10af.lhr.life
NEXT_PUBLIC_APP_URL=https://8de3c0b45f10af.lhr.life
```

### 4. **Configurar en Mercado Pago:**
```
Redirect URI: https://8de3c0b45f10af.lhr.life/api/configuration/mercadopago/callback
```

### 5. **Iniciar servidor (otra terminal):**
```bash
pnpm dev
```

### 6. **Acceder via HTTPS:**
- ❌ NO uses: `http://localhost:3000`
- ✅ SÍ usa: `https://8de3c0b45f10af.lhr.life`

## 🎯 **Tips importantes:**

### ⚡ **Automatización:**
- El script `tunnel:mercadopago` ya incluye mensajes informativos
- El script `dev:tunnel` te muestra las instrucciones paso a paso

### 🔄 **Reiniciar túnel:**
Si cambia la URL, simplemente:
1. Para el túnel (Ctrl+C)
2. Ejecuta: `pnpm run tunnel:mercadopago`
3. Actualiza la nueva URL en `.env.local`
4. Actualiza la URL en Mercado Pago

### 🐛 **Troubleshooting:**
- **Túnel se desconecta:** Normal con localhost.run gratuito, solo reinicia
- **URL cambia:** Actualiza `.env.local` y Mercado Pago
- **Error SSH:** Verifica conexión a internet

### 📝 **Comandos útiles:**
```bash
# Ver estado actual del .env.local
type .env.local | Select-String -Pattern "lhr.life"

# Matar proceso en puerto 3000 (si está ocupado)
npx kill-port 3000
```

## 🚀 **Ejemplo completo:**

```bash
# Terminal 1
PS C:\tu-proyecto> pnpm run tunnel:mercadopago
🚀 Iniciando túnel HTTPS para Mercado Pago OAuth...
🔗 Tu URL HTTPS aparecerá abajo:
...
8de3c0b45f10af.lhr.life tunneled with tls termination, https://8de3c0b45f10af.lhr.life

# Terminal 2
PS C:\tu-proyecto> pnpm dev
▲ Next.js 15.3.1
- Local:        http://localhost:3000
- Tunnel:       https://8de3c0b45f10af.lhr.life
```

¡Ya tienes automatización completa del túnel! 🎉 