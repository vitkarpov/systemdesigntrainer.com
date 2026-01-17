import type { PhaseMetadataDto } from "@/api/hooks.gen";
import { Badge } from "./ui/badge";
import { Clock } from "lucide-react";

interface PhaseDisplayProps {
  phaseMetadata: PhaseMetadataDto;
}

export function PhaseDisplay({ phaseMetadata }: PhaseDisplayProps) {
  return (
    <div className="px-4 flex-1">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Badge
            variant="outline"
            className="text-xs font-medium shrink-0 gap-1"
          >
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {phaseMetadata.recommendedMinutes} min
            </span>
          </Badge>
          <div className="min-w-0">
            <h2 className="text-base font-semibold">{phaseMetadata.name}</h2>
            <p className="text-sm text-muted-foreground">
              {phaseMetadata.description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
