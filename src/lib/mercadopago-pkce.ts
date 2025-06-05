/**
 * PKCE (Proof Key for Code Exchange) implementation for MercadoPago OAuth
 * RFC 7636: https://tools.ietf.org/html/rfc7636
 */

/**
 * Genera un code_verifier aleatorio de longitud entre 43-128 caracteres
 * usando caracteres URL-safe: A-Z, a-z, 0-9, -, ., _, ~
 */
export function generateCodeVerifier(length = 128): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  let result = "";

  // En Node.js/Edge, usar crypto si está disponible
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    // Generar bytes aleatorios y convertir a base64url
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);

    for (let i = 0; i < length; i++) {
      result += charset[array[i] % charset.length];
    }
    return result;
  }

  // Fallback para otros entornos
  for (let i = 0; i < length; i++) {
    result += charset[Math.floor(Math.random() * charset.length)];
  }

  return result;
}

/**
 * Genera un code_challenge a partir del code_verifier usando SHA256
 * y lo codifica en base64url
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  // Codificar el verifier como bytes UTF-8
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);

  // Calcular SHA256 hash
  const digest = await crypto.subtle.digest("SHA-256", data);

  // Convertir a base64url (sin padding)
  const base64 = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return base64;
}

/**
 * Genera un par completo de PKCE (verifier + challenge)
 */
export async function generatePKCEPair() {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: "S256" as const,
  };
}

/**
 * Valida que un code_verifier tenga el formato correcto
 */
export function validateCodeVerifier(codeVerifier: string): boolean {
  // Debe tener entre 43 y 128 caracteres
  if (codeVerifier.length < 43 || codeVerifier.length > 128) {
    return false;
  }

  // Solo debe contener caracteres URL-safe
  const validChars = /^[A-Za-z0-9\-._~]+$/;
  return validChars.test(codeVerifier);
}

/**
 * Construye la URL de autorización OAuth con PKCE
 */
export function buildAuthorizationUrl(params: {
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state?: string;
  scope?: string;
}) {
  const baseUrl = "https://auth.mercadopago.com.ar/authorization";
  const urlParams = new URLSearchParams({
    response_type: "code",
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    code_challenge: params.codeChallenge,
    code_challenge_method: params.codeChallengeMethod,
  });

  if (params.state) {
    urlParams.set("state", params.state);
  }

  if (params.scope) {
    urlParams.set("scope", params.scope);
  }

  return `${baseUrl}?${urlParams.toString()}`;
}

/**
 * Intercambia el código de autorización por tokens usando PKCE
 */
export async function exchangeCodeForTokenWithPKCE(params: {
  clientId: string;
  clientSecret: string;
  code: string;
  redirectUri: string;
  codeVerifier: string;
}) {
  const response = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: params.clientId,
      client_secret: params.clientSecret,
      code: params.code,
      grant_type: "authorization_code",
      redirect_uri: params.redirectUri,
      code_verifier: params.codeVerifier, // ← Este es el parámetro que faltaba!
    }),
  });

  return response;
}
