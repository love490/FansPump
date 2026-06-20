type ZodFlatten = {
  formErrors?: string[];
  fieldErrors?: Record<string, string[] | undefined>;
};

function isZodFlatten(value: unknown): value is ZodFlatten {
  return (
    typeof value === "object" &&
    value !== null &&
    ("fieldErrors" in value || "formErrors" in value)
  );
}

/** Turn admin API error payloads (string or Zod flatten) into readable text. */
export function formatAdminApiError(data: unknown, fallback = "Request failed"): string {
  if (typeof data === "string" && data.trim()) return data;

  if (typeof data === "object" && data !== null) {
    const err = (data as { error?: unknown }).error;
    if (typeof err === "string" && err.trim()) return err;
    if (isZodFlatten(err)) {
      const parts: string[] = [];
      for (const [field, messages] of Object.entries(err.fieldErrors ?? {})) {
        for (const msg of messages ?? []) {
          parts.push(`${field}: ${msg}`);
        }
      }
      for (const msg of err.formErrors ?? []) {
        parts.push(msg);
      }
      if (parts.length) return parts.join("; ");
    }
  }

  return fallback;
}
