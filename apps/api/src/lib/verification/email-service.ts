import { createHash, randomInt } from "crypto";
import prisma from "../prisma";

const OTP_EXPIRY_MINUTES = 10;

function hashOtp(otp: string): string {
  const salt = process.env.OTP_SALT ?? "fanspump-dev-otp-salt";
  return createHash("sha256").update(otp + salt).digest("hex");
}

function normalizeWallet(walletAddress: string): string {
  return walletAddress.toLowerCase();
}

export async function generateAndStoreOtp(
  walletAddress: string,
  email: string
): Promise<string> {
  const wallet = normalizeWallet(walletAddress);
  const normalizedEmail = email.trim().toLowerCase();
  const otp = String(randomInt(100000, 999999));
  const hashed = hashOtp(otp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await prisma.walletVerification.upsert({
    where: { walletAddress: wallet },
    create: {
      walletAddress: wallet,
      email: normalizedEmail,
      emailOtp: hashed,
      emailOtpExpiresAt: expiresAt,
    },
    update: {
      email: normalizedEmail,
      emailOtp: hashed,
      emailOtpExpiresAt: expiresAt,
      emailVerified: false,
    },
  });

  return otp;
}

export async function verifyOtp(
  walletAddress: string,
  otp: string
): Promise<{ success: boolean; error?: string }> {
  const wallet = normalizeWallet(walletAddress);
  const record = await prisma.walletVerification.findUnique({
    where: { walletAddress: wallet },
  });

  if (!record?.emailOtp || !record?.emailOtpExpiresAt) {
    return { success: false, error: "No code found. Request a new one." };
  }

  if (new Date() > record.emailOtpExpiresAt) {
    return { success: false, error: "Code expired. Request a new one." };
  }

  if (hashOtp(otp) !== record.emailOtp) {
    return { success: false, error: "Incorrect code. Try again." };
  }

  await prisma.walletVerification.update({
    where: { walletAddress: wallet },
    data: {
      emailVerified: true,
      emailVerifiedAt: new Date(),
      emailOtp: null,
      emailOtpExpiresAt: null,
    },
  });

  return { success: true };
}

export async function sendOtpEmail(email: string, otp: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    console.log(`[verification/email] OTP for ${email}: ${otp}`);
    return;
  }

  const from = process.env.RESEND_FROM ?? "FansPump <noreply@fanspump.xyz>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: email,
      subject: "Your FansPump verification code",
      html: `
        <div style="font-family:monospace;background:#09090b;color:#fafafa;
                    padding:32px;border-radius:12px;max-width:400px;margin:0 auto">
          <p style="color:#a1a1aa;font-size:13px;margin:0 0 12px">FansPump Verification</p>
          <div style="background:#18181b;border-radius:8px;padding:24px;
                      text-align:center;margin-bottom:16px">
            <p style="color:#71717a;font-size:12px;margin:0 0 8px">Your code</p>
            <p style="color:#fafafa;font-size:36px;font-weight:700;
                      letter-spacing:12px;margin:0">${otp}</p>
          </div>
          <p style="color:#52525b;font-size:12px;margin:0">
            Expires in ${OTP_EXPIRY_MINUTES} minutes.
          </p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(body || "Failed to send email");
  }
}
