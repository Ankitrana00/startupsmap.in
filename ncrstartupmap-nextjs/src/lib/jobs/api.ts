export interface Job {
  id: string;
  startupId: string;
  title: string;
  description: string;
  location: string;
  type: "full-time" | "part-time" | "contract" | "remote";
  salary?: string;
  postedAt: Date;
  expiresAt: Date;
}

export async function getJobs(_startupId?: string): Promise<Job[]> {
  // Simulated job listing
  return [
    {
      id: "job-001",
      startupId: "s-001",
      title: "Senior React Developer",
      description: "Build the future of fintech",
      location: "Gurugram",
      type: "full-time",
      salary: "¥500K-800K",
      postedAt: new Date("2024-01-15"),
      expiresAt: new Date("2024-02-15"),
    },
  ];
}

export async function getJobById(id: string): Promise<Job | null> {
  const jobs = await getJobs();
  return jobs.find((j) => j.id === id) || null;
}
