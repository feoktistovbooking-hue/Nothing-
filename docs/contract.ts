// Shared API contract for Конверт. Frontend: copy to app/src/api/types.ts. Backend: copy to supabase/functions/_shared/contract.ts.
// Keep all copies identical. Change only via the CEO.

export type Tier = 'free' | 's' | 'm' | 'l';

export const TIERS: Record<Tier, { capacity: number; stars: number; label: string }> = {
  free: { capacity: 10, stars: 0, label: 'Бесплатно до 10 участников' },
  s: { capacity: 30, stars: 149, label: 'До 30 участников' },
  m: { capacity: 100, stars: 349, label: 'До 100 участников' },
  l: { capacity: 500, stars: 799, label: 'До 500 участников' },
};

export const LIMITS = {
  title: 60,
  budget: 30,
  note: 300,
  wishlist: 1000,
  message: 500,
  messagesPerThreadPerDay: 30,
  openGamesPerUser: 20,
  minParticipants: 3,
} as const;

export type GameStatus = 'open' | 'drawn' | 'revealed';
export type Thread = 'to_recipient' | 'from_santa';

export interface Me {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
}

export interface GameSummary {
  code: string;
  title: string;
  status: GameStatus;
  role: 'organizer' | 'participant';
  participantsCount: number;
  exchangeDate: string | null; // YYYY-MM-DD
  budget: string | null;
  myEnvelopeOpened: boolean; // false until drawn and opened
  unreadMessages: number;
}

export interface PublicGame {
  isParticipant: false;
  code: string;
  title: string;
  status: GameStatus;
  organizerName: string;
  participantsCount: number;
  budget: string | null;
  exchangeDate: string | null;
  note: string | null;
}

export interface ParticipantView {
  id: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
  isOrganizer: boolean;
  isMe: boolean;
  hasWishlist: boolean;
  envelopeOpened?: boolean; // only sent to the organizer
  giftReady?: boolean; // only sent to the organizer
}

export interface Assignment {
  receiver: {
    firstName: string;
    lastName?: string;
    username?: string;
    photoUrl?: string;
    wishlist: string | null;
  };
}

export interface FullGame {
  isParticipant: true;
  code: string;
  title: string;
  status: GameStatus;
  budget: string | null;
  exchangeDate: string | null;
  note: string | null;
  isOrganizer: boolean;
  organizerName: string;
  tier: Tier;
  capacity: number;
  participantsCount: number;
  participants: ParticipantView[];
  me: {
    participantId: string | null; // null when the organizer does not participate
    wishlist: string | null;
    giftReady: boolean;
    envelopeOpened: boolean;
  };
  assignment: Assignment | null; // present after the draw for participants
  exclusions?: Array<[string, string]>; // organizer only, participant ids
  reveal: Array<{ giver: string; receiver: string }> | null; // display names, after reveal
  stats?: { opened: number; ready: number }; // organizer only, after the draw
  inviteLink: string; // https://t.me/<BOT_USERNAME>?startapp=g_<CODE>
  unreadMessages: number;
}

export type AnyGame = PublicGame | FullGame;

export interface Message {
  id: string;
  thread: Thread;
  mine: boolean;
  text: string;
  createdAt: string; // ISO
}

export type ApiErrorCode =
  | 'unauthorized'
  | 'not_found'
  | 'forbidden'
  | 'not_open'
  | 'too_few_participants'
  | 'capacity_exceeded'
  | 'draw_infeasible'
  | 'rate_limited'
  | 'validation_error'
  | 'payment_error'
  | 'internal';

export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ApiErrorCode; message: string } };

export type EventType =
  | 'app_open'
  | 'game_create'
  | 'join'
  | 'share_click'
  | 'paywall_view'
  | 'invoice_open'
  | 'invoice_paid'
  | 'draw'
  | 'envelope_open'
  | 'message_send'
  | 'wishlist_save'
  | 'reveal';

// Endpoint map (paths relative to VITE_API_URL)
export interface Endpoints {
  'POST /session': { body: Record<string, never>; res: { me: Me; isNew: boolean } };
  'GET /games': { body: null; res: { games: GameSummary[] } };
  'POST /games': {
    body: { title: string; budget?: string; exchangeDate?: string; note?: string; organizerParticipates?: boolean };
    res: { game: FullGame };
  };
  'GET /games/:code': { body: null; res: { game: AnyGame } };
  'POST /games/:code/join': { body: { wishlist?: string }; res: { game: FullGame } };
  'POST /games/:code/leave': { body: Record<string, never>; res: { ok: true } };
  'PATCH /games/:code': {
    body: { title?: string; budget?: string; exchangeDate?: string | null; note?: string };
    res: { game: FullGame };
  };
  'DELETE /games/:code/participants/:id': { body: null; res: { game: FullGame } };
  'PUT /games/:code/exclusions': { body: { pairs: Array<[string, string]> }; res: { game: FullGame } };
  'POST /games/:code/draw': { body: Record<string, never>; res: { game: FullGame } };
  'POST /games/:code/envelope-open': { body: Record<string, never>; res: { game: FullGame } };
  'PUT /games/:code/wishlist': { body: { wishlist: string }; res: { game: FullGame } };
  'PUT /games/:code/gift-ready': { body: { ready: boolean }; res: { game: FullGame } };
  'GET /games/:code/messages': { body: null; res: { messages: Message[] } };
  'POST /games/:code/messages': { body: { thread: Thread; text: string }; res: { message: Message } };
  'POST /games/:code/invoice': { body: { tier: Exclude<Tier, 'free'> }; res: { invoiceLink: string } };
  'POST /games/:code/reveal': { body: Record<string, never>; res: { game: FullGame } };
  'POST /events': { body: { type: EventType; gameCode?: string; meta?: Record<string, unknown> }; res: { ok: true } };
}
