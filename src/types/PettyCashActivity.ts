import type { PettyCashDeposit, PettyCashWithdrawal, PettyCashSpend, Branch } from "@prisma/client";

// Tipo para los gastos de caja chica enriquecidos con información adicional si es necesario
export type EnrichedSpendPrisma = PettyCashSpend & {
  // Aquí puedes añadir campos adicionales si en el futuro los necesitas para el reporte
  // Ejemplo: userName?: string;
};

// Tipo para los retiros de caja chica enriquecidos, incluyendo sus gastos asociados
export type EnrichedWithdrawalPrisma = PettyCashWithdrawal & {
  spends: EnrichedSpendPrisma[];
  userName?: string; // Asumiendo que queremos mostrar el nombre del usuario que hizo el retiro
};

// Tipo para los depósitos de caja chica, incluyendo sus retiros y la información de la sucursal
export type ReportDataForPdf = PettyCashDeposit & {
  branch: Branch | null;
  withdrawals: EnrichedWithdrawalPrisma[];
};

// Si tienes otros tipos relacionados específicamente con la actividad de caja chica para reportes,
// puedes añadirlos aquí.
