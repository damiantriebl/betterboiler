"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { mockSales } from "./MockSale";

export type Sale = {
  date: string;
  vendor: "sebastian" | "lucrecia" | "martin";
  bike: {
    brand: string;
    displacement: number;
    model: string;
    year: number;
    type: string;
  };
};

function aggregateSalesByMonth() {
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun"];
  return months.map((m, idx) => {
    const filtered = mockSales.filter((s) => new Date(s.date).getMonth() === idx);
    return {
      month: m,
      sebastian: filtered.filter((s) => s.vendor === "sebastian").length,
      lucrecia: filtered.filter((s) => s.vendor === "lucrecia").length,
      martin: filtered.filter((s) => s.vendor === "martin").length,
    };
  });
}

export default function SalesSection() {
  const data = aggregateSalesByMonth();

  return (
    <div className="w-full h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Area type="monotone" dataKey="sebastian" stackId="1" stroke="#8884d8" fill="#8884d8" />
          <Area type="monotone" dataKey="lucrecia" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
          <Area type="monotone" dataKey="martin" stackId="1" stroke="#ffc658" fill="#ffc658" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
