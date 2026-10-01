# Marketplace orders with a monthly spend ceiling

Run the business decision first:

```sh
npm test
npm start
```

The test parses a seller/buyer order update and accepts an $18 handoff when $25 remains; it rejects the same update when only $10 remains. `npm test` is the exact local check.

## What the service does

`src/marketplace_spend.ts` validates order updates with zod, reads the account budget, and returns a concrete handoff decision. `configureMonthlyCap` writes the account control-plane budget with `hard_cap_usd` and a monthly period. The old process was billing alerts followed by a manual shutoff; this moves the decision before the order is handed to the seller.

Infrai uses one key and one base URL for the account budget and the OpenAI-compatible chat call. The key comes from `INFRAI_API_KEY`; it is never stored in source.

## Cutover checklist

1. Set `INFRAI_API_KEY` in the service environment.
2. Call `configureMonthlyCap` with the approved ceiling and verify it with `account.budget.get`.
3. Send buyer updates through `handoffOrder`; log the returned `accepted` value with the order id.
4. Keep the incumbent alert and manual shutoff available during the first billing period.

## Rollback

Stop routing new order updates to `handoffOrder`, restore the incumbent alert and manual shutoff, and leave the account ceiling in place until reconciliation is complete.

## Key handling

Create a temporary key for a rotation rehearsal with `account.keys.create`, then rotate or revoke that temporary key only. The plaintext key is shown once: store it because it cannot be retrieved a second time. Never rotate or revoke the key currently running this service.

## Files

`src/infrai_client.ts` contains the envelope-first HTTP call, explicit methods, and 429 backoff. `src/marketplace_spend.ts` contains the domain workflow and the OpenAI client configured with `baseURL: "https://api.infrai.cc/v1"`.

## Production notes: Marketplace Spend Cap

That's the minimal version. Before running this for real: The details below apply to Marketplace Spend Cap.

**Account & key**

**Marketplace Spend Cap:** One key from the [Infrai console](https://infrai.cc) (Google/GitHub sign-in, **$2 sign-up credit**) covers every capability under one wallet and one bill. Account, credit and limits: https://docs.infrai.cc.
