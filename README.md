# HairMate (iPhone app)

The stylist's app for Ryan Kennedy Hairdressing: today's appointments, clients, create, cancel and
no-show on the fly, mark balances paid, and (next) Tap to Pay and push notifications.

It is a client of the staff API in [booking-engine](https://github.com/gloverthomas/booking-engine)
(`docs/API.md` there). There is no business logic here: permissions, pricing, availability and the
cancellation policy all live on the server, so the app and the web admin can never disagree.

## What works

| Area | State |
| --- | --- |
| Google sign-in, session in the iOS Keychain, sign out, automatic return to sign-in when the server ends a session | Built |
| Today: day-by-day list, stylists' colours (owner and reception), blocks, pull to refresh | Built |
| Appointment: details, money, call or text the client, cancel (with the deposit decision), no-show, mark paid (cash, EFTPOS, other) | Built |
| New appointment: find or add a client, services, stylist, day, live availability, tell the client or not | Built |
| Clients: search and profile with history | Built |
| Tap to Pay on iPhone | Not yet (needs the Apple entitlement and Stripe Terminal location) |
| Push notifications | Not yet |
| Reschedule, roster, clock in and out | Not yet |

## Run it

```bash
npm install
cp .env.example .env.local     # set EXPO_PUBLIC_API_URL at least
npm run check                  # types, lint, tests
npx expo start
```

The app uses native modules (Google Sign-In, Keychain), so it needs a **development build**, not Expo Go:

```bash
npx eas-cli@latest build --profile development-simulator --platform ios   # simulator
npx eas-cli@latest build --profile development --platform ios             # a registered iPhone
```

Until the Google iOS client exists, set `EXPO_PUBLIC_DEV_SIGN_IN=1` in a development build to get a
"paste a session token" box on the sign-in screen (never shown in release builds).

## How sign-in works

1. The app asks Google for an ID token (native sign-in, no password anywhere).
2. `POST /api/v1/auth/google` verifies it against the web **and** iOS client ids, applies the same
   allow-list as the web admin (`OWNER_EMAILS` plus active staff emails) and returns a bearer token.
3. The token is stored with `expo-secure-store` (Keychain, after first unlock, this device only) and sent
   as `Authorization: Bearer ...`. A 401 on any later call ends the session and returns to sign-in, so
   removing someone from the team locks them out of the app at their next request.

## Layout

```
src/app/            Expo Router screens (sign-in, (app)/(tabs), booking/[id], booking/new, client/[id])
src/lib/api/        typed client, zod response schemas, endpoint functions
src/lib/auth/       session provider, Keychain store, Google sign-in
src/lib/            format, new-booking step logic, status labels
src/components/     ui kit (palette matches the web admin) and screen pieces
__tests__/          unit and component tests
```

Responses are validated at runtime (`src/lib/api/schemas.ts`). If the server and app drift apart you get a
clear "update the app" message, never a crash three screens deep.

## What it needs before a real build

- Apple Developer Program account in Ryan's name; bundle id `world.hairmate.app` is a placeholder
- Google Cloud OAuth client of type iOS for that bundle id, set as `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` here
  and `GOOGLE_IOS_CLIENT_ID` on the server
- `EXPO_PUBLIC_API_URL` pointing at the deployed web service
- For Tap to Pay: Apple's Tap to Pay on iPhone entitlement and a Stripe Terminal Location (see
  `docs/MOBILE.md` in booking-engine)
