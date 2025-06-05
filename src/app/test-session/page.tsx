import { getOrganizationSessionData } from "@/actions/util/organization-session-unified";

export default async function TestSessionPage() {
  console.log("🧪 [TEST SESSION] Iniciando test de sesión");

  const sessionData = await getOrganizationSessionData();

  console.log("🧪 [TEST SESSION] Datos obtenidos:", sessionData);

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">🧪 Test de Sesión</h1>

      <div className="bg-gray-100 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Datos de Sesión del Servidor:</h2>
        <pre className="text-sm overflow-x-auto bg-white p-4 rounded border">
          {JSON.stringify(sessionData, null, 2)}
        </pre>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="bg-blue-50 p-4 rounded">
          <h3 className="font-semibold">¿Usuario autenticado?</h3>
          <p className={sessionData.userId ? "text-green-600" : "text-red-600"}>
            {sessionData.userId ? "✅ Sí" : "❌ No"}
          </p>
        </div>

        <div className="bg-yellow-50 p-4 rounded">
          <h3 className="font-semibold">¿Tiene organización?</h3>
          <p className={sessionData.organizationId ? "text-green-600" : "text-red-600"}>
            {sessionData.organizationId ? "✅ Sí" : "❌ No"}
          </p>
        </div>

        <div className="bg-purple-50 p-4 rounded">
          <h3 className="font-semibold">¿Hay errores?</h3>
          <p className={sessionData.error ? "text-red-600" : "text-green-600"}>
            {sessionData.error ? `❌ ${sessionData.error}` : "✅ Sin errores"}
          </p>
        </div>

        <div className="bg-green-50 p-4 rounded">
          <h3 className="font-semibold">Rol del usuario</h3>
          <p className="text-gray-700">{sessionData.userRole || "Sin rol"}</p>
        </div>
      </div>
    </div>
  );
}
