"use client";

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';

export default function OAuthCallback() {
    const searchParams = useSearchParams();

    useEffect(() => {
        const mpSuccess = searchParams.get('mp_success');
        const mpError = searchParams.get('mp_error');
        const detail = searchParams.get('detail');

        if (mpSuccess === 'true') {
            toast.success('🎉 OAuth Exitoso', {
                description: 'MercadoPago conectado exitosamente. Configuración actualizada.',
                duration: 5000,
            });

            // Si estamos en una ventana popup (OAuth), cerrarla
            if (window.opener && window.opener !== window) {
                setTimeout(() => {
                    window.opener.postMessage({ type: 'mp_oauth_success' }, window.location.origin);
                    window.close();
                }, 2000);
            }
        }

        if (mpError) {
            const errorMessages: Record<string, string> = {
                'token_exchange_failed': '❌ Error intercambiando token. El código OAuth puede haber expirado o ya fue usado.',
                'no_code_received': '❌ No se recibió código OAuth. El flujo fue cancelado o interrumpido.',
                'no_session_or_organization': '❌ Sesión perdida. Por favor, inicia sesión nuevamente y vuelve a intentar.',
                'callback_error': '❌ Error en el callback. Revisa la configuración del sistema.',
                'access_denied': '❌ Acceso denegado. Debes autorizar la aplicación en MercadoPago.',
                'invalid_client': '❌ CLIENT_ID inválido. Verifica la configuración en MercadoPago.',
                'invalid_grant': '❌ Grant inválido. El código de autorización puede haber expirado.',
            };

            const errorMessage = errorMessages[mpError] || `❌ Error OAuth: ${mpError}`;
            const fullMessage = detail ? `${errorMessage}\n\nDetalle: ${decodeURIComponent(detail)}` : errorMessage;

            toast.error('Error OAuth MercadoPago', {
                description: fullMessage,
                duration: 10000,
            });

            // Si estamos en una ventana popup, cerrarla después de mostrar el error
            if (window.opener && window.opener !== window) {
                setTimeout(() => {
                    window.opener.postMessage({
                        type: 'mp_oauth_error',
                        error: mpError,
                        detail: detail
                    }, window.location.origin);
                    window.close();
                }, 3000);
            }
        }
    }, [searchParams]);

    return null; // Este componente no renderiza nada visible
} 