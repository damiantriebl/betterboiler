/**
 * Script para configurar OAuth de Mercado Pago
 * 
 * Este script te ayuda a configurar las credenciales OAuth necesarias
 * para que cada organización pueda conectar su propia cuenta de Mercado Pago.
 * 
 * Pasos para configurar:
 * 1. Ve a https://www.mercadopago.com.ar/developers/panel/applications
 * 2. Crea una nueva aplicación o usa una existente
 * 3. En la sección "Credenciales", copia el Client ID y Client Secret
 * 4. Configura las URLs de redirección en tu aplicación de Mercado Pago:
 *    - Redirect URI: https://tu-dominio.com/api/configuration/mercadopago/callback
 * 5. Agrega las credenciales a tu archivo .env
 */

console.log('🔧 Configuración OAuth de Mercado Pago');
console.log('=====================================');
console.log('');
console.log('Para configurar OAuth de Mercado Pago, necesitas:');
console.log('');
console.log('1. 📱 Crear una aplicación en Mercado Pago:');
console.log('   https://www.mercadopago.com.ar/developers/panel/applications');
console.log('');
console.log('2. 🔑 Obtener las credenciales OAuth:');
console.log('   - Client ID');
console.log('   - Client Secret');
console.log('');
console.log('3. 🌐 Configurar URLs de redirección:');
console.log('   - Redirect URI: https://tu-dominio.com/api/configuration/mercadopago/callback');
console.log('');
console.log('4. 📝 Agregar al archivo .env:');
console.log('   MERCADOPAGO_CLIENT_ID=tu_client_id');
console.log('   MERCADOPAGO_CLIENT_SECRET=tu_client_secret');
console.log('');
console.log('5. 🏢 Cada organización podrá conectar su cuenta desde:');
console.log('   /configuration -> Sección Mercado Pago -> Conectar');
console.log('');
console.log('📋 Características del sistema OAuth:');
console.log('   ✅ Multi-tenant: cada organización tiene su propia cuenta');
console.log('   ✅ Pagos directos: los fondos van a la cuenta de cada organización');
console.log('   ✅ Bricks embebidos: formularios de pago sin redirección');
console.log('   ✅ Tokens seguros: almacenados de forma segura en la base de datos');
console.log('');
console.log('🔒 Seguridad:');
console.log('   - Los tokens de acceso se almacenan encriptados');
console.log('   - Cada organización solo puede acceder a sus propios datos');
console.log('   - Verificación automática de tokens expirados');
console.log('');

// Verificar si las variables de entorno están configuradas
const clientId = process.env.MERCADOPAGO_CLIENT_ID;
const clientSecret = process.env.MERCADOPAGO_CLIENT_SECRET;

if (clientId && clientSecret) {
  console.log('✅ Credenciales OAuth configuradas correctamente');
  console.log(`   Client ID: ${clientId.substring(0, 8)}...`);
  console.log('   Client Secret: [CONFIGURADO]');
} else {
  console.log('❌ Credenciales OAuth no configuradas');
  console.log('   Agrega MERCADOPAGO_CLIENT_ID y MERCADOPAGO_CLIENT_SECRET a tu .env');
}

console.log('');
console.log('🚀 Una vez configurado, las organizaciones podrán:');
console.log('   1. Conectar su cuenta de Mercado Pago via OAuth');
console.log('   2. Recibir pagos directamente en su cuenta');
console.log('   3. Usar formularios embebidos (Bricks) para mejor UX');
console.log('   4. Gestionar múltiples métodos de pago');
console.log(''); 