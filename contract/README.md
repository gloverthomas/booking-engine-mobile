# API contract

`openapi.json` is a copy of `docs/openapi.json` from the booking-engine repo, which generates it from the
server's own schemas. Refresh it with `npm run contract:sync` (expects the two repos side by side), then run
`npm test`: `__tests__/contract.test.ts` fails if the app calls an endpoint the server no longer documents.
