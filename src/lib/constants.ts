export const AUTH_URL = "https://functions.poehali.dev/3c0a32d6-c17c-47f4-a846-fb1c453c24fc";
export const UPLOAD_AVATAR_URL = "https://functions.poehali.dev/fc44fdc9-7f8e-41b5-80eb-09980e8a9c27";
export const UPDATE_PROFILE_URL = "https://functions.poehali.dev/906e9817-4957-4d99-9bc2-082e8b2d03df";
export const MESSAGES_URL = "https://functions.poehali.dev/2bd34809-22df-4f72-8b11-90ec52d3b5d0";
export const SIGNALING_URL = "https://functions.poehali.dev/6f79e618-cca7-4867-bfa0-4d6bf1af1cf1";

export interface AuthUser { id: number; phone: string; username: string; avatar_url?: string | null; display_name?: string | null; status?: string | null; }
export type Tab = "chats" | "contacts" | "calls" | "status" | "media" | "profile";
export type PrivacyLevel = "all" | "contacts" | "nobody";
export interface RealMessage { id: number; sender_id: number; text: string; at: string; read: boolean; }
export interface OtherUser { id: number; username: string; display_name?: string | null; avatar_url?: string | null; }
export interface Conversation {
  id: number;
  other_user: OtherUser;
  last_message: { text: string; at: string; mine: boolean } | null;
  unread: number;
}
export interface ChatFolder {
  id: string;
  name: string;
  icon: string;
  convIds: number[];
}
export interface CallInfo {
  call_id: number;
  caller: { id: number; username: string; display_name?: string | null; avatar_url?: string | null };
  offer?: RTCSessionDescriptionInit;
  call_type?: 'video' | 'audio';
  ice_servers?: RTCIceServer[];
}
export interface ActiveCallInfo {
  call_id: number;
  otherUser: { id: number; username: string; display_name?: string | null; avatar_url?: string | null };
  iscaller: boolean;
  peerConnection: RTCPeerConnection;
  localStream: MediaStream;
  remoteStream: MediaStream;
  call_type: 'video' | 'audio';
}
export interface CallHistoryItem {
  id: number;
  other_user: OtherUser;
  direction: 'incoming' | 'outgoing';
  call_type: 'video' | 'audio';
  status: string;
  missed: boolean;
  created_at: string | null;
  ended_at: string | null;
  duration_sec: number | null;
}

export const CONTACTS = [
  { id: 1, name: "Алёна Морозова", status: "В сети", avatar: "АМ", color: "from-purple-500 to-pink-500", online: true },
  { id: 2, name: "Дмитрий Волков", status: "Был в сети 5 мин назад", avatar: "ДВ", color: "from-blue-500 to-cyan-500", online: false },
  { id: 3, name: "Екатерина Лисова", status: "В сети", avatar: "ЕЛ", color: "from-emerald-500 to-teal-500", online: true },
  { id: 4, name: "Игорь Петров", status: "Был в сети час назад", avatar: "ИП", color: "from-orange-500 to-red-500", online: false },
  { id: 5, name: "Команда Nova", status: "42 участника", avatar: "КН", color: "from-violet-500 to-purple-600", online: true },
  { id: 6, name: "Маша Климова", status: "В сети", avatar: "МК", color: "from-pink-500 to-rose-500", online: true },
];

export const CHATS = [
  { id: 1, contact: CONTACTS[0], lastMsg: "Увидимся на встрече!", time: "14:32", unread: 3 },
  { id: 2, contact: CONTACTS[4], lastMsg: "Дизайн утверждён ✓", time: "13:15", unread: 0 },
  { id: 3, contact: CONTACTS[2], lastMsg: "Отправила файлы", time: "12:08", unread: 1 },
  { id: 4, contact: CONTACTS[1], lastMsg: "Хорошо, созвонимся", time: "вчера", unread: 0 },
  { id: 5, contact: CONTACTS[5], lastMsg: "Спасибо за помощь!", time: "вчера", unread: 0 },
  { id: 6, contact: CONTACTS[3], lastMsg: "Жду подтверждения", time: "пн", unread: 0 },
];

export const STATUSES = [
  { id: 1, contact: CONTACTS[0], viewed: false, count: 3, time: "2 мин назад", emoji: "🌸" },
  { id: 2, contact: CONTACTS[2], viewed: false, count: 1, time: "15 мин назад", emoji: "🎨" },
  { id: 3, contact: CONTACTS[5], viewed: true, count: 2, time: "1 час назад", emoji: "✨" },
  { id: 4, contact: CONTACTS[1], viewed: true, count: 1, time: "3 часа назад", emoji: "🚀" },
];

export const MEDIA_ITEMS = [
  { id: 1, type: "photo", from: CONTACTS[0], color: "from-purple-600 to-pink-600" },
  { id: 2, type: "photo", from: CONTACTS[2], color: "from-blue-600 to-cyan-600" },
  { id: 3, type: "video", from: CONTACTS[4], color: "from-green-600 to-teal-600" },
  { id: 4, type: "photo", from: CONTACTS[5], color: "from-orange-600 to-red-600" },
  { id: 5, type: "photo", from: CONTACTS[1], color: "from-violet-600 to-purple-600" },
  { id: 6, type: "voice", from: CONTACTS[3], color: "from-rose-600 to-pink-600" },
  { id: 7, type: "photo", from: CONTACTS[0], color: "from-cyan-600 to-blue-600" },
  { id: 8, type: "video", from: CONTACTS[2], color: "from-amber-600 to-orange-600" },
  { id: 9, type: "photo", from: CONTACTS[5], color: "from-indigo-600 to-violet-600" },
];

export const REPLIES: Record<number, string[]> = {
  1: ["Отлично, жду!", "Хорошо, спасибо!", "Увидимся 😊", "Договорились!", "Супер, пиши если что"],
  2: ["Понял, принял 👍", "Ок, скоро отвечу", "Договорились!", "Отлично, спасибо!", "Хорошо!"],
  3: ["Спасибо!", "Хорошо, гляну", "Ок!", "Поняла, спасибо 🙏", "Договорились"],
  4: ["Ок", "Хорошо!", "Понял", "Договорились!", "Буду ждать"],
  5: ["Пожалуйста 😊", "Всегда рада помочь!", "Удачи!", "Отлично!", "Ок!"],
  6: ["Жду 👌", "Хорошо!", "Ок, понял", "Договорились", "Спасибо!"],
};

export const SYSTEM_FOLDERS = [
  { id: "all", name: "Все", icon: "MessageCircle" },
  { id: "unread", name: "Непрочит.", icon: "BellDot" },
];

export const NAV_ITEMS: { id: Tab; icon: string; label: string }[] = [
  { id: "chats", icon: "MessageCircle", label: "Чаты" },
  { id: "contacts", icon: "Users", label: "Контакты" },
  { id: "calls", icon: "Phone", label: "Звонки" },
  { id: "status", icon: "Circle", label: "Статусы" },
  { id: "media", icon: "Image", label: "Медиа" },
  { id: "profile", icon: "User", label: "Профиль" },
];

export async function fetchWithTimeout(url: string, options: RequestInit = {}, ms = 8000): Promise<Response> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(tid);
  }
}

export async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 2, ms = 8000): Promise<Response> {
  try {
    return await fetchWithTimeout(url, options, ms);
  } catch (err) {
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1000));
      return fetchWithRetry(url, options, retries - 1, ms);
    }
    throw err;
  }
}

export function getNow() {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export function fmtMsgTime(at: string) {
  const d = new Date(at);
  return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
}

export function fmtLastSeen(last_seen: string) {
  const d = new Date(last_seen);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400 && d.getDate() === now.getDate()) return `в ${d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}`;
  return `${d.toLocaleDateString("ru", { day: "numeric", month: "short" })}`;
}

export function fmtConvTime(at: string) {
  const d = new Date(at);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000 && d.getDate() === now.getDate()) return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
  if (diff < 172800000) return "вчера";
  return d.toLocaleDateString("ru", { day: "numeric", month: "short" });
}

export function loadFolders(userId: number): ChatFolder[] {
  try {
    const raw = localStorage.getItem(`chat_folders_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveFolders(userId: number, folders: ChatFolder[]) {
  localStorage.setItem(`chat_folders_${userId}`, JSON.stringify(folders));
}

export function playNotification() {
  try {
    const ctx = new AudioContext();
    [[880, 0, 0.08], [1100, 0.1, 0.08], [1320, 0.2, 0.1]].forEach(([freq, start, dur]) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq as number;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, ctx.currentTime + (start as number));
      g.gain.linearRampToValueAtTime(0.18, ctx.currentTime + (start as number) + 0.01);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + (start as number) + (dur as number));
      osc.connect(g);
      g.connect(ctx.destination);
      osc.start(ctx.currentTime + (start as number));
      osc.stop(ctx.currentTime + (start as number) + (dur as number));
    });
  } catch (e) {
    void e;
  }
}

export function createRingTone(ctx: AudioContext): () => void {
  let stopped = false;
  let timeout: ReturnType<typeof setTimeout>;

  function ring() {
    if (stopped) return;
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const gain = ctx.createGain();
    o1.connect(gain); o2.connect(gain); gain.connect(ctx.destination);
    o1.frequency.value = 480; o2.frequency.value = 620;
    o1.type = 'sine'; o2.type = 'sine';
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.setValueAtTime(0.3, ctx.currentTime + 0.38);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
    o1.start(ctx.currentTime); o2.start(ctx.currentTime);
    o1.stop(ctx.currentTime + 0.4); o2.stop(ctx.currentTime + 0.4);
    timeout = setTimeout(ring, 600);
  }

  ring();
  return () => { stopped = true; clearTimeout(timeout); };
}

export function createDialTone(ctx: AudioContext): () => void {
  let stopped = false;
  let timeout: ReturnType<typeof setTimeout>;

  function ring() {
    if (stopped) return;
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const gain = ctx.createGain();
    o1.connect(gain); o2.connect(gain); gain.connect(ctx.destination);
    o1.frequency.value = 440; o2.frequency.value = 480;
    o1.type = 'sine'; o2.type = 'sine';
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.15, ctx.currentTime + 0.95);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.0);
    o1.start(ctx.currentTime); o2.start(ctx.currentTime);
    o1.stop(ctx.currentTime + 1.0); o2.stop(ctx.currentTime + 1.0);
    timeout = setTimeout(ring, 3000);
  }

  ring();
  return () => { stopped = true; clearTimeout(timeout); };
}

export function showPushNotification(title: string, body: string, icon?: string | null) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    try {
      new Notification(title, { body, icon: icon || undefined, silent: true });
    } catch (e) { void e; }
  }
}

export async function requestNotificationPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
}
