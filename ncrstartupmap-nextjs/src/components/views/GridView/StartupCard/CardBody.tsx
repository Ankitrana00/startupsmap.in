import { Badge } from "@/components/shared/Badge";
import type { Startup } from "@/lib/types/startup";

interface CardBodyProps {
  startup: Startup;
}

export function CardBody({ startup }: CardBodyProps) {
  return (
    <div className="mt-4 flex flex-wrap gap-1.5">
      <Badge>{startup.sector}</Badge>
      <Badge>{startup.stage}</Badge>
      <Badge>Est. {startup.founded}</Badge>
    </div>
  );
}
