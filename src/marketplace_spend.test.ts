import assert from "node:assert/strict";
import { decideHandoff, orderSchema } from "./marketplace_spend.js";

const update = orderSchema.parse({ sellerId: "seller-17", buyerId: "buyer-42", amountUsd: 18, orderId: "order-1001" });
assert.deepEqual(decideHandoff(update, 25), { accepted: true, orderId: "order-1001" });
assert.deepEqual(decideHandoff(update, 10), { accepted: false, orderId: "order-1001" });
console.log("handoff decision test passed");
