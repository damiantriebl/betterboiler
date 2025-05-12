-- Update any null updatedAt values to match createdAt
UPDATE "Model" 
SET "updatedAt" = "createdAt" 
WHERE "updatedAt" IS NULL; 