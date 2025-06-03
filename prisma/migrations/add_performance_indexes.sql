-- Índices para optimizar queries lentas específicas

-- Índices para Organization queries
CREATE INDEX IF NOT EXISTS idx_organization_slug ON "Organization" ("slug");
CREATE INDEX IF NOT EXISTS idx_organization_created_at ON "Organization" ("createdAt" DESC);

-- Índices para OrganizationBrand
CREATE INDEX IF NOT EXISTS idx_org_brand_org_id ON "OrganizationBrand" ("organizationId");
CREATE INDEX IF NOT EXISTS idx_org_brand_brand_id ON "OrganizationBrand" ("brandId");
CREATE INDEX IF NOT EXISTS idx_org_brand_composite ON "OrganizationBrand" ("organizationId", "brandId");

-- Índices para Supplier
CREATE INDEX IF NOT EXISTS idx_supplier_org_id ON "Supplier" ("organizationId");
CREATE INDEX IF NOT EXISTS idx_supplier_active ON "Supplier" ("organizationId", "isActive") WHERE "isActive" = true;
CREATE INDEX IF NOT EXISTS idx_supplier_name ON "Supplier" ("name");

-- Índices para Branch
CREATE INDEX IF NOT EXISTS idx_branch_org_id ON "Branch" ("organizationId");
CREATE INDEX IF NOT EXISTS idx_branch_active ON "Branch" ("organizationId", "isActive") WHERE "isActive" = true;
CREATE INDEX IF NOT EXISTS idx_branch_name ON "Branch" ("name");

-- Índices para MotoColor
CREATE INDEX IF NOT EXISTS idx_moto_color_org_id ON "MotoColor" ("organizationId");
CREATE INDEX IF NOT EXISTS idx_moto_color_name ON "MotoColor" ("name");
CREATE INDEX IF NOT EXISTS idx_moto_color_hex ON "MotoColor" ("hexCode");

-- Índices compuestos para JOINs comunes
CREATE INDEX IF NOT EXISTS idx_org_brand_full ON "OrganizationBrand" ("organizationId", "brandId", "createdAt" DESC);

-- Índices para mejorar ORDER BY
CREATE INDEX IF NOT EXISTS idx_supplier_org_created ON "Supplier" ("organizationId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_branch_org_created ON "Branch" ("organizationId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_moto_color_org_name ON "MotoColor" ("organizationId", "name" ASC);

-- Análisis y actualización de estadísticas
ANALYZE "Organization";
ANALYZE "OrganizationBrand";
ANALYZE "Supplier";
ANALYZE "Branch";
ANALYZE "MotoColor";

-- Agregar índices para mejorar performance de consultas de motocicletas
-- Script de migración manual para optimización

-- 🚀 Índice compuesto principal para consultas paginadas
CREATE INDEX IF NOT EXISTS "idx_motorcycle_org_state_id" ON "Motorcycle" ("organizationId", "state", "id" DESC);

-- 🚀 Índice para ordenamiento por año
CREATE INDEX IF NOT EXISTS "idx_motorcycle_org_year_id" ON "Motorcycle" ("organizationId", "year" DESC, "id" DESC);

-- 🚀 Índice para ordenamiento por precio
CREATE INDEX IF NOT EXISTS "idx_motorcycle_org_price_id" ON "Motorcycle" ("organizationId", "retailPrice" DESC, "id" DESC);

-- 🚀 Índice para búsquedas por número de chasis
CREATE INDEX IF NOT EXISTS "idx_motorcycle_chassis" ON "Motorcycle" ("chassisNumber");

-- 🚀 Índice para join con marcas (para ordenamiento)
CREATE INDEX IF NOT EXISTS "idx_motorcycle_brand_id" ON "Motorcycle" ("brandId");

-- 🚀 Índice para join con modelos (para ordenamiento)
CREATE INDEX IF NOT EXISTS "idx_motorcycle_model_id" ON "Motorcycle" ("modelId");

-- 🚀 Índice para consultas de reservas activas
CREATE INDEX IF NOT EXISTS "idx_reservation_motorcycle_status" ON "Reservation" ("motorcycleId", "status") WHERE "status" = 'active';

-- 🚀 Índice para brand names (ordenamiento)
CREATE INDEX IF NOT EXISTS "idx_brand_name" ON "Brand" ("name");

-- 🚀 Índice para model names (ordenamiento)
CREATE INDEX IF NOT EXISTS "idx_model_name" ON "Model" ("name");

-- Análisis de estadísticas para optimizar el query planner
ANALYZE "Motorcycle";
ANALYZE "Brand";
ANALYZE "Model";
ANALYZE "Reservation"; 