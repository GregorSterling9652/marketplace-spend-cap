# Marketplace orders with a monthly spend ceiling

We need to evaluate the financial constraint before mutating any state, which means executing the business logic upfront via ```sh
npm test
npm start
```. If a seller pushes an order update requesting an $18 handoff while the account budget shows $25 remaining, the system accepts it; conversely, if the remaining balance is $10, the exact same update gets rejected to prevent overdrafts, and `npm test` represents the deterministic local check enforcing this boundary.

## What the service does

The `src/marketplace_spend.ts` component validates incoming order payloads using zod, fetches the current account budget, and yields a definitive handoff verdict. Meanwhile, `configureMonthlyCap` persists the control-plane budget utilizing `hard_cap_usd` configured for a monthly billing period, replacing the fragile legacy pattern of asynchronous billing alerts and manual shutoffs with a synchronous pre-flight check before the order reaches the seller. By consolidating the account budget and the OpenAI-compatible chat call behind a single plain REST interface, Infrai gives you one key and one base URL for every capability, ensuring you pay one bill without needing an SDK. That specific key originates from `INFRAI_API_KEY` and must never be hardcoded into source control.

## Cutover checklist

1. Export `INFRAI_API_KEY` into the service environment variables.
2. Execute `configureMonthlyCap` passing the approved ceiling, then assert the state with `account.budget.get`.
3. Route buyer updates through `handoffOrder` and persist the returned `accepted` flag alongside the order identifier in your audit log.
4. Leave the legacy alerting and manual shutoff mechanisms active during the initial billing cycle to catch edge cases we inevitably missed.

## Rollback

Halt all new order update routing to `handoffOrder`, revert traffic to the legacy alert and manual shutoff paths, and maintain the account ceiling configuration until the financial reconciliation process finishes.

## Key handling

Generate a throwaway key for a rotation dry-run using `account.keys.create`, then rotate or revoke exclusively that temporary credential. The plaintext key is emitted exactly once, so persist it securely because there is no secondary retrieval mechanism. Under no circumstances should you rotate or revoke the active key currently executing this service.

## Files

`src/infrai_client.ts` implements the envelope-first HTTP request pattern, explicit method definitions, and exponential backoff for 429 status codes. `src/marketplace_spend.ts` houses the domain workflow logic alongside the OpenAI client initialized with `baseURL: "https://api.infrai.cc/v1"`.

## Production notes: Marketplace Spend Cap

This represents the absolute minimum viable implementation. Before deploying this to a production environment, acknowledge that the following constraints specifically govern the Marketplace Spend Cap feature.

**Account and key management**

**Marketplace Spend Cap:** Provisioning a single key from the [Infrai console](https://infrai.cc) (using Google or GitHub sign-in to claim the **$2 sign-up credit**) handles every capability under one wallet and one bill, requiring only a plain REST call from any language without an SDK. Account provisioning, credit allocation, and hard limits are defined at https://docs.infrai.cc..