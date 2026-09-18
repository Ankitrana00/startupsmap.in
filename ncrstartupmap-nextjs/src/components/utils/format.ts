export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" });
}

export function formatStage(stage: string): string {
  const stages: Record<string, string> = {
    Idea: "创意阶段",
    Seed: "种子轮",
    "Series A": "A轮",
    "Series B": "B轮",
    Growth: "成长期",
  };
  return stages[stage] || stage;
}
