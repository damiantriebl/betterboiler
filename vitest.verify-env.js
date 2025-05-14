import fs from "fs";
import { resolve } from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Este script verifica que los aliases se estén resolviendo correctamente.
 * Se puede ejecutar como parte del CI para detectar problemas de configuración.
 */

// Verificar existencia de archivos en rutas comunes
const filesToCheck = ["components/custom/LoadingButton", "components/ui/button", "hooks/use-toast"];

console.log("🔍 Verificando resolución de aliases...");
const srcPath = resolve(__dirname, "src");

for (const file of filesToCheck) {
  const base = resolve(srcPath, file);
  const variants = [`${base}.tsx`, `${base}.ts`, `${base}/index.tsx`, `${base}/index.ts`];
  const found = variants.find((p) => fs.existsSync(p));
  if (found) {
    console.log(`✅ @/${file} -> ${found}`);
  } else {
    console.error(`❌ No se pudo resolver: @/${file}`);
    variants.forEach((p) => console.error(`   Intentado: ${p}`));
    process.exit(1);
  }
}

console.log("✅ Todos los aliases se resuelven correctamente.");
process.exit(0);
