# Configuración de Variables de Entorno

## 🔧 Variables Requeridas para Mercado Pago OAuth

Para que funcione la integración OAuth de Mercado Pago, necesitas agregar estas variables a tu archivo `.env`:

```env
# Mercado Pago OAuth Configuration
MERCADOPAGO_CLIENT_ID=tu_client_id_aqui
MERCADOPAGO_CLIENT_SECRET=tu_client_secret_aqui

# Base URL (importante para OAuth callbacks)
BASE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 📋 Pasos para Configurar

### 1. Obtener Credenciales de Mercado Pago

1. Ve a [Panel de Desarrolladores de Mercado Pago](https://www.mercadopago.com.ar/developers/panel/applications)
2. Crea una nueva aplicación o selecciona una existente
3. En la sección "Credenciales", copia:
   - **Client ID**
   - **Client Secret**

### 2. Configurar URLs de Redirección

En tu aplicación de Mercado Pago, configura:
- **Redirect URI**: `https://tu-dominio.com/api/configuration/mercadopago/callback`
- Para desarrollo local: `http://localhost:3000/api/configuration/mercadopago/callback`

### 3. Agregar al .env

Agrega las credenciales a tu archivo `.env` local:

```env
MERCADOPAGO_CLIENT_ID=APP_USR_1234567890abcdef
MERCADOPAGO_CLIENT_SECRET=abcdef1234567890abcdef1234567890
BASE_URL=http://localhost:3000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4. Reiniciar el Servidor

Después de agregar las variables:

```bash
# Detener el servidor (Ctrl+C)
# Luego reiniciar
pnpm dev
```

## 🧪 Verificar Configuración

1. Ve a `/configuration` en tu aplicación
2. Haz clic en la pestaña "MercadoPago"
3. En el componente de prueba, haz clic en "1. Test Credenciales"
4. Si ves "✅ Credenciales OAuth configuradas correctamente", estás listo
5. Haz clic en "2. Abrir Mercado Pago" para probar el flujo OAuth

## 🚨 Problemas Comunes

### Error: "Credenciales OAuth no configuradas"
- Verifica que las variables estén en el `.env`
- Asegúrate de reiniciar el servidor después de agregar las variables
- Verifica que no haya espacios extra en las variables

### Error: "Token exchange failed"
- Verifica que la Redirect URI esté configurada correctamente en Mercado Pago
- Asegúrate de que `BASE_URL` coincida con tu dominio

### Error: "Cannot read properties of undefined (reading 'findUnique')"
- Este error indica que Prisma no reconoce el modelo `MercadoPagoOAuth`
- Ejecuta: `npx prisma db push` o `npx prisma generate`
- Reinicia el servidor

## 🔒 Seguridad

- **NUNCA** compartas tus credenciales de producción
- Usa diferentes credenciales para desarrollo y producción
- Considera usar variables de entorno específicas del entorno en producción

## 📚 Referencias

- [Documentación OAuth de Mercado Pago](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/landing)
- [Panel de Desarrolladores](https://www.mercadopago.com.ar/developers/panel/applications) 