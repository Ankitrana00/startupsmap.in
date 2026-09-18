import Link from "next/link";

export const metadata = {
  title: "Submission Received — StartupsMap.in",
  description: "Your startup submission has been received.",
};

export default function SubmitSuccessPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="mb-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-action/15">
          <svg
            className="h-8 w-8 text-action"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      </div>

      {/* L7: this is a static page with no submission state guard, so copy is
          worded to stay honest on a direct visit instead of asserting that a
          submission just happened. */}
      <h1 className="text-2xl font-bold mb-4">Thanks for your interest</h1>

      <p className="text-muted-foreground mb-6">
        If you just submitted a startup, our team has received it and will
        review it within 2-3 business days.
      </p>

      <p className="text-muted-foreground mb-8">
        If your startup is approved, it will appear on our NCR startup map.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Link
          href="/"
          className="rounded-lg bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:opacity-90 transition-opacity"
        >
          Back to Map
        </Link>
        <Link
          href="/submit"
          className="rounded-lg border border-border px-6 py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
        >
          Submit Another Startup
        </Link>
      </div>
    </main>
  );
}
