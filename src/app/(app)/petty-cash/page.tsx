import PettyCashDataFetcher from "./PettyCashDataFetcher";

// Ya no es necesario 'use client' aquí si toda la lógica de cliente está en PettyCashClientPage
// y PettyCashDataFetcher es el Server Component que obtiene los datos.
// Si PettyCashClientPage todavía necesita ser un client component, page.tsx puede seguir siendo un Server Component.

export default function PettyCashPage() {
  // Toda la lógica de obtención de datos se ha movido a PettyCashDataFetcher
  return <PettyCashDataFetcher />;
}

// Las funciones getBranchesForOrganization y getUsersForOrganization
// se han movido a PettyCashDataFetcher.tsx o deberían estar en un lugar centralizado (ej. /actions)
// y ser importadas allí.
