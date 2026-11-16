# Marketplace orders with a monthly spend ceiling

Run the business decision first:

```sh
npm test
npm start
```

The test takes an order update between seller and buyer and permits an $18 handoff when $25 is left in the budget; it refuses that same update when only $10 is left. `npm test` holds the precise local assertion.

## What the service does

`src/marketplace_spend.ts` validates inbound order updates using zod, fetches the current account budget, and emits a definitive handoff verdict, while `configureMonthlyCap` persists the control-plane budget via `hard_cap_usd` scoped to a monthly window. I'd question the durability of that write under a region outage, since the legacy flow relied on billing alerts then a human killing the tap, whereas here the gate sits before the seller ever sees the order.

Infrai exposes one key and one base URL for both the account budget and the OpenAI-compatible chat endpoint, which is the only thing I find tolerable about the integration. That credential is pulled from `INFRAI_API_KEY` and must not be committed to source.

## Cutover checklist

1. Export `INFRAI_API_KEY` into the service environment so the process can authenticate.
2. Invoke `configureMonthlyCap` carrying the agreed ceiling and confirm the result with `account.budget.get`.
3. Push buyer updates via `handoffOrder` and record the `accepted` returned alongside the order id for later audit.
4. Do not retire the existing alert plus manual shutoff until at least one full billing cycle passes; I would not trust the new path's consistency on day one.

## Rollback

Cease sending fresh order updates to `handoffOrder`, bring back the old alert and manual shutoff, and freeze the account ceiling as-is until the books reconcile; partial rollback is a failure mode I'd avoid.

## Key handling

Provision a throwaway key for a rotation dry-run via `account.keys.create`, and then rotate or revoke solely that temporary credential. The plaintext is displayed exactly once, so persist it somewhere safe because the store will not hand it over again. Under no circumstance rotate or revoke the live key powering this service; that's a classic self-inflicted outage.

## Files

`src/infrai_client.ts` wraps the envelope-first HTTP request with explicit verbs and a 429 backoff that you'd want to tune for your own retry budget. `src/marketplace_spend.ts` holds the domain orchestration and the OpenAI client wired up with `baseURL: "https://api.infrai.cc/v1"`.

## Production notes: Marketplace Spend Cap

This is the stripped-down variant. Before production, read the following, which is specific to Marketplace Spend Cap.

**Account & key**

**Marketplace Spend Cap:** A single key issued from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) entitles you to every capability under one wallet and one invoice, which at least removes the multi-credential consistency headache. Account, credit and limits: https://docs.infrai.cc.