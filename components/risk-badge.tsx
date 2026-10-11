import { ShieldAlert, ShieldCheck, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { RiskLevel } from "@/lib/risk";

const STYLES: Record<RiskLevel, { label: string; className: string; Icon: typeof Shield }> = {
  high: { label: "High risk", className: "bg-rose-100 text-rose-700 hover:bg-rose-100", Icon: ShieldAlert },
  moderate: { label: "Moderate risk", className: "bg-amber-100 text-amber-800 hover:bg-amber-100", Icon: Shield },
  low: { label: "Low risk", className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100", Icon: ShieldCheck },
};

export function RiskBadge({ level, reasons = [] }: { level: RiskLevel; reasons?: string[] }) {
  const { label, className, Icon } = STYLES[level];
  const badge = (
    <Badge className={`gap-1 ${className}`}>
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
  if (reasons.length === 0) return badge;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex cursor-help">{badge}</span>
      </TooltipTrigger>
      <TooltipContent>
        <ul className="text-xs space-y-0.5">
          {reasons.map((r) => (
            <li key={r}>• {r}</li>
          ))}
        </ul>
      </TooltipContent>
    </Tooltip>
  );
}
