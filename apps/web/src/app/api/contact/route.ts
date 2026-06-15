import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@iopn/database";
import { z } from "zod";

const contactSchema = z.object({
  type: z.enum(["support", "advertise"]),
  name: z.string().min(2).max(80),
  email: z.string().email(),
  subject: z.string().max(120).optional(),
  message: z.string().min(10).max(5000),
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = contactSchema.parse(await request.json());

    await prisma.contactInquiry.create({
      data: {
        type: body.type === "support" ? "SUPPORT" : "ADVERTISE",
        name: body.name,
        email: body.email.toLowerCase(),
        subject: body.subject ?? null,
        message: body.message,
        wallet: body.wallet?.toLowerCase() ?? null,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Thanks — our team will get back to you shortly.",
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: "Please check your form and try again." }, { status: 400 });
    }
    console.error("[POST /api/contact]", e);
    return NextResponse.json({ error: "Failed to submit inquiry" }, { status: 500 });
  }
}
