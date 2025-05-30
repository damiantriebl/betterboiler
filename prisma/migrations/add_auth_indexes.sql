-- Índices para optimizar las queries de autenticación

-- Índice para Session.findFirst (búsqueda por token)
CREATE INDEX IF NOT EXISTS idx_session_token ON "session" ("token");
CREATE INDEX IF NOT EXISTS idx_session_expires_at ON "session" ("expiresAt");
CREATE INDEX IF NOT EXISTS idx_session_user_id ON "session" ("userId");

-- Índice compuesto para búsquedas de sesión activa
CREATE INDEX IF NOT EXISTS idx_session_active ON "session" ("token", "expiresAt") WHERE "expiresAt" > NOW();

-- Índice para User.findFirst (búsqueda por email)
CREATE INDEX IF NOT EXISTS idx_user_email ON "user" ("email");
CREATE INDEX IF NOT EXISTS idx_user_id ON "user" ("id");

-- Índice para Organization
CREATE INDEX IF NOT EXISTS idx_organization_id ON "Organization" ("id");

-- Índice para Jwks (si existe la tabla)
-- CREATE INDEX IF NOT EXISTS idx_jwks_created_at ON "jwks" ("createdAt");

-- Índices para mejorar JOINs
CREATE INDEX IF NOT EXISTS idx_user_organization_id ON "user" ("organizationId"); 