import { Router } from "express";
import { z } from "zod";
import prisma from "../lib/prisma";
import { asyncHandler } from "../lib/http-helpers";
import { publicRateLimit } from "../middleware/rateLimit";

const contactSchema = z.object({
  type: z.enum(["support", "advertise"]),
  name: z.string().min(2).max(80),
  email: z.string().email(),
  subject: z.string().max(120).optional(),
  message: z.string().min(10).max(5000),
  wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
});

const router = Router();

router.use(publicRateLimit);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    try {
      const body = contactSchema.parse(req.body);

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

      res.json({
        ok: true,
        message: "Thanks — our team will get back to you shortly.",
      });
    } catch (e) {
      if (e instanceof z.ZodError) {
        res.status(400).json({ error: "Please check your form and try again." });
        return;
      }
      console.error("[POST /api/contact]", e);
      res.status(500).json({ error: "Failed to submit inquiry" });
    }
  })
);

export default router;

