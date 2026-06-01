import Link from "next/link";

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8 prose prose-slate">
      <h1 className="text-3xl font-bold">Documentation</h1>
      <p className="text-muted-foreground mt-2">
        Full documentation lives in the repository <code>docs/</code> folder. New to FansPump? Read{" "}
        <Link href="/docs/how-it-works" className="text-primary hover:underline">
          How It Works
        </Link>
        .
      </p>
      <ul className="mt-8 space-y-2 list-disc pl-6">
        <li>
          <Link href="https://github.com/iopn/iopn-launch/blob/main/docs/ARCHITECTURE.md" className="text-iopn-600 hover:underline">
            Architecture overview
          </Link>
        </li>
        <li>
          <Link href="https://github.com/iopn/iopn-launch/blob/main/docs/DEPLOYMENT.md" className="text-iopn-600 hover:underline">
            Deployment guide
          </Link>
        </li>
        <li>
          <Link href="https://github.com/iopn/iopn-launch/blob/main/docs/SECURITY.md" className="text-iopn-600 hover:underline">
            Security model
          </Link>
        </li>
        <li>
          <Link href="/admin" className="text-iopn-600 hover:underline">
            Admin dashboard
          </Link>
        </li>
      </ul>
    </div>
  );
}
