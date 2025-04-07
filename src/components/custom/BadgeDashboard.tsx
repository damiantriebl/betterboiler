// BadgeDashboard.tsx
import { TrendingDownIcon, TrendingUpIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export interface BadgeDashboardProps {
  description: string;
  title: string;
  badgeValue: string;
  badgeIcon: "up" | "down";
  footerText: string;
  footerIcon: "up" | "down";
}

export function BadgeDashboard({
  description,
  title,
  badgeValue,
  badgeIcon,
  footerText,
  footerIcon,
}: BadgeDashboardProps) {
  const IconBadge = badgeIcon === "up" ? TrendingUpIcon : TrendingDownIcon;
  const IconFooter = footerIcon === "up" ? TrendingUpIcon : TrendingDownIcon;
  return (
    <Card className="@container/card">
      <CardHeader className="relative">
        <CardDescription>{description}</CardDescription>
        <CardTitle className="text-2xl md:text-3xl font-semibold tabular-nums">
          {title}
        </CardTitle>
        <div className="absolute right-4 top-4">
          <Badge variant="outline" className="flex gap-1 rounded-lg text-xs">
            <IconBadge className="w-3 h-3" /> {badgeValue}
          </Badge>
        </div>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1 text-sm">
        <div className="flex gap-2 font-medium">
          {footerText} <IconFooter className="w-4 h-4" />
        </div>
      </CardFooter>
    </Card>
  );
}
