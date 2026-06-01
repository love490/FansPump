import { TokenCreateForm } from "@/components/create/token-create-form";

export default function CreatePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold mb-2">Create Token</h1>
      <p className="text-muted-foreground mb-8">
        Deploy an ERC20 with permanently locked feature flags on FansPump.
      </p>
      <TokenCreateForm />
    </div>
  );
}
