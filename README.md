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
| Tap to Pay on iPhone: take the balance by card, server-recorded, appointment closes itself | Built; **untested on a device** (needs Apple's entitlement and a Stripe Terminal location, see below) |
| Push notifications: new client booking and client cancellation to the stylist and owners; tap opens the appointment; sign-out stops them; Account shows the state | Built; **untested on a device** (needs an EAS project id, see below) |
| Roster: who is working when, week by week (a stylist sees their own) | Built |
| Clock in and out, with the location and an unpaid break; elapsed time from the server's clock | Built |
| Reschedule, waitlist | Not yet |

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

## Tap to Pay

The flow is `src/lib/payments/tap-to-pay.ts` (tested with a fake reader) behind a thin adapter over the
Stripe Terminal SDK (`use-terminal.ts`). The server decides the amount, creates the payment record, and
its Stripe webhook records the money and completes the appointment, so a dropped connection after the tap
cannot leave it open. If the server is slow to record it the app says "Payment taken, still being
recorded" and never invites a second charge.

- **Without Apple's entitlement** a real tap cannot work. Set `EXPO_PUBLIC_SIMULATED_READER=1` in a
  development build to use Stripe's simulated reader (iOS Simulator, Stripe test keys).
- **Once Apple grants the entitlement**, build with `TAP_TO_PAY_ENTITLED=1`. It is off by default because
  declaring an entitlement the provisioning profile lacks makes the build fail to sign.
- The server needs `STRIPE_TERMINAL_LOCATION_ID` and in-person payments enabled on the Stripe account.

## Push notifications

On sign-in the app asks iOS for permission (once, in context), gets an Expo push token and registers it
with `POST /api/v1/devices`; sign-out removes it. The server sends through Expo's push service, so we never
handle Apple push certificates ourselves: EAS manages them when you build.

- Needs an **EAS project id**: run `npx eas-cli@latest init` once (it writes `extra.eas.projectId`). Until
  then registration is skipped quietly and the Account screen simply shows notifications as off.
- Push does not work in the iOS Simulator; test on a real iPhone with a development build.
- The notification text is the client's first name, the services and the time, never contact details.

## What it needs before a real build

- An Expo account and `eas init` (push and builds)
- Apple Developer Program account in Ryan's name; bundle id `world.hairmate.app` is a placeholder
- Google Cloud OAuth client of type iOS for that bundle id, set as `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` here
  and `GOOGLE_IOS_CLIENT_ID` on the server
- `EXPO_PUBLIC_API_URL` pointing at the deployed web service
- For Tap to Pay: Apple's Tap to Pay on iPhone entitlement and a Stripe Terminal Location (see
  `docs/MOBILE.md` in booking-engine)
