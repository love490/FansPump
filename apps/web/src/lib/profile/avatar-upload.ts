import { apiUrl, formatFetchError, readApiJson } from "@/lib/api";
export async function uploadProfileAvatar(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("kind", "avatar");

  let res: Response;
  try {
    res = await fetch(apiUrl("/api/upload"), { method: "POST", body: formData });
  } catch (error) {
    throw new Error(formatFetchError(error, "Upload"));
  }

  const { ok, data, error } = await readApiJson<{ error?: string; url?: string | null }>(res);
  if (!ok) throw new Error(error ?? data.error ?? "Upload failed");
  if (!data.url) throw new Error(data.error ?? "Image storage is not configured yet.");

  return data.url;
}

export async function saveProfileImage(
  walletAddress: string,
  profileImageUrl: string | null
): Promise<{ username: string | null; profileImageUrl: string | null }> {
  const res = await fetch(apiUrl("/api/user/profile"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ walletAddress, profileImageUrl }),
  });

  const { ok, data, error } = await readApiJson<{
    error?: string;
    profile?: { username: string | null; profileImageUrl: string | null };
  }>(res);

  if (!ok) throw new Error(error ?? data.error ?? "Failed to save profile");

  return {
    username: data.profile?.username ?? null,
    profileImageUrl: data.profile?.profileImageUrl ?? null,
  };
}
