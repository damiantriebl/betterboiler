"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface BalanceCardProps {
    totalBalance: number;
}

const BalanceCard = ({ totalBalance }: BalanceCardProps) => {
    return (
        <Card className="mt-4" aria-label="Balance de caja chica">
            <CardHeader>
                <CardTitle>Balance de caja chica</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold text-green-700" role="status">
                    {/* Formatear el número como moneda */}
                    {`$${totalBalance.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                </div>
            </CardContent>
        </Card>
    );
};

export default BalanceCard;
