export interface Application {
  id: string;
  jobId: string;
  candidateName: string;
  candidateEmail: string;
  resume?: string;
  coverLetter?: string;
  appliedAt: Date;
  status: "pending" | "reviewed" | "shortlisted" | "rejected" | "hired";
}

export async function submitApplication(
  jobId: string,
  application: Omit<Application, "id" | "appliedAt" | "status">,
): Promise<Application> {
  return {
    ...application,
    id: Math.random().toString(36).substring(7),
    appliedAt: new Date(),
    status: "pending",
  };
}

export async function getApplicationStatus(_applicationId: string): Promise<Application | null> {
  // Simulated
  return null;
}
