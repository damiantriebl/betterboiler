export interface ReservationReport {
  reservations: {
    date: Date;
    customerName: string;
    model: string;
    amount: number;
  }[];
  totalReservations: number;
  totalAmount: number;
} 