import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import SalesSection from "./SalesSection";
import { CardSection } from "./CardsSection";
import ChartSection from "./ChartSection";

export default async function AdminDashboard() {
  return (
    <main className="flex justify-start flex-col w-full gap-10 ">
      <CardSection />
      <Card className="flex flex-col gap-2 p-4">
        <h1 className="text-3xl font-bold">Ventas Totales</h1>
        <p className="text-muted-foreground">
          Ventas generadas por todo el equipo en lo que va del año
        </p>
        <SalesSection />
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
        <ChartSection type="brands" />
        <ChartSection type="displacement" />
        <ChartSection type="types" />
      </div>
    </main>
  );
}
