"use client";

import React, { useEffect, useState, useActionState, useRef, startTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';
import { Skeleton } from "@/components/ui/skeleton";
import {
    getSecuritySettings,
    toggleSecureMode,
    verifyOtpSetup,
    type SecuritySettings as SecuritySettingsData,
    type ToggleSecureModeResult,
    type VerifyOtpSetupResult
} from "@/actions/configuration/security-actions";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const initialToggleState: ToggleSecureModeResult = { success: false };
const initialVerifyState: VerifyOtpSetupResult = { success: false };

export default function SecuritySettings() {
    const { toast } = useToast();
    const [settings, setSettings] = useState<SecuritySettingsData | null>(null);
    const [isLoadingSettings, setIsLoadingSettings] = useState(true);
    const [otpToken, setOtpToken] = useState("");
    const otpInputRef = useRef<HTMLInputElement>(null);

    // Action state for toggling secure mode
    const [toggleState, toggleAction, isToggling] = useActionState(
        async (prevState: ToggleSecureModeResult, isEnabled: boolean): Promise<ToggleSecureModeResult> => {
            const result = await toggleSecureMode(isEnabled);
            return result;
        },
        initialToggleState
    );

    // Action state for verifying OTP
    const [verifyState, verifyAction, isVerifying] = useActionState(
        async (prevState: VerifyOtpSetupResult, token: number): Promise<VerifyOtpSetupResult> => {
            console.log("[Frontend Diagnóstico] verifyAction recibido token:", token, typeof token);
            const result = await verifyOtpSetup(token);
            return result;
        },
        initialVerifyState
    );

    // Fetch initial settings
    useEffect(() => {
        async function fetchSettings() {
            setIsLoadingSettings(true);
            const currentSettings = await getSecuritySettings();
            if (currentSettings.error) {
                toast({ variant: "destructive", title: "Error", description: currentSettings.error });
            }
            setSettings(currentSettings);
            setIsLoadingSettings(false);
        }
        fetchSettings();
    }, [toast]);

    // Effect for toggleSecureMode action result
    useEffect(() => {
        if (toggleState.success && toggleState.message) {
            toast({ title: "Éxito", description: toggleState.message });

            setSettings(prev => {
                console.log("[Frontend Diagnóstico] toggleState recibido:", JSON.stringify(toggleState));
                console.log("[Frontend Diagnóstico] prev?.otpAuthUrl antes de actualizar:", prev?.otpAuthUrl);
                console.log("[Frontend Diagnóstico] toggleState.otpAuthUrl que se usará:", toggleState.otpAuthUrl);

                const newSecureModeEnabled = prev ? !prev.secureModeEnabled : true;
                const newOtpVerified = toggleState.otpVerified ?? prev?.otpVerified ?? false;
                const newOtpAuthUrl = toggleState.otpAuthUrl ?? prev?.otpAuthUrl ?? null;

                console.log("[Frontend Diagnóstico] newOtpAuthUrl calculado para setSettings:", newOtpAuthUrl);

                return {
                    ...(prev ?? { error: undefined }),
                    secureModeEnabled: newSecureModeEnabled,
                    otpVerified: newOtpVerified,
                    otpAuthUrl: newOtpAuthUrl,
                };
            });
        } else if (!toggleState.success && toggleState.error) {
            toast({ variant: "destructive", title: "Error al cambiar modo seguro", description: toggleState.error });
            setSettings(prev => prev ? { ...prev, secureModeEnabled: !prev.secureModeEnabled } : null);
        }
    }, [toggleState, toast]);

    // Effect for verifyOtpSetup action result
    useEffect(() => {
        if (verifyState.success && verifyState.message) {
            toast({ title: "Éxito", description: verifyState.message });
            setSettings(prev => prev ? { ...prev, otpVerified: true, otpAuthUrl: null } : null); // OTP verificado, no necesitamos más la URL
            setOtpToken("");
        } else if (!verifyState.success && verifyState.error) {
            toast({ variant: "destructive", title: "Error al verificar OTP", description: verifyState.error });
        }
    }, [verifyState, toast]);

    const handleToggleSecureMode = (checked: boolean) => {
        startTransition(() => {
            toggleAction(checked);
        });
    };

    const handleVerifyOtp = () => {
        if (otpToken.length === 6) {
            startTransition(() => {
                verifyAction(Number.parseInt(otpToken, 10));
            });
        }
    };

    if (isLoadingSettings || !settings) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-8 w-1/4" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Modo Seguro y Autenticación de Dos Factores (OTP)</CardTitle>
                <CardDescription>
                    El Modo Seguro añade una capa extra de protección. Al activarlo, ciertas operaciones críticas,
                    como la eliminación de datos sensibles, requerirán una confirmación adicional mediante un
                    código de un solo uso (OTP) generado por una aplicación de autenticación (ej. Google Authenticator).
                    Esto asegura que solo usuarios autorizados con acceso al dispositivo de autenticación puedan realizar estas acciones.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center space-x-2">
                    <Switch
                        id="secure-mode-switch"
                        checked={settings.secureModeEnabled}
                        onCheckedChange={handleToggleSecureMode}
                        disabled={isToggling}
                        aria-label={`Activar modo seguro: ${settings.secureModeEnabled ? 'Activado' : 'Desactivado'}`}
                    />
                    <Label htmlFor="secure-mode-switch" className="text-lg">
                        {isToggling ? <Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> : null}
                        Modo Seguro {settings.secureModeEnabled ? "Activado" : "Desactivado"}
                    </Label>
                </div>

                {settings.secureModeEnabled && (
                    <Card className="mt-4">
                        <CardHeader>
                            <CardTitle>Configuración de OTP</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {!settings.otpVerified ? (
                                <>
                                    <p>
                                        Escanee el siguiente código QR con su aplicación de autenticación...
                                    </p>
                                    {settings.otpAuthUrl ? (
                                        <div className="p-4 bg-white inline-block rounded-lg">
                                            <QRCodeSVG value={settings.otpAuthUrl} size={224} level="H" includeMargin={true} />
                                        </div>
                                    ) : (
                                        <p className="text-orange-600">
                                            {isToggling ? 'Generando QR...' : 'No se pudo generar la URL para el QR. Intente desactivar y reactivar el Modo Seguro.'}
                                        </p>
                                    )}
                                    <div>
                                        <Label htmlFor="otp-token">Ingrese el código de 6 dígitos</Label>
                                        <div className="flex items-center space-x-2 mt-1">
                                            <Input
                                                ref={otpInputRef}
                                                id="otp-token"
                                                type="text"
                                                maxLength={6}
                                                value={otpToken}
                                                onChange={(e) => setOtpToken(e.target.value.replace(/\D/g, ''))}
                                                className="w-32 tracking-widest text-center"
                                                placeholder="123456"
                                                disabled={isVerifying || !settings.otpAuthUrl}
                                            />
                                            <Button onClick={handleVerifyOtp} disabled={isVerifying || otpToken.length !== 6 || !settings.otpAuthUrl}>
                                                {isVerifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Verificar OTP
                                            </Button>
                                        </div>
                                        {verifyState.error && <p className="text-sm text-destructive mt-1">{verifyState.error}</p>}
                                    </div>
                                </>
                            ) : (
                                <p className="text-green-600 font-semibold">
                                    ¡Autenticación de Dos Factores (OTP) configurada y verificada correctamente!
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}
            </CardContent>
            {settings.error && (
                <CardFooter>
                    <p className="text-sm text-destructive">Error general: {settings.error}</p>
                </CardFooter>
            )}
        </Card>
    );
} 