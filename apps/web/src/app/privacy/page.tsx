export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="prose prose-slate mt-8 max-w-none space-y-6 text-sm text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">1. Overview</h2>
          <p>
            FansPump (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) respects your privacy. This policy describes how we
            collect, use, and protect information when you use our token creation and discovery platform on
            OPNChain.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">2. Information we collect</h2>
          <p>
            We may collect wallet addresses you connect, transaction data on-chain, project metadata you
            submit (names, descriptions, images, links), and standard usage data such as pages visited and
            device type.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">3. How we use information</h2>
          <p>
            We use this information to operate the platform, display tokens and profiles, improve the
            product, prevent abuse, and comply with legal obligations. We do not sell your personal data.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">4. Blockchain data</h2>
          <p>
            Transactions on OPNChain are public and permanent. Wallet addresses and on-chain activity are
            not controlled by FansPump and may be visible to anyone.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">5. Contact</h2>
          <p>
            For privacy-related questions, contact us through the official FansPump channels listed on this
            site.
          </p>
        </section>
      </div>
    </div>
  );
}
