"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle, Search, XCircle } from "lucide-react";
import { useState } from "react";

export default function DebugUserPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const searchUser = async () => {
    if (!email) {
      setError("Por favor ingresa un email");
      return;
    }

    setLoading(true);
    setError(null);
    setUserInfo(null);

    try {
      const response = await fetch("/api/debug/user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setUserInfo(data);
      } else {
        setError(data.error || "Error buscando usuario");
      }
    } catch (error) {
      setError(`Error de red: ${error instanceof Error ? error.message : "Error desconocido"}`);
    } finally {
      setLoading(false);
    }
  };

  const verifyUser = async () => {
    if (!userInfo?.user?.id) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/debug/verify-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: userInfo.user.id }),
      });

      const data = await response.json();

      if (response.ok) {
        setUserInfo({ ...userInfo, verified: true });
        alert("Usuario verificado exitosamente");
      } else {
        setError(data.error || "Error verificando usuario");
      }
    } catch (error) {
      setError(
        `Error verificando usuario: ${error instanceof Error ? error.message : "Error desconocido"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    if (!userInfo?.user?.email) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/debug/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: userInfo.user.email }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Email de reset enviado (revisa la consola para ver el link)");
      } else {
        setError(data.error || "Error enviando reset");
      }
    } catch (error) {
      setError(
        `Error enviando reset: ${error instanceof Error ? error.message : "Error desconocido"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const clearSessions = async () => {
    if (!userInfo?.user?.email) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/debug/clear-sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: userInfo.user.email }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ ${data.message}`);
        // Refrescar información del usuario
        await searchUser();
      } else {
        setError(data.error || "Error limpiando sesiones");
      }
    } catch (error) {
      setError(
        `Error limpiando sesiones: ${error instanceof Error ? error.message : "Error desconocido"}`,
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>🔍 Debug Usuario - Diagnóstico de Autenticación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email del usuario</Label>
            <div className="flex gap-2">
              <Input
                id="email"
                type="email"
                placeholder="usuario@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
              <Button onClick={searchUser} disabled={loading}>
                {loading ? "Buscando..." : <Search className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {userInfo && (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Información del Usuario</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">ID:</span> {userInfo.user.id}
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> {userInfo.user.email}
                    </div>
                    <div>
                      <span className="font-medium">Nombre:</span> {userInfo.user.name}
                    </div>
                    <div>
                      <span className="font-medium">Rol:</span> {userInfo.user.role}
                    </div>
                    <div>
                      <span className="font-medium">Organización:</span>{" "}
                      {userInfo.user.organizationId || "Sin organización"}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Email Verificado:</span>
                      {userInfo.user.emailVerified ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                      <span>{userInfo.user.emailVerified ? "SÍ" : "NO"}</span>
                    </div>
                  </div>

                  <div className="border-t pt-3">
                    <span className="font-medium">Estado de Autenticación:</span>
                    <div className="text-sm text-muted-foreground mt-1">
                      {userInfo.user.emailVerified ? (
                        <span className="text-green-600">✅ Usuario puede autenticarse</span>
                      ) : (
                        <span className="text-red-600">
                          ❌ Email no verificado - no puede autenticarse
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {!userInfo.user.emailVerified && (
                      <Button onClick={verifyUser} variant="default" size="sm">
                        ✅ Verificar Email (Forzar)
                      </Button>
                    )}
                    <Button onClick={resetPassword} variant="outline" size="sm">
                      🔄 Enviar Reset Password
                    </Button>
                    <Button onClick={clearSessions} variant="destructive" size="sm">
                      🧹 Limpiar Sesiones
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {userInfo.accounts && userInfo.accounts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Cuentas Vinculadas</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userInfo.accounts.map((account: any, accountIndex: number) => (
                      <div
                        key={`account-${accountIndex}-${account.providerId || accountIndex}`}
                        className="text-sm"
                      >
                        <span className="font-medium">Proveedor:</span> {account.providerId}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Alert>
                <AlertDescription>
                  <div className="font-medium mb-2">💡 Soluciones Rápidas:</div>
                  <ul className="text-sm space-y-1">
                    <li>
                      • Si el email no está verificado, haz clic en "Verificar Email (Forzar)"
                    </li>
                    <li>• Si olvidaste la contraseña, haz clic en "Enviar Reset Password"</li>
                    <li>• Si tienes problemas de sesión, haz clic en "Limpiar Sesiones"</li>
                    <li>• Revisa la consola del navegador para ver links de verificación</li>
                    <li>• Después de limpiar sesiones, intenta hacer login nuevamente</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}

          <div className="bg-yellow-50 p-3 rounded text-sm">
            <div className="font-medium mb-2">⚠️ Nota de Seguridad:</div>
            <p className="text-xs text-muted-foreground">
              Esta página es solo para desarrollo/debugging. No debe estar disponible en producción.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
