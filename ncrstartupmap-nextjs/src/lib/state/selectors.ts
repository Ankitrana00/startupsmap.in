import type { Counts, Startup } from "@/lib/types/startup";

export function selectMapped(startups: Startup[]): Startup[] {
  return startups.filter((s) => s.lat !== null && s.lng !== null);
}

export function selectUnmapped(startups: Startup[]): Startup[] {
  return startups.filter((s) => s.lat === null || s.lng === null);
}

export function selectCounts(startups: Startup[]): Counts {
  let hiring = 0;
  let notHiring = 0;
  let unconfirmed = 0;
  let mapped = 0;
  let unmapped = 0;
  for (const s of startups) {
    if (s.is_hiring === true) hiring += 1;
    else if (s.is_hiring === false) notHiring += 1;
    else unconfirmed += 1;
    if (s.lat === null || s.lng === null) unmapped += 1;
    else mapped += 1;
  }
  return { total: startups.length, hiring, notHiring, unconfirmed, mapped, unmapped };
}
