"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme, lightTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { useTheme } from "next-themes";
import { wagmiConfig } from "@/lib/wagmi";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/components/auth/auth-provider";
import { useState } from "react";

const rkLight = lightTheme({
  accentColor: "#2563eb",
  accentColorForeground: "white",
  borderRadius: "medium",
});

const rkDark = darkTheme({
  accentColor: "#3b82f6",
  accentColorForeground: "white",
  borderRadius: "medium",
});

function RainbowKitThemed({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  return (
    <RainbowKitProvider theme={resolvedTheme === "dark" ? rkDark : rkLight}>{children}</RainbowKitProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitThemed>
            <AuthProvider>{children}</AuthProvider>
          </RainbowKitThemed>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  );
}
