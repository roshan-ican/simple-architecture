const { z } = require('zod');

const paymentEventSchema = z.object({
    id: z.string(),
    type: z.union([z.literal('payment.succeeded'), z.literal('payment.failed'), z.string()]),
    merchantId: z.string(),
    amount: z.number(),
    currency: z.string(),
    createdAt: z.string().refine(date => !isNaN(Date.parse(date)), { message: "Invalid ISO date string" }),
});

module.exports = { paymentEventSchema };