import type { Metadata } from "next";

interface VerifyPageProps {
  params: Promise<{ token: string }>;
}

export const metadata: Metadata = {
  title: "Verify Email — StartupsMap.in",
  description: "Verify your email on StartupsMap.in.",
  // Token-gated one-time link — must never be indexed.
  robots: { index: false, follow: false },
};

export default async function VerifyPage({ params }: VerifyPageProps) {
  // Token is received but never displayed — it is a capability credential
  // (a one-time access link); echoing it into the DOM is a security leak
  // regardless of whether verification logic exists yet.
  const { token } = await params;
  void token;
  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Verify Email</h1>
      <p className="text-muted-foreground">
        Thanks for clicking the link in your email. Verification functionality is
        coming soon.
      </p>
    </main>
  );
}
