import { randomBytes, createHash } from "crypto";

export type OAuthProvider = "google" | "github" | "twitter" | "apple" | "discord";

const PROVIDER_LABELS: Record<OAuthProvider, string> = {
  google: "Google",
  github: "GitHub",
  twitter: "X",
  apple: "Apple",
  discord: "Discord",
};

export function oauthProviderLabel(provider: OAuthProvider): string {
  return PROVIDER_LABELS[provider];
}

export function isOAuthProvider(value: string): value is OAuthProvider {
  return (
    value === "google" ||
    value === "github" ||
    value === "twitter" ||
    value === "apple" ||
    value === "discord"
  );
}

function appBaseUrl(): string {
  return (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

function apiBaseUrl(): string {
  return (process.env.API_PUBLIC_URL ?? process.env.API_URL ?? "http://localhost:3001").replace(
    /\/$/,
    ""
  );
}

export function oauthCallbackUrl(provider: OAuthProvider): string {
  return `${apiBaseUrl()}/api/auth/oauth/${provider}/callback`;
}

export function oauthSuccessRedirect(path = "/?signed_in=1"): string {
  const base = appBaseUrl();
  if (path.startsWith("http")) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function oauthErrorRedirect(message: string, path = "/"): string {
  const base = appBaseUrl();
  const suffix = path.startsWith("/") ? path : `/${path}`;
  const join = suffix.includes("?") ? "&" : "?";
  return `${base}${suffix}${join}auth_error=${encodeURIComponent(message)}`;
}

export function createOAuthState(): string {
  return randomBytes(24).toString("hex");
}

export function createPkce(): { verifier: string; challenge: string } {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

type ProviderConfig = {
  clientId?: string;
  clientSecret?: string;
};

function providerConfig(provider: OAuthProvider): ProviderConfig {
  switch (provider) {
    case "google":
      return {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      };
    case "github":
      return {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
      };
    case "twitter":
      return {
        clientId: process.env.TWITTER_CLIENT_ID,
        clientSecret: process.env.TWITTER_CLIENT_SECRET,
      };
    case "apple":
      return {
        clientId: process.env.APPLE_CLIENT_ID,
        clientSecret: process.env.APPLE_CLIENT_SECRET,
      };
    case "discord":
      return {
        clientId: process.env.DISCORD_CLIENT_ID,
        clientSecret: process.env.DISCORD_CLIENT_SECRET,
      };
  }
}

export function isOAuthConfigured(provider: OAuthProvider): boolean {
  const { clientId, clientSecret } = providerConfig(provider);
  return Boolean(clientId && clientSecret);
}

export function buildOAuthAuthorizeUrl(
  provider: OAuthProvider,
  state: string,
  pkceChallenge?: string
): string {
  const { clientId } = providerConfig(provider);
  if (!clientId) {
    throw new Error(`${oauthProviderLabel(provider)} sign-in is not configured`);
  }

  const redirectUri = encodeURIComponent(oauthCallbackUrl(provider));
  const encodedState = encodeURIComponent(state);

  switch (provider) {
    case "google":
      return (
        `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}` +
        `&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent("openid email profile")}` +
        `&state=${encodedState}&access_type=online&prompt=select_account`
      );
    case "github":
      return (
        `https://github.com/login/oauth/authorize?client_id=${clientId}` +
        `&redirect_uri=${redirectUri}&scope=${encodeURIComponent("read:user user:email")}` +
        `&state=${encodedState}`
      );
    case "twitter": {
      if (!pkceChallenge) throw new Error("PKCE challenge required for X");
      return (
        `https://twitter.com/i/oauth2/authorize?client_id=${clientId}` +
        `&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent("users.read tweet.read offline.access")}` +
        `&state=${encodedState}&code_challenge=${pkceChallenge}&code_challenge_method=S256`
      );
    }
    case "apple":
      return (
        `https://appleid.apple.com/auth/authorize?client_id=${clientId}` +
        `&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent("name email")}` +
        `&response_mode=form_post&state=${encodedState}`
      );
    case "discord":
      return (
        `https://discord.com/api/oauth2/authorize?client_id=${clientId}` +
        `&redirect_uri=${redirectUri}&response_type=code&scope=${encodeURIComponent("identify email")}` +
        `&state=${encodedState}`
      );
  }
}

export type OAuthProfile = {
  providerUserId: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

export async function exchangeOAuthCode(
  provider: OAuthProvider,
  code: string,
  pkceVerifier?: string
): Promise<OAuthProfile> {
  const { clientId, clientSecret } = providerConfig(provider);
  if (!clientId || !clientSecret) {
    throw new Error(`${oauthProviderLabel(provider)} sign-in is not configured`);
  }

  switch (provider) {
    case "google":
      return exchangeGoogle(code, clientId, clientSecret);
    case "github":
      return exchangeGitHub(code, clientId, clientSecret);
    case "twitter":
      return exchangeTwitter(code, clientId, clientSecret, pkceVerifier);
    case "apple":
      return exchangeApple(code, clientId, clientSecret);
    case "discord":
      return exchangeDiscord(code, clientId, clientSecret);
  }
}

async function exchangeGoogle(code: string, clientId: string, clientSecret: string): Promise<OAuthProfile> {
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: oauthCallbackUrl("google"),
      grant_type: "authorization_code",
    }),
  });
  const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(tokenJson.error ?? "Google token exchange failed");
  }

  const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  const profile = (await profileRes.json()) as {
    id?: string;
    email?: string;
    name?: string;
    picture?: string;
  };

  return {
    providerUserId: profile.id ?? "",
    email: profile.email ?? null,
    displayName: profile.name ?? null,
    avatarUrl: profile.picture ?? null,
  };
}

async function exchangeGitHub(code: string, clientId: string, clientSecret: string): Promise<OAuthProfile> {
  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: oauthCallbackUrl("github"),
    }),
  });
  const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(tokenJson.error ?? "GitHub token exchange failed");
  }

  const [userRes, emailsRes] = await Promise.all([
    fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenJson.access_token}`, Accept: "application/json" },
    }),
    fetch("https://api.github.com/user/emails", {
      headers: { Authorization: `Bearer ${tokenJson.access_token}`, Accept: "application/json" },
    }),
  ]);

  const user = (await userRes.json()) as { id?: number; login?: string; name?: string; avatar_url?: string };
  const emails = (await emailsRes.json()) as { email?: string; primary?: boolean; verified?: boolean }[];
  const primaryEmail =
    emails.find((e) => e.primary && e.verified)?.email ??
    emails.find((e) => e.verified)?.email ??
    emails[0]?.email ??
    null;

  return {
    providerUserId: String(user.id ?? ""),
    email: primaryEmail,
    displayName: user.name ?? user.login ?? null,
    avatarUrl: user.avatar_url ?? null,
  };
}

async function exchangeTwitter(
  code: string,
  clientId: string,
  clientSecret: string,
  pkceVerifier?: string
): Promise<OAuthProfile> {
  if (!pkceVerifier) throw new Error("Missing PKCE verifier for X");

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: oauthCallbackUrl("twitter"),
      code_verifier: pkceVerifier,
    }),
  });
  const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(tokenJson.error ?? "X token exchange failed");
  }

  const profileRes = await fetch("https://api.twitter.com/2/users/me?user.fields=profile_image_url", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  const profile = (await profileRes.json()) as {
    data?: { id?: string; name?: string; username?: string; profile_image_url?: string };
  };

  return {
    providerUserId: profile.data?.id ?? "",
    email: null,
    displayName: profile.data?.name ?? profile.data?.username ?? null,
    avatarUrl: profile.data?.profile_image_url ?? null,
  };
}

async function exchangeApple(code: string, clientId: string, clientSecret: string): Promise<OAuthProfile> {
  const tokenRes = await fetch("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: oauthCallbackUrl("apple"),
      grant_type: "authorization_code",
    }),
  });
  const tokenJson = (await tokenRes.json()) as { id_token?: string; error?: string };
  if (!tokenRes.ok || !tokenJson.id_token) {
    throw new Error(tokenJson.error ?? "Apple token exchange failed");
  }

  const payload = JSON.parse(
    Buffer.from(tokenJson.id_token.split(".")[1] ?? "", "base64url").toString("utf8")
  ) as { sub?: string; email?: string };

  return {
    providerUserId: payload.sub ?? "",
    email: payload.email ?? null,
    displayName: null,
    avatarUrl: null,
  };
}

async function exchangeDiscord(
  code: string,
  clientId: string,
  clientSecret: string
): Promise<OAuthProfile> {
  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: oauthCallbackUrl("discord"),
      grant_type: "authorization_code",
    }),
  });
  const tokenJson = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(tokenJson.error ?? "Discord token exchange failed");
  }

  const profileRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` },
  });
  const profile = (await profileRes.json()) as {
    id?: string;
    username?: string;
    global_name?: string | null;
    avatar?: string | null;
    email?: string | null;
  };

  const avatarUrl =
    profile.id && profile.avatar
      ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
      : null;

  return {
    providerUserId: profile.id ?? "",
    email: profile.email ?? null,
    displayName: profile.global_name ?? profile.username ?? null,
    avatarUrl,
  };
}
