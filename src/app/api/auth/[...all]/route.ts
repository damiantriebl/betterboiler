import { auth } from "@/auth";
import { toNextJsHandler } from "better-auth/next-js";

const handler = toNextJsHandler(auth);

export const GET = (request: Request) => {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const searchParams = url.searchParams.toString();
  const timestamp = new Date().toISOString();

  console.log(`🔍 [AUTH API] ${timestamp} GET Request:`, {
    pathname,
    searchParams,
    headers: {
      "user-agent": request.headers.get("user-agent"),
      referer: request.headers.get("referer"),
      cookie: request.headers.get("cookie") ? "present" : "absent",
    },
  });

  if (pathname.includes("get-session")) {
    console.log(`🔄 [GET-SESSION] ${timestamp} Called from:`, request.headers.get("referer"));
    console.log("🍪 [GET-SESSION] Cookies:", request.headers.get("cookie") ? "present" : "absent");

    const cookieHeader = request.headers.get("cookie") || "";
    if (cookieHeader) {
      const relevantCookies = cookieHeader
        .split(";")
        .filter(
          (cookie) =>
            cookie.includes("auth") || cookie.includes("session") || cookie.includes("better"),
        )
        .map((cookie) => cookie.trim().split("=")[0]);
      console.log(`🍪 [GET-SESSION] Cookies relevantes: ${relevantCookies.join(", ")}`);
    }
  }

  // Llamar al handler y capturar posibles errores
  try {
    const result = handler.GET(request);
    console.log(`✅ [AUTH API] Handler ejecutado exitosamente para: ${pathname}`);
    return result;
  } catch (error) {
    console.error(`🚨 [AUTH API] Error en handler para ${pathname}:`, error);
    throw error;
  }
};

export const POST = (request: Request) => {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const timestamp = new Date().toISOString();

  console.log(`📝 [AUTH API] ${timestamp} POST Request:`, {
    pathname,
    headers: {
      "user-agent": request.headers.get("user-agent"),
      referer: request.headers.get("referer"),
      "content-type": request.headers.get("content-type"),
      cookie: request.headers.get("cookie") ? "present" : "absent",
    },
  });

  // Logging específico para sign-out
  if (pathname.includes("sign-out")) {
    console.log("🚪 [SIGN-OUT] Attempting sign out:", {
      cookies: request.headers.get("cookie") ? "present" : "absent",
      contentType: request.headers.get("content-type"),
      referer: request.headers.get("referer"),
    });
  }

  try {
    const result = handler.POST(request);
    console.log(`✅ [AUTH API] POST Handler ejecutado exitosamente para: ${pathname}`);
    return result;
  } catch (error) {
    console.error(`🚨 [AUTH API] Error en POST handler para ${pathname}:`, error);
    throw error;
  }
};
