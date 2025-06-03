# 🔧 CONFIGURACIÓN MERCADO PAGO OAUTH

## ✅ **ARQUITECTURA CORRECTA:**

### 🌐 **En `.env.local` (TU aplicación principal):**
```bash
# Credenciales de TU aplicación de Mercado Pago
MERCADOPAGO_CLIENT_ID=tu_client_id_de_tu_app
MERCADOPAGO_CLIENT_SECRET=tu_client_secret_de_tu_app
MERCADOPAGO_ACCESS_TOKEN=TEST-tu_access_token_para_pagos_directos  
MERCADOPAGO_PUBLIC_KEY=TEST-tu_public_key_para_pagos_directos
```

### 🏢 **En Base de Datos (por organización que se conecta):**
- `access_token` - Token específico de cada organización (se guarda automáticamente)
- `email` - Email de la cuenta conectada
- `mercado_pago_user_id` - ID del vendedor conectado

## 🔄 **FLUJO OAUTH:**
1. **Organización** hace clic en "Conectar con Mercado Pago"
2. **Se abre** ventana de autorización de Mercado Pago
3. **Organización autoriza** el acceso
4. **Se guarda automáticamente** en la BD el access_token de esa organización

## 📝 **CÓMO OBTENER TUS CREDENCIALES:**

### Tienes ACCESS_TOKEN y PUBLIC_KEY, ahora necesitas CLIENT_ID y CLIENT_SECRET:

1. **Ve a la MISMA aplicación** donde obtuviste ACCESS_TOKEN y PUBLIC_KEY:
   https://www.mercadopago.com.ar/developers/panel/app

2. **En tu aplicación, busca la sección "OAuth"** o "Configuración OAuth"

3. **Ahí encontrarás:**
   - `CLIENT_ID` (también llamado App ID)
   - `CLIENT_SECRET` (también llamado App Secret)

4. **Configura Redirect URI:**
   ```
   http://localhost:3000/api/configuration/mercadopago/callback
   ```

## ⚠️ **EDITAR TU `.env.local`:**

**CAMBIAR ESTO:**
```bash
# ❌ Credenciales de PRODUCCIÓN
MERCADOPAGO_PUBLIC_KEY=APP_USR-0484d251-8331-4fa4-b04d-4d784e779f08
MERCADOPAGO_ACCESS_TOKEN=APP_USR-8619959583573876-050910-bfb7590b68e2898e446c0e2a5193dc5d-818037336
```

**POR ESTO:**
```bash
# ✅ Credenciales correctas para DEVELOPMENT
MERCADOPAGO_CLIENT_ID=tu_client_id_aqui
MERCADOPAGO_CLIENT_SECRET=tu_client_secret_aqui
MERCADOPAGO_ACCESS_TOKEN=TEST-tu_access_token_sandbox
MERCADOPAGO_PUBLIC_KEY=TEST-tu_public_key_sandbox
```

## 🧪 **PARA TESTING:**
- Usa credenciales SANDBOX (`TEST-`) para development
- Usa credenciales PRODUCTION (`APP_USR-`) para producción

¡El botón "Conectar con Mercado Pago" funcionará cuando tengas CLIENT_ID y CLIENT_SECRET configurados! 