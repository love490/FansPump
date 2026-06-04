export default function TermsOfServicePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString()}</p>

      <div className="prose prose-slate mt-8 max-w-none space-y-6 text-sm text-muted-foreground">
        <section>
          <h2 className="text-lg font-semibold text-foreground">1. Acceptance</h2>
          <p>
            By accessing or using FansPump, you agree to these Terms of Service. If you do not agree, do not
            use the platform.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">2. Platform description</h2>
          <p>
            FansPump provides tools to create tokens, list projects, swap via third-party DEX routers, and
            manage liquidity on OPNChain. We are not a broker, exchange, or investment adviser.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">3. Your responsibilities</h2>
          <p>
            You are solely responsible for your wallet security, token configurations, compliance with
            applicable laws, and any content you publish. Immutable contract features cannot be changed after
            deployment.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">4. Risks</h2>
          <p>
            Digital assets involve significant risk including total loss of funds. Smart contracts may
            contain bugs. DEX liquidity and pricing are not guaranteed by FansPump.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">5. Limitation of liability</h2>
          <p>
            FansPump is provided &quot;as is&quot; without warranties. To the fullest extent permitted by law, we
            are not liable for indirect, incidental, or consequential damages arising from use of the
            platform.
          </p>
        </section>
        <section>
          <h2 className="text-lg font-semibold text-foreground">6. Changes</h2>
          <p>
            We may update these terms at any time. Continued use after changes constitutes acceptance of the
            revised terms.
          </p>
        </section>
      </div>
    </div>
  );
}
