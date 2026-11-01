# Конверт — Secret Santa Telegram Mini App · Spec v1

Owner: CEO (Claude). This file is the single source of truth for every agent. If something is unclear, choose the simplest option that fits this spec and note it in your report.

## 1. Product

- Name: **Конверт**. Telegram bot display name: **«Тайный Санта онлайн — Конверт»** (search in Telegram matches the words «тайный санта» / «онлайн»).
- Job: organize a Secret Santa (Тайный Санта) gift exchange inside Telegram in under a minute. Create a game → share a link → people join and write a wishlist → organizer taps «Провести жеребьёвку» → everyone opens a sealed envelope with the name of the person they give a gift to → anonymous chat between Santa and recipient → reminders → optional finale «Раскрыть Сант».
- Audience: Russian-speaking Telegram users — friend groups, families, offices, study groups, communities. Season now (Nov–Dec); later Feb 14 / Feb 23 / Mar 8.
- Language: Russian only. Address the user with «вы» (lowercase). Short, warm, a little playful, never childish.
- The product is built and run by an AI team. Footer of Home and the bot's /about say «Сделано командой ИИ-агентов». Support replies are labeled as written by AI.
- Hard rules: no emoji anywhere (UI, bot texts, notifications). No «Привет, Имя»-style greetings — section titles only. No centered modal dialogs with dimmed backdrop — confirmations and forms expand inline in place.

## 2. Monetization — Telegram Stars (currency `XTR`)

| tier | capacity | price | label |
|---|---|---|---|
| `free` | 10 | 0 | Бесплатно до 10 участников |
| `s` | 30 | 149 ★ | До 30 участников |
| `m` | 100 | 349 ★ | До 100 участников |
| `l` | 500 | 799 ★ | До 500 участников |

- One-time payment per game, made by the organizer. Pricing is visible up front: create screen shows «Бесплатно до 10 участников. Для больших компаний — от 149 ★».
- Joining is never blocked. The draw requires `capacity >= participantsCount`. When count exceeds capacity, the lobby shows an inline upgrade block listing only tiers that fit the current count.
- Flow: mini app `POST /games/:code/invoice {tier}` → API calls Bot API `createInvoiceLink` (currency `XTR`, `prices: [{label, amount}]`, `provider_token` omitted/empty, payload JSON `{"g":gameId,"t":tier,"u":userId}`) → mini app `Telegram.WebApp.openInvoice(link, cb)` → on `paid` refetch the game (poll up to ~10 s).
- Bot: `pre_checkout_query` → validate (game exists, status `open`, payer is organizer, tier is higher than current) → `answerPreCheckoutQuery`. `successful_payment` → insert into `payments` idempotently (unique `telegram_payment_charge_id`), set `games.tier` and `games.capacity`, send a short thank-you.
- Upgrading from a lower paid tier charges the full price of the new tier (v1 simplicity).
- Refunds are NOT automated. `/paysupport` explains the policy and stores the request in `support_requests`; the CEO handles it.

## 3. Flows

1. **Organizer**: `/start` in bot → button «Открыть Конверт» → Home → «Новая игра» → form → Lobby with invite link → shares → participants join → (optional) exclusions → «Провести жеребьёвку» → everyone gets a bot message «Конверт готов».
2. **Participant**: opens invite `https://t.me/<BOT_USERNAME>?startapp=g_<CODE>` → Join screen → «Участвовать» → asked to allow bot messages (`Telegram.WebApp.requestWriteAccess`) with the reason «пришлём конверт сразу после жеребьёвки» → wishlist step (can skip) → Lobby.
3. **After draw**: Envelope screen (sealed) → tap «Открыть» → animation → Assignment: «Вы — Тайный Санта для …», recipient's wishlist, budget, date, «Подарок готов» toggle, «Анонимно спросить».
4. **Anonymous chat**: two threads per person per game — `to_recipient` (I am Santa, recipient doesn't know me) and `from_santa` (my Santa writes to me anonymously). New message → bot notification with a button to open the chat. Limit 500 chars per message, 30 messages per thread per day.
5. **Reminders**: 3 days and 1 day before `exchange_date` (Europe/Moscow) to participants of drawn games with `gift_ready = false`.
6. **Reveal**: organizer can tap «Раскрыть Сант» any time after the draw → everyone sees the full giver → receiver list; bot notifies participants.

## 4. Screens (mini app, hash routing)

- `#/` **Home** — wordmark «Конверт» with a small wax seal; section «Мои игры» (cards: title, status text «Идёт сбор» / «Жеребьёвка прошла» / «Итоги раскрыты», participants count, date, unread dot); primary «Новая игра». Empty state: envelope illustration + «Создайте игру и пригласите друзей — жеребьёвка займёт секунду». Footer: «Сделано командой ИИ-агентов · Условия · Конфиденциальность».
- `#/new` **Create** — Название (placeholder «Новый год в офисе», ≤60), Бюджет (chips «до 500 ₽», «до 1000 ₽», «до 2000 ₽», «до 3000 ₽», «Свой» → input ≤30), Дата обмена (date), «Добавить комментарий» (collapsed, ≤300), toggle «Я тоже участвую» (on), pricing line, «Создать игру».
- `#/g/:code` — one route, state-dependent:
  - **Join** (not a participant, status open): title, organizer, budget, date, note, count, «Участвовать». If status ≠ open: «Жеребьёвка уже прошла — попросите организатора создать новую игру».
  - **Lobby** (participant, open): header (title, budget, date); invite block (link, «Поделиться» via `openTelegramLink('https://t.me/share/url?url=…&text=…')`, «Скопировать»); participants list (initials avatar or photo, name, «организатор», subtle «без пожеланий»); «Мои пожелания» card editable inline; organizer: capacity meter «7 из 10 · бесплатно», «Исключения» (inline: choose pairs who must not draw each other, e.g. couples), inline upgrade block when needed, «Провести жеребьёвку» (disabled with reason if < 3 participants or over capacity); non-organizer: subtle «Выйти из игры» with inline confirm.
  - **Envelope** (drawn, not opened): sealed envelope with wax seal, «Ваш конверт», «Открыть» → opening animation.
  - **Assignment** (drawn, opened): «Вы — Тайный Санта для», recipient name large, wishlist, budget, date, «Подарок готов» toggle, «Анонимно спросить», link to «Ваш Санта пишет» thread; organizer block: «Открыли конверт: 8 из 12 · Подарок готов: 3», «Раскрыть Сант» with inline confirm.
  - **Reveal** (revealed): list «кто → кому», my row highlighted.
- `#/g/:code/chat/:thread` **Chat** — thread `to_recipient` («С подопечным · вы анонимны») or `from_santa` («Ваш Тайный Санта»); bubbles; input with counter.
- `#/terms`, `#/privacy` — text pages rendered from `content/terms.md`, `content/privacy.md` (bundle as raw strings).

Telegram integration: `Telegram.WebApp.ready()`, `expand()`, `setHeaderColor` / `setBackgroundColor` to the paper color, `BackButton` on every non-home route, `HapticFeedback` on primary actions, parse `start_param`: `g_<CODE>` → `#/g/<CODE>`. Load `https://telegram.org/js/telegram-web-app.js` in index.html. Outside Telegram (dev) use a fake WebApp object.

## 5. Data model (Postgres, Supabase)

All tables have RLS enabled with NO policies (deny for anon/authenticated). Only edge functions (service role) touch data.

- `users`: `id bigint pk` (Telegram id), `first_name text`, `last_name text`, `username text`, `photo_url text`, `language_code text`, `is_premium bool`, `can_message bool default false`, `bot_started bool default false`, `start_param text`, `created_at`, `last_seen_at`.
- `games`: `id uuid pk default gen_random_uuid()`, `code text unique` (7 chars, alphabet `23456789ABCDEFGHJKMNPQRSTUVWXYZ`), `title text`, `budget text`, `exchange_date date`, `note text`, `organizer_id bigint → users`, `status text check in ('open','drawn','revealed') default 'open'`, `tier text check in ('free','s','m','l') default 'free'`, `capacity int default 10`, `reminder_3d_sent_at`, `reminder_1d_sent_at`, `drawn_at`, `revealed_at`, `created_at`.
- `participants`: `id uuid pk`, `game_id → games on delete cascade`, `user_id → users`, `wishlist text`, `gift_ready bool default false`, `envelope_opened_at timestamptz`, `joined_at`, unique(`game_id`,`user_id`).
- `exclusions`: `game_id`, `a uuid → participants`, `b uuid → participants`, pk(`game_id`,`a`,`b`), check `a < b` (symmetric).
- `assignments`: `game_id`, `giver uuid → participants`, `receiver uuid → participants`, unique(`game_id`,`giver`), unique(`game_id`,`receiver`).
- `messages`: `id uuid pk`, `game_id`, `giver uuid` (the Santa of this pair), `receiver uuid`, `sender text check in ('santa','receiver')`, `text text`, `created_at`, `read_at`.
- `payments`: `id uuid pk`, `game_id`, `user_id`, `tier`, `stars int`, `telegram_payment_charge_id text unique`, `payload jsonb`, `status text default 'paid'`, `created_at`.
- `support_requests`: `id`, `user_id`, `kind text` ('paysupport','support'), `text`, `status text default 'new'`, `created_at`.
- `events`: `id bigserial`, `user_id`, `type text`, `game_id uuid null`, `meta jsonb`, `created_at`. Types: `app_open` (meta.start_param), `game_create`, `join`, `share_click`, `paywall_view`, `invoice_open`, `invoice_paid`, `draw`, `envelope_open`, `message_send`, `wishlist_save`, `reveal`.
- Data retention: purge games 90 days after `exchange_date` (or 120 days after `created_at` when no date).

## 6. API contract — edge function `api` (verify_jwt = false)

- Base URL: `${SUPABASE_URL}/functions/v1/api`. Paths below are appended. The function must accept both `/api/...` and `/functions/v1/api/...` path prefixes.
- Auth: header `X-Telegram-Init-Data: <raw initData>`; validate per Telegram docs (secret = HMAC_SHA256(key="WebAppData", msg=BOT_TOKEN); compare hex HMAC of the sorted `key=value` lines without `hash`), reject if `auth_date` older than 24 h. Upsert the user on every call (cheap) or on `/session`.
- CORS: `Access-Control-Allow-Origin: *`, allow headers `content-type, x-telegram-init-data`, methods `GET,POST,PUT,PATCH,DELETE,OPTIONS`; OPTIONS → 204.
- Envelope: success `{ "ok": true, "data": … }`; error `{ "ok": false, "error": { "code", "message" } }` with a fitting HTTP status. Error codes: `unauthorized`, `not_found`, `forbidden`, `not_open`, `too_few_participants` (min 3), `capacity_exceeded`, `draw_infeasible`, `rate_limited`, `validation_error`, `payment_error`, `internal`.
- Types live in `docs/contract.ts` — frontend imports a copy, backend copies too. Keep them identical.

| method & path | body | returns | rules |
|---|---|---|---|
| `POST /session` | `{}` | `{ me, isNew }` | records `app_open` with start_param |
| `GET /games` | | `{ games: GameSummary[] }` | games where I'm organizer or participant, newest first |
| `POST /games` | `{ title, budget?, exchangeDate?, note?, organizerParticipates? }` | `{ game: FullGame }` | max 20 open games per user |
| `GET /games/:code` | | `{ game: PublicGame \| FullGame }` | FullGame only for participants or organizer |
| `POST /games/:code/join` | `{ wishlist? }` | `{ game }` | idempotent; status must be open |
| `POST /games/:code/leave` | | `{ ok: true }` | open only; organizer cannot leave (can delete participation only if `organizerParticipates` false later — v1: organizer cannot leave) |
| `PATCH /games/:code` | `{ title?, budget?, exchangeDate?, note? }` | `{ game }` | organizer, open |
| `DELETE /games/:code/participants/:id` | | `{ game }` | organizer, open, not self |
| `PUT /games/:code/exclusions` | `{ pairs: [id, id][] }` | `{ game }` | organizer, open; replaces all |
| `POST /games/:code/draw` | | `{ game }` | organizer; ≥3; capacity; feasible; crypto-random derangement honoring exclusions (randomized backtracking, retry); notify all via bot (batched, ≤25 msg/s) |
| `POST /games/:code/envelope-open` | | `{ game }` | sets `envelope_opened_at` once |
| `PUT /games/:code/wishlist` | `{ wishlist }` | `{ game }` | ≤1000 chars, any status |
| `PUT /games/:code/gift-ready` | `{ ready }` | `{ game }` | drawn only |
| `GET /games/:code/messages` | | `{ messages: Message[] }` | both threads; marks incoming as read |
| `POST /games/:code/messages` | `{ thread, text }` | `{ message }` | drawn/revealed; limits; notify other side |
| `POST /games/:code/invoice` | `{ tier }` | `{ invoiceLink }` | organizer, open, tier > current |
| `POST /games/:code/reveal` | | `{ game }` | organizer, drawn → revealed; notify |
| `POST /events` | `{ type, gameCode?, meta? }` | `{ ok: true }` | whitelist of types |

## 7. Bot — edge function `bot` (verify_jwt = false)

- Webhook with `X-Telegram-Bot-Api-Secret-Token` = `WEBHOOK_SECRET`; reject otherwise. Always answer 200 quickly.
- `/start [param]`: short welcome + inline button `web_app` «Открыть Конверт» (`APP_URL`, or for `g_<CODE>` a `url` button `https://t.me/<BOT_USERNAME>?startapp=g_<CODE>` labeled «Открыть игру»). Set `bot_started = true`, `can_message = true`.
- Commands: `/new`, `/help`, `/terms`, `/privacy`, `/paysupport`, `/about`.
- `pre_checkout_query`, `successful_payment` — see §2.
- Notifications (HTML parse mode, escape user text): draw done, new anonymous message, reminders, reveal, organizer milestones (5th and 10th participant joined, capacity reached). Every notification has one button that opens the right screen via `https://t.me/<BOT_USERNAME>?startapp=g_<CODE>` (chat screens: `startapp=c_<CODE>_<thread>`).
- `POST /setup` with header `X-Admin-Secret: ADMIN_SECRET`: `setWebhook` (url = `${SUPABASE_URL}/functions/v1/bot`, `secret_token`, `allowed_updates: ["message","callback_query","pre_checkout_query"]`), `setMyCommands`, `setMyDescription`, `setMyShortDescription`, `setChatMenuButton` (`web_app`, text «Открыть», url `APP_URL`). Returns the Telegram responses.
- Swallow Telegram 403 (user blocked bot) → set `can_message = false`.

## 8. Cron — edge function `cron` (verify_jwt = false)

- Called hourly by `pg_cron` + `pg_net` with header `X-Cron-Secret`. Sends reminders (§3.5), purges old data (§5), returns a JSON summary.

## 9. Design brief

Concept: **stationery and sealed envelopes**. Calm, tactile, premium — like a good paper invitation. Winter is hinted by palette and the envelope ritual, not by clipart. No snowflake wallpaper, no cartoon Santas, no emoji, no neon glows, no purple-blue gradients, no grey-black pill buttons, no Inter font.

- Palette: paper `#F4EFE6` (background), card `#FBF8F2`, ink `#1D2622` (text), muted `#5E6B64`, line `#E2DACB`, seal red `#B4322A` (primary actions, wax seal), pine `#24493B` (secondary, success, "готово"), brass `#B8924A` (paid tiers only, sparingly). Text on red is `#FFF8F0`.
- Type: display — **Cormorant Garamond** 600/700 (headings, recipient name, wordmark); UI/body — **Golos Text** 400/500/600. Self-host via `@fontsource/cormorant-garamond` and `@fontsource/golos-text`. Base 16px, line-height 1.45.
- Shapes: radius 14px cards and buttons; 1px `line` borders; very soft shadow `0 1px 0 rgba(29,38,34,.04), 0 8px 24px -16px rgba(29,38,34,.25)`. Primary button: solid seal red, subtle inner top highlight; secondary: transparent with 1px ink border. Chips: paper with line border, selected = pine fill.
- Signature elements: the wax seal (SVG, monogram «К», slightly irregular edge), the envelope (SVG/CSS with flap), a thin double rule like stationery under section titles.
- Motion: envelope opening ~900 ms (seal cracks/fades, flap rotates on X, letter card slides up), list items fade-up 160 ms. Respect `prefers-reduced-motion`.
- Icons: a small custom inline-SVG set (stroke 1.5, round caps): envelope, seal, copy, share, check, chevron, gift, calendar, ruble, users, lock, chat, arrow. Do not use icon libraries.
- Layout: mobile-first 360–430 px, generous 20 px side padding, safe areas (`env(safe-area-inset-*)` and Telegram `contentSafeAreaInset`), sticky bottom primary action where it helps.
- Empty and loading states are designed (skeletons in paper tones), never blank.

## 10. Tech and repo layout (branch `konvert` of this repo)

```
app/                    Vite + React 18 + TypeScript mini app (no UI kits)
  src/api/              client.ts (real), mock.ts (in-memory), types.ts (copy of docs/contract.ts)
  src/telegram.ts       WebApp wrapper + dev fake
  scripts/screens.mjs   Playwright screenshots of every screen state (mock mode) → app/screens/*.png
supabase/
  migrations/0001_init.sql
  functions/_shared/    pure TS: auth.ts (initData), draw.ts, telegram.ts (Bot API client), texts.ts (all bot texts), db.ts
  functions/api/index.ts, functions/bot/index.ts, functions/cron/index.ts
  tests/                vitest (Node 22) for draw.ts and auth.ts
content/                terms.md, privacy.md, marketing texts
docs/                   spec.md, contract.ts, team.md, journal.md
```

- Frontend env: `VITE_API_URL`, `VITE_BOT_USERNAME`, `VITE_MOCK` (`1` = mock API + fake Telegram). Build: `npm run build` → `app/dist`. Hosting: Render static site (SPA via hash routing, so no rewrites needed).
- Edge function env (secrets): `BOT_TOKEN`, `BOT_USERNAME`, `WEBHOOK_SECRET`, `APP_URL`, `CRON_SECRET`, `ADMIN_SECRET` (+ auto `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). Imports: `npm:@supabase/supabase-js@2`. Keep `_shared` free of `Deno.*` so tests run in Node.
- Agents never deploy, never call external services, never commit secrets. The CEO deploys.

## 11. Acceptance

- Every screen state has a screenshot at 390×844 (DPR 2) and looks finished on a phone: no overflow, no clipped text, Cyrillic renders in both fonts.
- `npm run build` passes with zero TypeScript errors; `npx vitest run` passes for backend logic.
- Draw: never self-assignment, honors exclusions, uniform randomness, detects infeasible sets fast (≤ 500 participants).
- initData validation has tests with a known-good vector and tampered input.
- No emoji in any user-facing string (grep check).
