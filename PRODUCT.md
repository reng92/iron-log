# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

(React SPA deployed on Vercel and wrapped with Capacitor for Android. The Android build is the primary daily surface; the web build must keep working. Android adds local notifications and a home-screen widget, but the UI itself is web.)

## Users

One person: the developer-owner (Renato), who trains in the gym and follows a structured meal plan from a nutritionist. The redesign targets this single user; multi-user is not a design goal right now (data isolation work is tracked separately).

Usage scene: phone in hand, often mid-workout between sets (sweaty, quick taps, glanceable), at home logging meals and water, in the evening preparing tomorrow's food.

## Product Purpose

A personal training and nutrition log in one app: workout plans and live session logging, diet plans with per-day meals (gym vs rest days), food diary, shopping list, water tracking, body weight and body measurements, progress stats. Success = the user opens it every day and logs without friction, and it tells him what to do today.

## Positioning

Built around his actual plan: the nutritionist's meal plan (gym/rest days, alternatives, notes), his workout schedules and his own targets drive every screen. It answers "what do I do / eat / drink today" rather than being a generic tracker.

## Operating Context

- Gym: live workout session with sets, kg, reps, rest timer, previous-session comparison.
- Daily: log meals from the plan, water (750 ml bottle, ~2 L target, +500 ml on gym days), check kcal against plan target.
- Evening: 21:00 meal-prep reminder for tomorrow's lunch; shopping list from plan.
- Periodic: weigh-ins, body measurements / bioimpedance, PDF export of history.
- Android widget for water + kcal; local notifications (daily reminder, water, meal prep).

## Capabilities and Constraints

- Stack: React 18 (CRA), no TypeScript, Supabase (auth + JSON rows), Capacitor 8 Android, Groq for AI features, jsPDF.
- UI language: Italian.
- Currently one large `src/App.jsx` with inline styles and a global CSS string in `src/constants.js`; the redesign may split it into files per screen and introduce tokens.
- Navigation decision (confirmed): 5 tabs: Oggi · Allena (schede, log, stats) · Dieta (piani, diario, spesa, acqua) · Corpo (peso, misure) · Io (profilo, notifiche, tema).
- Home "Oggi" must contain (confirmed): today's workout or rest day; kcal + water + protein meters with quick water add; next meal from the plan with "mark eaten"; week strip (trained / diet / water) + weight with 7-day trend.
- Must keep dark and light themes working.

## Brand Commitments

Name "Iron Log". The user asked for a new visual identity: the current look (near-black, #1E90FF blue, Bebas Neue all-caps, Barlow) is not binding.

## Evidence on Hand

Real personal data in Supabase (sessions, plans, weights, measurements). No logo assets beyond the Capacitor launcher icon. No testimonials or external claims; none should be invented.

## Product Principles

1. Today first: every screen answers what to do now before showing history.
2. One-thumb, mid-set usable: big targets, glanceable numbers, minimal typing.
3. The plan is the source of truth: targets, meals and day type come from his plan, not generic defaults.
4. Logging must take seconds; anything slower gets a shortcut (widget, notification action, quick add).
