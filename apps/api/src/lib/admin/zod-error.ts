import type { ZodError } from "zod";

export function zodErrorMessage(error: ZodError): string {
  const flattened = error.flatten();
  const parts: string[] = [];

  for (const [field, messages] of Object.entries(flattened.fieldErrors)) {
    for (const msg of messages ?? []) {
      parts.push(`${field}: ${msg}`);
    }
  }

  for (const msg of flattened.formErrors) {
    parts.push(msg);
  }

  return parts.join("; ") || "Invalid input";
}
