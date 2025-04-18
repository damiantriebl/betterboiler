// CardSection.tsx

import { BadgeDashboard, type BadgeDashboardProps } from "@/components/custom/BadgeDashboard";

export function CardSection() {
  const items: BadgeDashboardProps[] = [
    {
      description: "Total de Ventas Mensuales",
      title: "$30.250.000",
      badgeValue: "+12.5%",
      badgeIcon: "up",
      footerText: "Las ventas levantaron este mes",
      footerIcon: "up",
    },
    {
      description: "Total de Unidades vendidas",
      title: "250 Unidades",
      badgeValue: "+4.5%",
      badgeIcon: "up",
      footerText: "Se mantiene la tendencia",
      footerIcon: "up",
    },
    {
      description: "Nuevas Unidades",
      title: "123",
      badgeValue: "-10%",
      badgeIcon: "down",
      footerText: "Entraron 10% de unidades menos",
      footerIcon: "down",
    },
    {
      description: "Motos en Taller",
      title: "45",
      badgeValue: "+12.5%",
      badgeIcon: "up",
      footerText: "Se aumentó la tasa",
      footerIcon: "up",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {items.map((item) => (
        <BadgeDashboard key={item.title} {...item} />
      ))}
    </div>
  );
}
