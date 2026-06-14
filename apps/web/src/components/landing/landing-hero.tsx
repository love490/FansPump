"use client";

const HERO_BLUE = "#0d47aa";

export function LandingHero() {
  return (
    <section className="relative w-full overflow-hidden">
      <div className="mx-auto w-full max-w-6xl xl:max-w-7xl">
        <div
          className="relative min-h-[120px] w-full overflow-hidden rounded-xl border border-[#0a3a88]/50 shadow-md shadow-[#0d47aa]/20 sm:min-h-[140px] lg:min-h-[160px]"
          style={{ backgroundColor: HERO_BLUE }}
        >
          <div className="relative px-5 py-6 sm:px-7 sm:py-7 lg:px-8 lg:py-8">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-sky-200 sm:text-xs">
              IOPn Ecosystem
            </p>
            <h1 className="mt-1.5 text-xl font-extrabold leading-tight tracking-tight text-white sm:text-2xl lg:text-3xl">
              Create, Discover &amp; Grow on OPN
            </h1>
            <p className="mt-2 text-sm text-white/75 sm:text-base">
              The Trust &amp; Growth Platform for the IOPn Ecosystem.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
