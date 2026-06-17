import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function encryptionKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY?.trim();
  if (raw && /^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  const fallback = createHash("sha256")
    .update(process.env.OTP_SALT ?? "fanspump-dev-token-key")
    .digest();
  return fallback;
}

export function encryptToken(token: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("hex")}`;
}

export function decryptToken(encrypted: string): string {
  const [ivHex, encHex] = encrypted.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const encBuf = Buffer.from(encHex, "hex");
  const decipher = createDecipheriv("aes-256-cbc", encryptionKey(), iv);
  return Buffer.concat([decipher.update(encBuf), decipher.final()]).toString("utf8");
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

export function encodeOAuthState(walletAddress: string): string {
  return Buffer.from(JSON.stringify({ walletAddress: walletAddress.toLowerCase(), ts: Date.now() })).toString(
    "base64url"
  );
}

export function decodeOAuthState(state: string): { walletAddress: string } {
  const parsed = JSON.parse(Buffer.from(state, "base64url").toString()) as {
    walletAddress?: string;
  };
  if (!parsed.walletAddress) throw new Error("Invalid OAuth state");
  return { walletAddress: parsed.walletAddress.toLowerCase() };
}

export function getXAuthUrl(walletAddress: string): string {
  const clientId = process.env.X_CLIENT_ID ?? process.env.TWITTER_CLIENT_ID;
  if (!clientId) throw new Error("X OAuth is not configured");

  const redirectUri = `${apiBaseUrl()}/api/verification/social/x/callback`;
  const params = new URLSearchParams({
    response_type: "code",
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: "tweet.read users.read offline.access",
    state: encodeOAuthState(walletAddress),
    code_challenge: "challenge",
    code_challenge_method: "plain",
  });
  return `https://twitter.com/i/oauth2/authorize?${params}`;
}

export async function exchangeXCode(code: string): Promise<{
  accessToken: string;
  userId: string;
  username: string;
}> {
  const clientId = process.env.X_CLIENT_ID ?? process.env.TWITTER_CLIENT_ID;
  const clientSecret = process.env.X_CLIENT_SECRET ?? process.env.TWITTER_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("X OAuth is not configured");

  const redirectUri = `${apiBaseUrl()}/api/verification/social/x/callback`;
  const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body: new URLSearchParams({
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code_verifier: "challenge",
    }),
  });

  const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(tokenData.error ?? "X token exchange failed");
  }

  const userRes = await fetch("https://api.twitter.com/2/users/me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const userData = (await userRes.json()) as { data?: { id: string; username: string } };
  if (!userRes.ok || !userData.data?.id) {
    throw new Error("Failed to load X profile");
  }

  return {
    accessToken: tokenData.access_token,
    userId: userData.data.id,
    username: userData.data.username,
  };
}

export function getDiscordAuthUrl(walletAddress: string): string {
  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) throw new Error("Discord OAuth is not configured");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${apiBaseUrl()}/api/verification/social/discord/callback`,
    response_type: "code",
    scope: "identify",
    state: encodeOAuthState(walletAddress),
  });
  return `https://discord.com/oauth2/authorize?${params}`;
}

export async function exchangeDiscordCode(code: string): Promise<{
  accessToken: string;
  userId: string;
  username: string;
}> {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error("Discord OAuth is not configured");

  const redirectUri = `${apiBaseUrl()}/api/verification/social/discord/callback`;
  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  const tokenData = (await tokenRes.json()) as { access_token?: string; error?: string };
  if (!tokenRes.ok || !tokenData.access_token) {
    throw new Error(tokenData.error ?? "Discord token exchange failed");
  }

  const userRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const userData = (await userRes.json()) as { id?: string; username?: string };
  if (!userRes.ok || !userData.id) {
    throw new Error("Failed to load Discord profile");
  }

  return {
    accessToken: tokenData.access_token,
    userId: userData.id,
    username: userData.username ?? userData.id,
  };
}

export function profileRedirect(query: string): string {
  return `${appBaseUrl()}/profile?${query}`;
}
