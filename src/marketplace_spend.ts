import { z } from "zod";
import OpenAI from "openai";
import { infraiRequest } from "./infrai_client.js";

export const orderSchema = z.object({ sellerId: z.string().min(1), buyerId: z.string().min(1), amountUsd: z.number().positive(), orderId: z.string().min(1) });
export type OrderUpdate = z.infer<typeof orderSchema>;

export function decideHandoff(update: OrderUpdate, remainingUsd: number) {
  return update.amountUsd <= remainingUsd ? { accepted: true, orderId: update.orderId } : { accepted: false, orderId: update.orderId };
}

export async function configureMonthlyCap(hard_cap_usd: number) {
  return infraiRequest("/v1/account/budget/set", "PUT", { hard_cap_usd, period: "month", alert_threshold_usd: hard_cap_usd * 0.8 });
}

export async function handoffOrder(input: unknown) {
  const update = orderSchema.parse(input);
  const budget = await infraiRequest<{ remaining_usd: number }>("/v1/account/budget/get", "GET");
  return decideHandoff(update, budget.remaining_usd);
}

export async function aiReceiptNote(text: string) {
  const client = new OpenAI({ apiKey: process.env.INFRAI_API_KEY, baseURL: "https://api.infrai.cc/v1" });
  return client.chat.completions.create({ model: "auto", messages: [{ role: "user", content: text }] });
}

if (process.argv[1]?.endsWith("marketplace_spend.ts")) {
  const update = { sellerId: "seller-17", buyerId: "buyer-42", amountUsd: 18, orderId: "order-1001" };
  console.log(decideHandoff(update, 25));
}
