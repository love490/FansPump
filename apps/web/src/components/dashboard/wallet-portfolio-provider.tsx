"use client";

import { createContext, useContext } from "react";
import { useWalletPortfolioBalance } from "@/hooks/dashboard/useWalletPortfolioBalance";

type WalletPortfolio = ReturnType<typeof useWalletPortfolioBalance>;

const WalletPortfolioContext = createContext<WalletPortfolio | null>(null);

/**
 * Computes wallet balances once for the whole dashboard.
 *
 * Balance discovery makes several RPC round trips, so the summary card, asset
 * list, DeFi tab and rewards tab share one result instead of each refetching.
 */
export function WalletPortfolioProvider({ children }: { children: React.ReactNode }) {
  const portfolio = useWalletPortfolioBalance();
  return (
    <WalletPortfolioContext.Provider value={portfolio}>{children}</WalletPortfolioContext.Provider>
  );
}

export function useDashboardPortfolio(): WalletPortfolio {
  const context = useContext(WalletPortfolioContext);
  if (!context) {
    throw new Error("useDashboardPortfolio must be used inside <WalletPortfolioProvider>");
  }
  return context;
}
