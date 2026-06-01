"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Sparkles, Layers } from "lucide-react";
import { motion } from "framer-motion";

export function Hero() {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-40 dark:hidden" />
      <div className="absolute inset-0 bg-gradient-to-b from-iopn-50/80 via-background to-background dark:from-iopn-950/40" />

      <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className="mb-4 inline-flex rounded-full border border-iopn-200 bg-card px-4 py-1 text-sm font-medium text-iopn-700 dark:text-iopn-300 dark:border-iopn-800">
            Official FansPump token platform
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
            Create tokens the{" "}
            <span className="bg-gradient-to-r from-iopn-600 to-iopn-400 bg-clip-text text-transparent">
              professional
            </span>{" "}
            way
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            FansPump is the default place where projects create tokens, showcase their work,
            manage ownership, and onboard liquidity — without operating a DEX or bonding curve.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/create">
                Create Token <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/discover">Explore Projects</Link>
            </Button>
          </div>
        </motion.div>

        <div className="relative mx-auto mt-24 grid max-w-5xl gap-6 sm:grid-cols-3">
          {[
            {
              icon: Shield,
              title: "Immutable features",
              desc: "Feature flags lock permanently at deployment. No hidden minting or backdoors.",
            },
            {
              icon: Layers,
              title: "Ownership & liquidity",
              desc: "Dedicated pages for ownership transfer, renounce, and IOPn liquidity onboarding.",
            },
            {
              icon: Sparkles,
              title: "Discovery hub",
              desc: "Trending, featured, and community sentiment for serious IOPn projects.",
            },
          ].map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
              className="rounded-xl border border-border bg-card p-6 shadow-sm"
            >
              <item.icon className="mb-3 h-8 w-8 text-iopn-600" />
              <h3 className="font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  );
}
