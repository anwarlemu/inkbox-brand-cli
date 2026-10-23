"use client";

import { AreaChart, BarChart, type ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, LineChart, PieChart } from "@/components/ui/chart";

const MESSAGES = [
  { month: "January", email: 186, imessage: 80 },
  { month: "February", email: 305, imessage: 200 },
  { month: "March", email: 237, imessage: 120 },
  { month: "April", email: 173, imessage: 190 },
  { month: "May", email: 209, imessage: 130 },
  { month: "June", email: 264, imessage: 140 },
];

const config = {
  email: { label: "Email" },
  imessage: { label: "iMessage" },
} satisfies ChartConfig;

const short = (v: string) => v.slice(0, 3);

export function Preview() {
  return (
    <ChartContainer config={config} className="aspect-auto h-80">
      <BarChart data={MESSAGES} index="month" tickFormatter={short} aria-label="Messages sent per month by channel" />
      <ChartTooltip content={<ChartTooltipContent />} />
      <ChartLegend content={<ChartLegendContent />} />
    </ChartContainer>
  );
}

export function Line() {
  return (
    <ChartContainer config={config} className="aspect-auto h-80">
      <LineChart data={MESSAGES} index="month" tickFormatter={short} showYAxis dots aria-label="Messages sent per month" />
      <ChartTooltip content={<ChartTooltipContent indicator="line" />} />
      <ChartLegend content={<ChartLegendContent />} />
    </ChartContainer>
  );
}

export function Area() {
  return (
    <ChartContainer config={config} className="aspect-auto h-80">
      <AreaChart data={MESSAGES} index="month" tickFormatter={short} stacked aria-label="Messages per month, stacked by channel" />
      <ChartTooltip content={<ChartTooltipContent indicator="dashed" />} />
    </ChartContainer>
  );
}

const DELIVERIES = [
  { status: "delivered", count: 1240 },
  { status: "retrying", count: 86 },
  { status: "failed", count: 32 },
];

const deliveryConfig = {
  delivered: { label: "Delivered", color: "var(--ds-color-chart-series-1)" },
  retrying: { label: "Retrying", color: "var(--ds-color-chart-series-2)" },
  failed: { label: "Failed", color: "var(--ds-color-chart-series-3)" },
} satisfies ChartConfig;

export function Pie() {
  return (
    <ChartContainer config={deliveryConfig} className="mx-auto aspect-square max-h-72">
      <PieChart data={DELIVERIES} index="status" value="count" aria-label="Webhook deliveries by status" />
      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
      <ChartLegend content={<ChartLegendContent />} />
    </ChartContainer>
  );
}
