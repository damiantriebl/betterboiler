# Integración OAuth de Mercado Pago

Este documento explica cómo configurar y usar la integración OAuth de Mercado Pago en el sistema multi-tenant.

## 🎯 Objetivo

Permitir que cada organización conecte su propia cuenta de Mercado Pago para recibir pagos directamente, sin que los fondos pasen por una cuenta intermedia.

## 🏗️ Arquitectura

### Sistema Multi-Tenant
- **Cada organización** tiene su propia configuración OAuth
- **Los pagos van directamente** a la cuenta de Mercado Pago de cada organización
- **Tu aplicación** actúa como facilitador, no como intermediario

### Componentes Principales

1. **Configuración OAuth** (`/configuration`)
   - Permite a cada organización conectar su cuenta
   - Almacena tokens de acceso de forma segura
   - Verifica automáticamente la validez de los tokens

2. **Bricks de Mercado Pago** (Formularios embebidos)
   - Formularios de pago integrados en tu sitio
   - No requiere redirección a Mercado Pago
   - Mejor experiencia de usuario

3. **API de Procesamiento**
   - Procesa pagos usando las credenciales de cada organización
   - Maneja diferentes métodos de pago
   - Gestiona errores y estados de pago

## 🔧 Configuración Inicial

### 1. Crear Aplicación en Mercado Pago

1. Ve a [Panel de Desarrolladores de Mercado Pago](https://www.mercadopago.com.ar/developers/panel/applications)
2. Crea una nueva aplicación o usa una existente
3. Configura los datos básicos de tu aplicación

### 2. Configurar URLs de Redirección

En tu aplicación de Mercado Pago, configura:
- **Redirect URI**: `https://tu-dominio.com/api/configuration/mercadopago/callback`

### 3. Obtener Credenciales OAuth

En la sección "Credenciales" de tu aplicación:
- Copia el **Client ID**
- Copia el **Client Secret**

### 4. Configurar Variables de Entorno

Agrega a tu archivo `.env`:

```env
MERCADOPAGO_CLIENT_ID=tu_client_id_aqui
MERCADOPAGO_CLIENT_SECRET=tu_client_secret_aqui
BASE_URL=https://tu-dominio.com
```

### 5. Ejecutar Migraciones

```bash
npx prisma migrate dev
npx prisma generate
```

## 🚀 Uso del Sistema

### Para Administradores del Sistema

1. Configura las credenciales OAuth en el `.env`
2. Ejecuta el script de verificación:
   ```bash
   node scripts/setup-mercadopago-oauth.js
   ```

### Para Organizaciones

1. Ve a `/configuration`
2. En la sección "Mercado Pago", haz clic en "Conectar"
3. Serás redirigido a Mercado Pago para autorizar la aplicación
4. Una vez autorizado, volverás a la configuración con la cuenta conectada

### Para Ventas

1. En el proceso de venta, selecciona "Mercado Pago" como método de pago
2. Completa los datos del comprador
3. El formulario de pago se cargará automáticamente
4. El cliente puede pagar con tarjeta, efectivo, etc.
5. El pago va directamente a la cuenta de la organización

## 🔒 Seguridad

### Almacenamiento de Tokens
- Los tokens de acceso se almacenan en la base de datos
- Cada organización solo puede acceder a sus propios tokens
- Los tokens se verifican automáticamente antes de cada uso

### Validación de Permisos
- Solo usuarios autorizados pueden conectar cuentas
- Cada organización está aislada de las demás
- Los pagos no pueden ser interceptados

### Manejo de Errores
- Tokens expirados se detectan automáticamente
- Errores de pago se manejan de forma segura
- Logs detallados para debugging

## 📊 Base de Datos

### Tabla `mercadopago_oauth`

```sql
CREATE TABLE mercadopago_oauth (
  id VARCHAR PRIMARY KEY,
  organization_id VARCHAR UNIQUE NOT NULL,
  mercado_pago_user_id VARCHAR NOT NULL,
  access_token VARCHAR NOT NULL,
  refresh_token VARCHAR,
  email VARCHAR NOT NULL,
  public_key VARCHAR,
  scopes VARCHAR[],
  expires_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## 🔄 Flujo de OAuth

### 1. Iniciar Conexión
```
Usuario → /configuration → "Conectar MP" → /api/configuration/mercadopago/connect
```

### 2. Autorización
```
API → Mercado Pago OAuth → Usuario autoriza → Callback
```

### 3. Intercambio de Tokens
```
Callback → Intercambiar código por tokens → Guardar en BD
```

### 4. Verificación
```
Verificar token → Obtener info usuario → Confirmar conexión
```

## 🛠️ API Endpoints

### Configuración
- `POST /api/configuration/mercadopago/connect` - Iniciar OAuth
- `GET /api/configuration/mercadopago/callback` - Callback OAuth
- `GET /api/configuration/mercadopago/status` - Estado de conexión
- `POST /api/configuration/mercadopago/disconnect` - Desconectar

### Pagos
- `GET /api/configuration/mercadopago/organization/[id]` - Config de organización
- `GET /api/payments/mercadopago/methods` - Métodos de pago disponibles
- `POST /api/payments/mercadopago/process` - Procesar pago

## 🧪 Testing

### Modo Sandbox
1. Usa credenciales de sandbox en Mercado Pago
2. Configura `MERCADOPAGO_CLIENT_ID` y `MERCADOPAGO_CLIENT_SECRET` de sandbox
3. Los pagos se procesarán en modo de prueba

### Tarjetas de Prueba
Mercado Pago proporciona tarjetas de prueba para testing:
- **Visa**: 4509 9535 6623 3704
- **Mastercard**: 5031 7557 3453 0604

## 🐛 Troubleshooting

### Error: "Credenciales OAuth no configuradas"
- Verifica que `MERCADOPAGO_CLIENT_ID` y `MERCADOPAGO_CLIENT_SECRET` estén en el `.env`
- Reinicia el servidor después de agregar las variables

### Error: "Token expirado"
- Los tokens se verifican automáticamente
- Si un token expira, la organización debe reconectar su cuenta

### Error: "Mercado Pago no está conectado"
- La organización debe conectar su cuenta desde `/configuration`
- Verifica que el proceso OAuth se completó correctamente

### Error en Bricks: "Public key inválida"
- Verifica que la organización tenga una cuenta conectada
- Revisa que el `publicKey` se esté obteniendo correctamente

## 📈 Monitoreo

### Logs Importantes
- Conexiones OAuth exitosas/fallidas
- Pagos procesados/rechazados
- Tokens expirados
- Errores de API

### Métricas Sugeridas
- Número de organizaciones conectadas
- Volumen de pagos por organización
- Tasa de éxito de pagos
- Tiempo de respuesta de APIs

## 🔄 Mantenimiento

### Renovación de Tokens
- Los tokens de Mercado Pago pueden tener fecha de expiración
- El sistema verifica automáticamente la validez
- Las organizaciones deben reconectar si el token expira

### Actualizaciones de API
- Mercado Pago puede actualizar sus APIs
- Mantén actualizada la documentación oficial
- Prueba regularmente en sandbox

## 📚 Referencias

- [Documentación OAuth de Mercado Pago](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/landing)
- [Panel de Desarrolladores](https://www.mercadopago.com.ar/developers/panel/applications)
- [Bricks de Mercado Pago](https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks)
- [API de Pagos](https://www.mercadopago.com.ar/developers/es/reference/payments/_payments/post) 