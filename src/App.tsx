import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import AuthPage from "@/AuthPage";
import ImageCropModal from "@/components/ImageCropModal";

const AUTH_URL = "https://functions.poehali.dev/3c0a32d6-c17c-47f4-a846-fb1c453c24fc";
const UPLOAD_AVATAR_URL = "https://functions.poehali.dev/fc44fdc9-7f8e-41b5-80eb-09980e8a9c27";
const UPDATE_PROFILE_URL = "https://functions.poehali.dev/906e9817-4957-4d99-9bc2-082e8b2d03df";
const MESSAGES_URL = "https://functions.poehali.dev/2bd34809-22df-4f72-8b11-90ec52d3b5d0";
const SIGNALING_URL = "https://functions.poehali.dev/6f79e618-cca7-4867-bfa0-4d6bf1af1cf1";

async function fetchWithTimeout(url: string, options: RequestInit = {}, ms = 8000): Promise<Response> {
  const ctrl = new AbortController();
  const tid = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...options, signal: ctrl.signal });
  } finally {
    clearTimeout(tid);
  }
}

async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 2, ms = 8000): Promise<Response> {
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

interface AuthUser { id: number; phone: string; username: string; avatar_url?: string | null; display_name?: string | null; status?: string | null; }

type Tab = "chats" | "contacts" | "calls" | "status" | "media" | "profile";

const CONTACTS = [
  { id: 1, name: "Алёна Морозова", status: "В сети", avatar: "АМ", color: "from-purple-500 to-pink-500", online: true },
  { id: 2, name: "Дмитрий Волков", status: "Был в сети 5 мин назад", avatar: "ДВ", color: "from-blue-500 to-cyan-500", online: false },
  { id: 3, name: "Екатерина Лисова", status: "В сети", avatar: "ЕЛ", color: "from-emerald-500 to-teal-500", online: true },
  { id: 4, name: "Игорь Петров", status: "Был в сети час назад", avatar: "ИП", color: "from-orange-500 to-red-500", online: false },
  { id: 5, name: "Команда Nova", status: "42 участника", avatar: "КН", color: "from-violet-500 to-purple-600", online: true },
  { id: 6, name: "Маша Климова", status: "В сети", avatar: "МК", color: "from-pink-500 to-rose-500", online: true },
];

const CHATS = [
  { id: 1, contact: CONTACTS[0], lastMsg: "Увидимся на встрече!", time: "14:32", unread: 3 },
  { id: 2, contact: CONTACTS[4], lastMsg: "Дизайн утверждён ✓", time: "13:15", unread: 0 },
  { id: 3, contact: CONTACTS[2], lastMsg: "Отправила файлы", time: "12:08", unread: 1 },
  { id: 4, contact: CONTACTS[1], lastMsg: "Хорошо, созвонимся", time: "вчера", unread: 0 },
  { id: 5, contact: CONTACTS[5], lastMsg: "Спасибо за помощь!", time: "вчера", unread: 0 },
  { id: 6, contact: CONTACTS[3], lastMsg: "Жду подтверждения", time: "пн", unread: 0 },
];

type Message = { id: number; text: string; out: boolean; time: string; voice?: { url: string; duration: number } };

const MESSAGES: Record<number, Message[]> = {
  1: [
    { id: 1, text: "Привет! Как дела с проектом?", out: false, time: "14:20" },
    { id: 2, text: "Всё отлично! Почти закончила дизайн", out: true, time: "14:22" },
    { id: 3, text: "Когда сможешь показать?", out: false, time: "14:25" },
    { id: 4, text: "Сегодня вечером отправлю в общий чат", out: true, time: "14:28" },
    { id: 5, text: "Увидимся на встрече!", out: false, time: "14:32" },
  ],
  2: [
    { id: 1, text: "Команда, нужно обсудить релиз", out: false, time: "12:00" },
    { id: 2, text: "Готов! Когда звонок?", out: true, time: "12:05" },
    { id: 3, text: "В 15:00 по МСК", out: false, time: "12:10" },
    { id: 4, text: "Дизайн утверждён ✓", out: false, time: "13:15" },
  ],
  3: [
    { id: 1, text: "Можешь проверить документы?", out: false, time: "11:50" },
    { id: 2, text: "Конечно, скидывай", out: true, time: "11:55" },
    { id: 3, text: "Отправила файлы", out: false, time: "12:08" },
  ],
};

const CALLS = [
  { id: 1, contact: CONTACTS[0], type: "video", direction: "incoming", time: "Сегодня, 11:20", duration: "12:34", missed: false },
  { id: 2, contact: CONTACTS[1], type: "audio", direction: "outgoing", time: "Сегодня, 09:45", duration: "05:10", missed: false },
  { id: 3, contact: CONTACTS[2], type: "video", direction: "incoming", time: "Вчера, 20:15", duration: "", missed: true },
  { id: 4, contact: CONTACTS[4], type: "audio", direction: "outgoing", time: "Вчера, 15:30", duration: "28:02", missed: false },
  { id: 5, contact: CONTACTS[5], type: "video", direction: "incoming", time: "Пн, 18:00", duration: "03:47", missed: false },
];

const STATUSES = [
  { id: 1, contact: CONTACTS[0], viewed: false, count: 3, time: "2 мин назад", emoji: "🌸" },
  { id: 2, contact: CONTACTS[2], viewed: false, count: 1, time: "15 мин назад", emoji: "🎨" },
  { id: 3, contact: CONTACTS[5], viewed: true, count: 2, time: "1 час назад", emoji: "✨" },
  { id: 4, contact: CONTACTS[1], viewed: true, count: 1, time: "3 часа назад", emoji: "🚀" },
];

const MEDIA_ITEMS = [
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

function Avatar({ initials, color, size = "md", online = false }: { initials: string; color: string; size?: "sm" | "md" | "lg" | "xl"; online?: boolean }) {
  const sizes: Record<string, string> = { sm: "w-8 h-8 text-xs", md: "w-10 h-10 text-sm", lg: "w-12 h-12 text-base", xl: "w-16 h-16 text-lg" };
  return (
    <div className={`relative flex-shrink-0`}>
      <div className={`${sizes[size]} rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-semibold text-white`}>
        {initials}
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-background" />
      )}
    </div>
  );
}

const REPLIES: Record<number, string[]> = {
  1: ["Отлично, жду!", "Хорошо, спасибо!", "Увидимся 😊", "Договорились!", "Супер, пиши если что"],
  2: ["Понял, принял 👍", "Ок, скоро отвечу", "Договорились!", "Отлично, спасибо!", "Хорошо!"],
  3: ["Спасибо!", "Хорошо, гляну", "Ок!", "Поняла, спасибо 🙏", "Договорились"],
  4: ["Ок", "Хорошо!", "Понял", "Договорились!", "Буду ждать"],
  5: ["Пожалуйста 😊", "Всегда рада помочь!", "Удачи!", "Отлично!", "Ок!"],
  6: ["Жду 👌", "Хорошо!", "Ок, понял", "Договорились", "Спасибо!"],
};

function getNow() {
  const d = new Date();
  return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function playNotification() {
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

function createRingTone(ctx: AudioContext): () => void {
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

function createDialTone(ctx: AudioContext): () => void {
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

function showPushNotification(title: string, body: string, icon?: string | null) {
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    try {
      new Notification(title, { body, icon: icon || undefined, silent: true });
    } catch (e) { void e; }
  }
}

let activeCallNotification: Notification | null = null;

async function requestNotificationPermission() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
}

function VoiceBubble({ url, duration, out }: { url: string; duration: number; out: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function toggle() {
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
      audioRef.current.ontimeupdate = () => {
        const a = audioRef.current!;
        setProgress(a.duration ? a.currentTime / a.duration : 0);
      };
      audioRef.current.onended = () => { setPlaying(false); setProgress(0); };
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      audioRef.current.play();
      setPlaying(true);
    }
  }

  const bars = Array.from({ length: 28 }, (_, i) => 3 + Math.abs(Math.sin(i * 0.8 + (url.length % 5))) * 14);
  const filled = Math.round(progress * bars.length);
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

  return (
    <div className="flex items-center gap-3 min-w-[180px]">
      <button
        onClick={toggle}
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${out ? "bg-white/20 hover:bg-white/30" : "bg-neon-purple/20 hover:bg-neon-purple/30"}`}
      >
        <Icon name={playing ? "Pause" : "Play"} size={16} />
      </button>
      <div className="flex items-end gap-[2px] flex-1">
        {bars.map((h, i) => (
          <div
            key={i}
            style={{ height: `${h}px` }}
            className={`w-[3px] rounded-full transition-colors ${i < filled ? (out ? "bg-white" : "bg-neon-purple") : (out ? "bg-white/40" : "bg-muted-foreground/40")}`}
          />
        ))}
      </div>
      <span className={`text-[10px] flex-shrink-0 ${out ? "text-white/60" : "text-muted-foreground"}`}>{fmt(duration)}</span>
    </div>
  );
}

interface RealMessage { id: number; sender_id: number; text: string; at: string; read: boolean; }
interface OtherUser { id: number; username: string; display_name?: string | null; avatar_url?: string | null; }

function fmtMsgTime(at: string) {
  const d = new Date(at);
  return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
}

function UserAvatar({ user, size = 10 }: { user: OtherUser; size?: number }) {
  const initials = (user.display_name || user.username).slice(0, 2).toUpperCase();
  const colors = ["from-purple-500 to-pink-500", "from-blue-500 to-cyan-500", "from-emerald-500 to-teal-500", "from-orange-500 to-red-500", "from-violet-500 to-purple-600"];
  const color = colors[user.id % colors.length];
  const sz = `w-${size} h-${size}`;
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold overflow-hidden flex-shrink-0`}
      style={{ fontSize: size <= 8 ? 10 : 13 }}>
      {user.avatar_url
        ? <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
        : initials}
    </div>
  );
}

function fmtLastSeen(last_seen: string) {
  const d = new Date(last_seen);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "только что";
  if (diff < 3600) return `${Math.floor(diff / 60)} мин назад`;
  if (diff < 86400 && d.getDate() === now.getDate()) return `в ${d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" })}`;
  return `${d.toLocaleDateString("ru", { day: "numeric", month: "short" })}`;
}

function ChatView({ convId, otherUser, myId, onBack, hideOnlineStatus, messagePrivacy, onGoToPrivacy, onCall }: {
  convId: number; otherUser: OtherUser; myId: number; onBack: () => void;
  hideOnlineStatus?: boolean; messagePrivacy?: PrivacyLevel; onGoToPrivacy?: () => void;
  onCall?: (user: OtherUser, type: 'video' | 'audio') => void;
}) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<RealMessage[]>([]);
  const [lastId, setLastId] = useState(0);
  const [sending, setSending] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState<{ online: boolean; last_seen: string | null } | null>(null);
  const [offline, setOffline] = useState(false);
  const [reconnected, setReconnected] = useState(false);
  const wasOfflineRef = useRef(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onlineRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollIntervalRef = useRef(4000);
  const token = localStorage.getItem("auth_token") || "";

  function reschedulePoll(loadFn: (id?: number) => void) {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(() => {
      setLastId(prev => { loadFn(prev); return prev; });
    }, pollIntervalRef.current);
  }

  async function loadMessages(after?: number) {
    try {
      const url = after
        ? `${MESSAGES_URL}?action=messages&conv_id=${convId}&after=${after}`
        : `${MESSAGES_URL}?action=messages&conv_id=${convId}`;
      const res = await fetchWithRetry(url, { headers: { "X-Session-Token": token } });
      const data = await res.json();
      if (data.messages) {
        if (after) {
          if (data.messages.length > 0) {
            const incoming = (data.messages as RealMessage[]).filter(m => m.sender_id !== myId);
            if (incoming.length > 0) {
              playNotification();
              const last = incoming[incoming.length - 1];
              const name = otherUser.display_name || `@${otherUser.username}`;
              showPushNotification(name, last.text, otherUser.avatar_url);
            }
            setMessages(prev => [...prev, ...data.messages]);
            setLastId(data.messages[data.messages.length - 1].id);
          }
        } else {
          setMessages(data.messages);
          if (data.messages.length > 0) setLastId(data.messages[data.messages.length - 1].id);
        }
      }
    } catch (_) {
      setOffline(true);
      wasOfflineRef.current = true;
      pollIntervalRef.current = Math.min(pollIntervalRef.current * 2, 30000);
      reschedulePoll(loadMessages);
      return;
    }
    if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      pollIntervalRef.current = 4000;
      reschedulePoll(loadMessages);
      setReconnected(true);
      setTimeout(() => setReconnected(false), 2500);
    }
    setOffline(false);
  }

  async function loadOnlineStatus() {
    try {
      const res = await fetchWithTimeout(`${MESSAGES_URL}?action=online&user_id=${otherUser.id}`, { headers: { "X-Session-Token": token } });
      const data = await res.json();
      if ('online' in data) setOnlineStatus(data);
    } catch (_) { /* network error */ }
  }

  useEffect(() => {
    pollIntervalRef.current = 4000;
    loadMessages();
    pollRef.current = setInterval(() => {
      setLastId(prev => { loadMessages(prev); return prev; });
    }, pollIntervalRef.current);
    loadOnlineStatus();
    onlineRef.current = setInterval(loadOnlineStatus, 30000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      if (onlineRef.current) clearInterval(onlineRef.current);
    };
  }, [convId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput("");
    try {
      const res = await fetch(`${MESSAGES_URL}?action=send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({ to_user_id: otherUser.id, text }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages(prev => [...prev, data.message]);
        setLastId(data.message.id);
      }
    } catch (_) { /* ignore send error */ }
    setSending(false);
  }

  const displayName = otherUser.display_name || `@${otherUser.username}`;

  return (
    <div className="flex flex-col h-full animate-slide-in-right">
      {offline && (
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border-b border-yellow-500/30 text-yellow-300 text-xs animate-pulse">
          <Icon name="WifiOff" size={13} className="shrink-0" />
          <span>Нет соединения — пытаемся восстановить...</span>
          <span className="ml-auto flex gap-0.5">
            <span className="w-1 h-1 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1 h-1 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1 h-1 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: "300ms" }} />
          </span>
        </div>
      )}
      {reconnected && (
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border-b border-emerald-500/30 text-emerald-300 text-xs animate-pulse">
          <Icon name="Wifi" size={13} className="shrink-0" />
          <span>Соединение восстановлено</span>
        </div>
      )}
      <div className="glass-strong px-4 py-3 flex items-center gap-3 border-b border-border/50">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
          <Icon name="ChevronLeft" size={20} />
        </button>
        <div className="relative">
          <UserAvatar user={otherUser} size={10} />
          {!hideOnlineStatus && onlineStatus?.online && (
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{displayName}</div>
          <div className="text-xs text-muted-foreground">
            {hideOnlineStatus
              ? `@${otherUser.username}`
              : onlineStatus?.online
                ? <span className="text-emerald-400">В сети</span>
                : onlineStatus?.last_seen
                  ? `был(а) ${fmtLastSeen(onlineStatus.last_seen)}`
                  : `@${otherUser.username}`}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onCall?.(otherUser, 'audio')} className="p-2 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-neon-purple" title="Аудиозвонок">
            <Icon name="Phone" size={18} />
          </button>
          <button onClick={() => onCall?.(otherUser, 'video')} className="p-2 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-neon-purple" title="Видеозвонок">
            <Icon name="Video" size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 mesh-bg">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-center">
            <UserAvatar user={otherUser} size={16} />
            <p className="text-sm font-semibold mt-2">{displayName}</p>
            <p className="text-xs text-muted-foreground">Начните общение — напишите первое сообщение</p>
          </div>
        )}
        {messages.map((msg) => {
          const isOut = msg.sender_id === myId;
          return (
            <div key={msg.id} className={`flex ${isOut ? "justify-end" : "justify-start"} animate-fade-in`}>
              <div className={`max-w-[72%] px-4 py-2.5 shadow-lg ${isOut ? "msg-bubble-out text-white" : "msg-bubble-in text-foreground"}`}>
                <p className="text-sm leading-relaxed">{msg.text}</p>
                <div className={`flex items-center justify-end gap-1 mt-1 ${isOut ? "text-white/60" : "text-muted-foreground"}`}>
                  <span className="text-[10px]">{fmtMsgTime(msg.at)}</span>
                  {isOut && <Icon name={msg.read ? "CheckCheck" : "Check"} size={12} />}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="glass-strong px-4 py-3 border-t border-border/50">
        {messagePrivacy === "nobody" ? (
          <div className="flex items-center justify-center gap-2.5 py-2 px-4 bg-muted/30 rounded-2xl border border-border/40">
            <Icon name="Ban" size={15} className="text-muted-foreground flex-shrink-0" />
            <span className="text-xs text-muted-foreground">Вы запретили получать сообщения · <button onClick={() => { onBack(); onGoToPrivacy?.(); }} className="text-neon-purple hover:underline">Изменить</button></span>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-xl text-muted-foreground hover:text-neon-purple transition-colors">
              <Icon name="Smile" size={20} />
            </button>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
              placeholder="Написать сообщение..."
              className="flex-1 bg-muted/50 border border-border/50 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-neon-purple/60 transition-colors placeholder:text-muted-foreground"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="p-2.5 rounded-xl gradient-purple-blue text-white glow-purple transition-all disabled:opacity-40"
            >
              {sending ? <Icon name="Loader2" size={18} className="animate-spin" /> : <Icon name="Send" size={18} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ChatRow({ chat, onOpen, onArchive, onUnarchive, archived, pinned, muted, onPin, onMute, locked, onLock }: {
  chat: typeof CHATS[0];
  onOpen: () => void;
  onArchive?: () => void;
  onUnarchive?: () => void;
  archived?: boolean;
  pinned?: boolean;
  muted?: boolean;
  onPin?: () => void;
  onMute?: () => void;
  locked?: boolean;
  onLock?: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [pressing, setPressing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function close(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setMenuOpen(false); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuOpen]);

  function handlePointerDown() {
    setPressing(true);
    longPressTimer.current = setTimeout(() => {
      setPressing(false);
      setMenuOpen(true);
      if (navigator.vibrate) navigator.vibrate(40);
    }, 500);
  }

  function handlePointerUp() {
    setPressing(false);
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }

  function handleClick() {
    if (menuOpen) return;
    onOpen();
  }

  return (
    <div ref={ref} className="relative group animate-fade-in">
      <button
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onContextMenu={e => { e.preventDefault(); setMenuOpen(true); }}
        className={`w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all text-left select-none ${pressing ? "scale-[0.97] bg-muted/60" : "hover:bg-muted/40"}`}
        style={{ transition: pressing ? "transform 0.1s, background 0.1s" : "transform 0.2s, background 0.2s" }}
      >
        <div className="relative flex-shrink-0">
          <Avatar initials={locked ? "АМ" : chat.contact.avatar} color={locked ? "from-slate-500 to-slate-600" : chat.contact.color} online={!locked && chat.contact.online} />
          {locked && (
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-neon-purple flex items-center justify-center border border-background">
              <Icon name="Lock" size={9} className="text-white" />
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-1.5 min-w-0">
              {pinned && <Icon name="Pin" size={11} className="text-neon-purple flex-shrink-0" />}
              <span className="font-semibold text-sm truncate">{locked ? "Закрытый чат" : chat.contact.name}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
              {muted && <Icon name="BellOff" size={11} className="text-muted-foreground" />}
              <span className="text-[11px] text-muted-foreground">{chat.time}</span>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground truncate">{chat.lastMsg}</span>
            {!archived && chat.unread > 0 && (
              <span className={`flex-shrink-0 min-w-5 h-5 text-[10px] font-bold rounded-full flex items-center justify-center px-1.5 ${muted ? "bg-muted text-muted-foreground" : "gradient-purple-blue text-white"}`}>
                {chat.unread}
              </span>
            )}
          </div>
        </div>
      </button>
      <button
        onClick={() => setMenuOpen(v => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-muted transition-all text-muted-foreground"
      >
        <Icon name="MoreVertical" size={15} />
      </button>
      {menuOpen && (
        <div className="absolute right-2 top-full mt-1 z-50 glass-strong border border-border/60 rounded-xl overflow-hidden shadow-xl animate-fade-in min-w-[170px] flex flex-col gap-0.5 p-1.5">
          <button
            onClick={() => { setMenuOpen(false); onOpen(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left rounded-lg"
          >
            <Icon name="MessageCircle" size={15} className="text-blue-400" />
            Открыть чат
          </button>
          {!archived && (
            <button
              onClick={() => { setMenuOpen(false); onPin?.(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left rounded-lg"
            >
              <Icon name={pinned ? "PinOff" : "Pin"} size={15} className="text-yellow-400" />
              {pinned ? "Открепить" : "Закрепить"}
            </button>
          )}
          <button
            onClick={() => { setMenuOpen(false); onMute?.(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left rounded-lg"
          >
            <Icon name={muted ? "Bell" : "BellOff"} size={15} className="text-green-400" />
            {muted ? "Включить звук" : "Заглушить"}
          </button>
          <button
            onClick={() => { setMenuOpen(false); onLock?.(); }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left rounded-lg"
          >
            <Icon name={locked ? "LockOpen" : "Lock"} size={15} className="text-purple-400" />
            {locked ? "Снять блокировку" : "Закрыть чат"}
          </button>
          <div className="border-t border-border/40 my-0.5" />
          <button
            onClick={() => { setMenuOpen(false); if (archived) { onUnarchive?.(); } else { onArchive?.(); } }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-red-500/10 text-red-400 transition-colors text-left rounded-lg"
          >
            <Icon name={archived ? "ArchiveRestore" : "Archive"} size={15} className="text-red-400" />
            {archived ? "Восстановить" : "В архив"}
          </button>
        </div>
      )}
    </div>
  );
}

type PinPadMode = "enter" | "set" | "confirm";

function PinPad({ mode, onSuccess, onCancel, existingPin, title: titleProp }: {
  mode: PinPadMode;
  onSuccess: (pin?: string) => void;
  onCancel: () => void;
  existingPin?: string;
  title?: string;
}) {
  const [digits, setDigits] = useState("");
  const [confirmDigits, setConfirmDigits] = useState("");
  const [step, setStep] = useState<"first" | "confirm">("first");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  const current = step === "confirm" ? confirmDigits : digits;
  const title = titleProp ?? (mode === "enter"
    ? "Введите пин-код"
    : step === "confirm" ? "Повторите пин-код" : "Создайте пин-код");

  function doShake(msg: string) {
    setError(msg);
    setShake(true);
    setTimeout(() => setShake(false), 500);
  }

  function press(d: string) {
    if (current.length >= 4) return;
    const next = current + d;
    if (step === "first") setDigits(next);
    else setConfirmDigits(next);

    if (next.length === 4) {
      setTimeout(() => submit(next), 120);
    }
  }

  function submit(val: string) {
    if (mode === "enter") {
      if (val === existingPin) { onSuccess(); }
      else { doShake("Неверный пин-код"); setDigits(""); }
    } else if (mode === "set") {
      if (step === "first") { setStep("confirm"); setConfirmDigits(""); setError(""); }
    } else if (mode === "confirm") {
      if (step === "first") { setStep("confirm"); setConfirmDigits(""); setError(""); }
      else {
        if (val === digits) { onSuccess(digits); }
        else { doShake("Пин-коды не совпадают"); setConfirmDigits(""); setStep("first"); setDigits(""); }
      }
    }
  }

  function del() {
    if (step === "confirm") setConfirmDigits(p => p.slice(0, -1));
    else setDigits(p => p.slice(0, -1));
  }

  const len = current.length;

  return (
    <div className="absolute inset-0 z-40 flex flex-col items-center justify-between py-12 px-6 animate-fade-in"
      style={{ background: "linear-gradient(160deg, hsl(258 85% 8%) 0%, hsl(222 25% 5%) 60%, hsl(210 100% 7%) 100%)" }}>
      <div className="flex flex-col items-center gap-2 mt-4">
        <div className="w-14 h-14 rounded-2xl gradient-purple-blue flex items-center justify-center glow-purple mb-2">
          <Icon name="Lock" size={24} className="text-white" />
        </div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>

      <div className={`flex gap-5 ${shake ? "animate-bounce" : ""}`}>
        {[0,1,2,3].map(i => (
          <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${i < len ? "border-neon-purple bg-neon-purple glow-purple scale-110" : "border-muted-foreground/40 bg-transparent"}`} />
        ))}
      </div>

      <div className="w-full max-w-[260px]">
        <div className="grid grid-cols-3 gap-3 mb-3">
          {["1","2","3","4","5","6","7","8","9"].map(d => (
            <button key={d} onClick={() => press(d)}
              className="h-14 rounded-2xl bg-white/5 border border-white/10 text-white text-xl font-semibold hover:bg-white/10 active:scale-95 transition-all">
              {d}
            </button>
          ))}
          <button onClick={onCancel}
            className="h-14 rounded-2xl text-muted-foreground text-sm hover:bg-white/5 transition-all">
            Отмена
          </button>
          <button onClick={() => press("0")}
            className="h-14 rounded-2xl bg-white/5 border border-white/10 text-white text-xl font-semibold hover:bg-white/10 active:scale-95 transition-all">
            0
          </button>
          <button onClick={del}
            className="h-14 rounded-2xl text-muted-foreground hover:bg-white/5 transition-all flex items-center justify-center">
            <Icon name="Delete" size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

interface Conversation {
  id: number;
  other_user: OtherUser;
  last_message: { text: string; at: string; mine: boolean } | null;
  unread: number;
}

function fmtConvTime(at: string) {
  const d = new Date(at);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 86400000 && d.getDate() === now.getDate()) return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
  if (diff < 172800000) return "вчера";
  return d.toLocaleDateString("ru", { day: "numeric", month: "short" });
}

interface ChatFolder {
  id: string;
  name: string;
  icon: string;
  convIds: number[];
}

const SYSTEM_FOLDERS = [
  { id: "all", name: "Все", icon: "MessageCircle" },
  { id: "unread", name: "Непрочит.", icon: "BellDot" },
];

function loadFolders(userId: number): ChatFolder[] {
  try {
    const raw = localStorage.getItem(`chat_folders_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveFolders(userId: number, folders: ChatFolder[]) {
  localStorage.setItem(`chat_folders_${userId}`, JSON.stringify(folders));
}

function ChatsTab({ sharedPin, onPinCreated, hideOnlineStatus, messagePrivacy, onGoToPrivacy, authUser, onCall }: { sharedPin: string | null; onPinCreated: (pin: string) => void; hideOnlineStatus?: boolean; messagePrivacy?: PrivacyLevel; onGoToPrivacy?: () => void; authUser?: AuthUser | null; onCall?: (user: OtherUser, type: 'video' | 'audio') => void }) {
  const [openConv, setOpenConv] = useState<{ convId: number; otherUser: OtherUser } | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<OtherUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [newChat, setNewChat] = useState(false);
  const [newChatQuery, setNewChatQuery] = useState("");
  const [newChatResults, setNewChatResults] = useState<OtherUser[]>([]);
  const [offline, setOffline] = useState(false);
  const [reconnected, setReconnected] = useState(false);
  const [activeFolder, setActiveFolder] = useState("all");
  const [folders, setFolders] = useState<ChatFolder[]>(() => loadFolders(authUser?.id ?? 0));
  const [manageFolders, setManageFolders] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [addToFolder, setAddToFolder] = useState<{ folderId: string; convId: number } | null>(null);
  const wasOfflineRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const token = localStorage.getItem("auth_token") || "";

  function updateFolders(next: ChatFolder[]) {
    setFolders(next);
    saveFolders(authUser?.id ?? 0, next);
  }

  function createFolder() {
    const name = newFolderName.trim();
    if (!name) return;
    const folder: ChatFolder = { id: `f_${Date.now()}`, name, icon: "Folder", convIds: [] };
    updateFolders([...folders, folder]);
    setNewFolderName("");
  }

  function deleteFolder(id: string) {
    updateFolders(folders.filter(f => f.id !== id));
    if (activeFolder === id) setActiveFolder("all");
  }

  function toggleConvInFolder(folderId: string, convId: number) {
    updateFolders(folders.map(f =>
      f.id === folderId
        ? { ...f, convIds: f.convIds.includes(convId) ? f.convIds.filter(id => id !== convId) : [...f.convIds, convId] }
        : f
    ));
  }

  const prevUnreadRef = useRef<Record<number, number>>({});

  async function loadConversations(notify = false) {
    try {
      const res = await fetchWithTimeout(`${MESSAGES_URL}?action=conversations`, { headers: { "X-Session-Token": token } });
      const data = await res.json();
      setOffline(false);
      if (data.conversations) {
        if (notify) {
          for (const conv of data.conversations as Conversation[]) {
            const prevUnread = prevUnreadRef.current[conv.id] ?? conv.unread;
            if (conv.unread > prevUnread && conv.last_message && !conv.last_message.mine) {
              const name = conv.other_user.display_name || `@${conv.other_user.username}`;
              playNotification();
              showPushNotification(name, conv.last_message.text, conv.other_user.avatar_url);
            }
          }
        }
        prevUnreadRef.current = Object.fromEntries((data.conversations as Conversation[]).map(c => [c.id, c.unread]));
        setConversations(data.conversations);
      }
    } catch (_) { setOffline(true); wasOfflineRef.current = true; setLoading(false); return; }
    setOffline(false);
    if (wasOfflineRef.current) {
      wasOfflineRef.current = false;
      setReconnected(true);
      setTimeout(() => setReconnected(false), 2500);
    }
    setLoading(false);
  }

  useEffect(() => {
    requestNotificationPermission();
    loadConversations(false);
    pollRef.current = setInterval(() => loadConversations(true), 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  async function searchUsers(q: string) {
    if (q.length < 2) { setNewChatResults([]); return; }
    try {
      const res = await fetch(`${MESSAGES_URL}?action=search&q=${encodeURIComponent(q)}`, { headers: { "X-Session-Token": token } });
      const data = await res.json();
      if (data.users) setNewChatResults(data.users);
    } catch (_) { /* ignore */ }
  }

  async function openOrCreateConv(user: OtherUser) {
    try {
      const res = await fetch(`${MESSAGES_URL}?action=open_conv`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({ to_user_id: user.id }),
      });
      const data = await res.json();
      if (data.conv_id) {
        setNewChat(false);
        setNewChatQuery("");
        setNewChatResults([]);
        setOpenConv({ convId: data.conv_id, otherUser: user });
      }
    } catch (_) { /* ignore */ }
  }

  const folderFiltered = (() => {
    if (activeFolder === "all") return conversations;
    if (activeFolder === "unread") return conversations.filter(c => c.unread > 0);
    const folder = folders.find(f => f.id === activeFolder);
    return folder ? conversations.filter(c => folder.convIds.includes(c.id)) : conversations;
  })();

  const filteredConvs = searchQuery.length >= 2
    ? folderFiltered.filter(c => {
        const name = (c.other_user.display_name || c.other_user.username).toLowerCase();
        return name.includes(searchQuery.toLowerCase());
      })
    : folderFiltered;

  if (manageFolders) return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 flex items-center gap-3 border-b border-border/50">
        <button onClick={() => setManageFolders(false)} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
          <Icon name="ChevronLeft" size={20} />
        </button>
        <h1 className="text-base font-bold gradient-text flex-1">Папки чатов</h1>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider px-1">Создать папку</p>
          <div className="flex gap-2">
            <input
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") createFolder(); }}
              placeholder="Название папки..."
              maxLength={20}
              className="flex-1 bg-muted/50 border border-border/50 rounded-xl px-3 py-2 text-sm outline-none focus:border-neon-purple/50 transition-colors placeholder:text-muted-foreground"
            />
            <button
              onClick={createFolder}
              disabled={!newFolderName.trim()}
              className="px-4 py-2 rounded-xl gradient-purple-blue text-white text-sm font-medium disabled:opacity-40 transition-opacity"
            >
              Создать
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider px-1">Мои папки</p>
          {folders.length === 0 && (
            <p className="text-sm text-muted-foreground px-1 py-4 text-center">Нет папок. Создайте первую!</p>
          )}
          {folders.map(folder => (
            <div key={folder.id} className="glass-strong rounded-2xl overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <Icon name={folder.icon as "Folder"} size={18} className="text-neon-purple flex-shrink-0" />
                <span className="flex-1 font-medium text-sm">{folder.name}</span>
                <span className="text-xs text-muted-foreground">{folder.convIds.length} чатов</span>
                <button onClick={() => deleteFolder(folder.id)} className="p-1.5 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors ml-1">
                  <Icon name="Trash2" size={15} />
                </button>
              </div>
              <div className="border-t border-border/30 px-4 py-2 space-y-1 max-h-48 overflow-y-auto">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Добавить/убрать чаты</p>
                {conversations.length === 0 && <p className="text-xs text-muted-foreground py-2">Нет чатов</p>}
                {conversations.map(conv => {
                  const inFolder = folder.convIds.includes(conv.id);
                  return (
                    <button
                      key={conv.id}
                      onClick={() => toggleConvInFolder(folder.id, conv.id)}
                      className="w-full flex items-center gap-3 py-2 px-1 rounded-xl hover:bg-muted/40 transition-all text-left"
                    >
                      <div className={`w-4 h-4 rounded flex items-center justify-center border-2 flex-shrink-0 transition-all ${inFolder ? "gradient-purple-blue border-transparent" : "border-muted-foreground/40"}`}>
                        {inFolder && <Icon name="Check" size={10} className="text-white" />}
                      </div>
                      <UserAvatar user={conv.other_user} size={7} />
                      <span className="text-sm truncate">{conv.other_user.display_name || `@${conv.other_user.username}`}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (openConv) return (
    <ChatView
      convId={openConv.convId}
      otherUser={openConv.otherUser}
      myId={authUser?.id ?? 0}
      onBack={() => { setOpenConv(null); loadConversations(); }}
      hideOnlineStatus={hideOnlineStatus}
      messagePrivacy={messagePrivacy}
      onGoToPrivacy={onGoToPrivacy}
      onCall={onCall}
    />
  );

  // экран "новый чат"
  if (newChat) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <button onClick={() => { setNewChat(false); setNewChatQuery(""); setNewChatResults([]); }} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
              <Icon name="ChevronLeft" size={20} />
            </button>
            <h1 className="text-base font-bold gradient-text flex-1">Новый чат</h1>
          </div>
          <div className="relative">
            <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={newChatQuery}
              onChange={e => { setNewChatQuery(e.target.value); searchUsers(e.target.value); }}
              placeholder="Поиск по @username или имени..."
              className="w-full bg-muted/50 border border-border/50 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-neon-purple/50 transition-colors placeholder:text-muted-foreground"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2">
          {newChatQuery.length < 2 && (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-center px-8">
              <Icon name="Search" size={28} className="text-muted-foreground/40" />
              <p className="text-xs text-muted-foreground">Введите минимум 2 символа для поиска</p>
            </div>
          )}
          {newChatResults.map(user => (
            <button key={user.id} onClick={() => openOrCreateConv(user)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-muted/40 transition-all text-left animate-fade-in">
              <UserAvatar user={user} size={10} />
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-sm truncate">{user.display_name || `@${user.username}`}</div>
                <div className="text-xs text-muted-foreground">@{user.username}</div>
              </div>
            </button>
          ))}
          {newChatQuery.length >= 2 && newChatResults.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 gap-2 text-center px-8">
              <p className="text-sm text-muted-foreground">Пользователи не найдены</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {offline && (
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 border-b border-yellow-500/30 text-yellow-300 text-xs animate-pulse">
          <Icon name="WifiOff" size={13} className="shrink-0" />
          <span>Нет соединения — пытаемся восстановить...</span>
          <span className="ml-auto flex gap-0.5">
            <span className="w-1 h-1 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1 h-1 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1 h-1 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: "300ms" }} />
          </span>
        </div>
      )}
      {reconnected && (
        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border-b border-emerald-500/30 text-emerald-300 text-xs animate-pulse">
          <Icon name="Wifi" size={13} className="shrink-0" />
          <span>Соединение восстановлено</span>
        </div>
      )}
      <div className="px-4 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl gradient-purple-blue flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0 glow-purple">
              {authUser?.avatar_url ? (
                <img src={authUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                authUser ? authUser.username.slice(0, 2).toUpperCase() : "АС"
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold leading-tight truncate">{authUser?.display_name || (authUser ? `@${authUser.username}` : "Сообщения")}</h1>
              {authUser?.status && <p className="text-xs text-muted-foreground truncate">{authUser.status}</p>}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setManageFolders(true)} className="p-2 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-neon-purple" title="Папки">
              <Icon name="FolderOpen" size={18} />
            </button>
            <button onClick={() => setNewChat(true)} className="p-2 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-neon-purple" title="Новый чат">
              <Icon name="SquarePen" size={18} />
            </button>
          </div>
        </div>
        <div className="relative">
          <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Поиск чатов..."
            className="w-full bg-muted/50 border border-border/50 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-neon-purple/50 transition-colors placeholder:text-muted-foreground"
          />
        </div>
      </div>
      <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
        {[...SYSTEM_FOLDERS, ...folders].map(f => {
          const isActive = activeFolder === f.id;
          const count = f.id === "unread"
            ? conversations.filter(c => c.unread > 0).length
            : f.id === "all" ? 0
            : folders.find(x => x.id === f.id)?.convIds.length ?? 0;
          return (
            <button
              key={f.id}
              onClick={() => setActiveFolder(f.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all ${isActive ? "gradient-purple-blue text-white shadow-md" : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            >
              <Icon name={f.icon as "Folder"} size={13} />
              {f.name}
              {count > 0 && (
                <span className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${isActive ? "bg-white/20" : "bg-neon-purple/20 text-neon-purple"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex-1 overflow-y-auto px-2">
        {loading && (
          <div className="flex items-center justify-center h-40">
            <Icon name="Loader2" size={24} className="text-neon-purple animate-spin" />
          </div>
        )}
        {!loading && filteredConvs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8 pb-16">
            <div className="w-16 h-16 rounded-3xl gradient-purple-blue flex items-center justify-center glow-purple">
              <Icon name="MessageCircle" size={28} className="text-white" />
            </div>
            <p className="font-semibold">Нет чатов</p>
            <p className="text-xs text-muted-foreground">Нажмите карандаш сверху, чтобы найти пользователя и начать общение</p>
          </div>
        )}
        {filteredConvs.map(conv => {
          const name = conv.other_user.display_name || `@${conv.other_user.username}`;
          return (
            <button
              key={conv.id}
              onClick={() => setOpenConv({ convId: conv.id, otherUser: conv.other_user })}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-muted/40 transition-all text-left animate-fade-in"
            >
              <div className="relative">
                <UserAvatar user={conv.other_user} size={11} />
                {conv.unread > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full gradient-purple-blue text-white text-[10px] font-bold flex items-center justify-center px-1">
                    {conv.unread > 99 ? "99+" : conv.unread}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm truncate">{name}</span>
                  {conv.last_message && <span className="text-[10px] text-muted-foreground flex-shrink-0">{fmtConvTime(conv.last_message.at)}</span>}
                </div>
                <div className="text-xs text-muted-foreground truncate mt-0.5">
                  {conv.last_message
                    ? (conv.last_message.mine ? `Вы: ${conv.last_message.text}` : conv.last_message.text)
                    : <span className="italic">Нет сообщений</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ContactsTab({ authUser }: { authUser?: AuthUser | null }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl gradient-purple-blue flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0 glow-purple">
              {authUser?.avatar_url ? (
                <img src={authUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                authUser ? authUser.username.slice(0, 2).toUpperCase() : "АС"
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold leading-tight truncate">{authUser?.display_name || (authUser ? `@${authUser.username}` : "Контакты")}</h1>
              {authUser?.status && <p className="text-xs text-muted-foreground truncate">{authUser.status}</p>}
            </div>
          </div>
          <button className="p-2 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-neon-purple">
            <Icon name="UserPlus" size={18} />
          </button>
        </div>
        <div className="relative">
          <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input placeholder="Поиск контактов..." className="w-full bg-muted/50 border border-border/50 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-neon-purple/50 transition-colors placeholder:text-muted-foreground" />
        </div>
      </div>
      <div className="px-4 mb-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">В сети · {CONTACTS.filter(c => c.online).length}</span>
      </div>
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {CONTACTS.map((contact, i) => (
          <div key={contact.id} className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-muted/40 transition-all cursor-pointer group animate-fade-in" style={{ animationDelay: `${i * 0.06}s` }}>
            <Avatar initials={contact.avatar} color={contact.color} online={contact.online} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{contact.name}</div>
              <div className="text-xs text-muted-foreground">{contact.status}</div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-neon-cyan transition-colors">
                <Icon name="Phone" size={14} />
              </button>
              <button className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-neon-purple transition-colors">
                <Icon name="MessageCircle" size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface CallHistoryItem {
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

function CallsTab({ authUser, onCall }: { authUser?: AuthUser | null; onCall?: (user: OtherUser, type: 'video' | 'audio') => void }) {
  const [tab, setTab] = useState<"all" | "missed">("all");
  const [calls, setCalls] = useState<CallHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("auth_token") || "";
    fetchWithTimeout(SIGNALING_URL + "?action=history", { headers: { "X-Session-Token": token } })
      .then(r => r.json())
      .then(d => { if (d.calls) setCalls(d.calls); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = tab === "missed" ? calls.filter(c => c.missed) : calls;

  function fmtCallTime(iso: string | null) {
    if (!iso) return "";
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    const t = d.toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 0) return `Сегодня, ${t}`;
    if (diffDays === 1) return `Вчера, ${t}`;
    if (diffDays < 7) return d.toLocaleDateString('ru', { weekday: 'short' }) + `, ${t}`;
    return d.toLocaleDateString('ru', { day: 'numeric', month: 'short' }) + `, ${t}`;
  }

  function fmtDuration(sec: number | null) {
    if (!sec || sec <= 0) return "";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-2xl gradient-purple-blue flex items-center justify-center text-white text-xs font-bold overflow-hidden flex-shrink-0 glow-purple">
              {authUser?.avatar_url ? (
                <img src={authUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                authUser ? authUser.username.slice(0, 2).toUpperCase() : "АС"
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold leading-tight truncate">{authUser?.display_name || (authUser ? `@${authUser.username}` : "Звонки")}</h1>
              {authUser?.status && <p className="text-xs text-muted-foreground truncate">{authUser.status}</p>}
            </div>
          </div>
        </div>
        <div className="flex gap-2 bg-muted/50 p-1 rounded-xl">
          {(["all", "missed"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t ? "gradient-purple-blue text-white shadow-md" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "all" ? "Все" : "Пропущенные"}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {loading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">Загрузка...</div>
        )}
        {!loading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Icon name="PhoneOff" size={40} className="opacity-20" />
            <p className="text-sm">{tab === "missed" ? "Нет пропущенных звонков" : "История звонков пуста"}</p>
          </div>
        )}
        {filtered.map((call, i) => (
          <div key={call.id} className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-muted/40 transition-all cursor-pointer group animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
            <UserAvatar user={call.other_user} size={10} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm truncate">{call.other_user.display_name || `@${call.other_user.username}`}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Icon name={call.direction === "incoming" ? "PhoneIncoming" : "PhoneOutgoing"} size={12} className={call.missed ? "text-destructive" : "text-emerald-500"} />
                <span className={`text-xs ${call.missed ? "text-destructive" : "text-muted-foreground"}`}>
                  {fmtCallTime(call.created_at)}{fmtDuration(call.duration_sec) && ` · ${fmtDuration(call.duration_sec)}`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Icon name={call.call_type === "video" ? "Video" : "Phone"} size={14} className="text-muted-foreground" />
              <button
                onClick={() => onCall?.(call.other_user, call.call_type)}
                className="ml-1 p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted text-neon-cyan"
                title="Перезвонить"
              >
                <Icon name="PhoneCall" size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusTab() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold gradient-text mb-4">Статусы</h1>
        <div className="glass rounded-2xl p-4 mb-4 border border-neon-purple/20">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-14 h-14 rounded-full gradient-purple-blue flex items-center justify-center text-white font-bold text-lg">Я</div>
              <div className="absolute bottom-0 right-0 w-5 h-5 gradient-cyan-blue rounded-full flex items-center justify-center border-2 border-background">
                <Icon name="Plus" size={10} className="text-white" />
              </div>
            </div>
            <div>
              <div className="font-semibold text-sm">Мой статус</div>
              <div className="text-xs text-muted-foreground">Добавить статус</div>
            </div>
          </div>
        </div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Недавние обновления</div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {STATUSES.map((status, i) => (
          <div key={status.id} className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-muted/40 transition-all cursor-pointer animate-fade-in" style={{ animationDelay: `${i * 0.08}s` }}>
            <div className="relative">
              <div className={`w-12 h-12 rounded-full p-0.5 ${status.viewed ? "bg-muted" : "bg-gradient-to-br from-purple-500 via-pink-500 to-cyan-500"}`}>
                <div className={`w-full h-full rounded-full bg-gradient-to-br ${status.contact.color} flex items-center justify-center text-white text-sm font-semibold`}>
                  {status.contact.avatar}
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 text-base">{status.emoji}</span>
            </div>
            <div className="flex-1">
              <div className="font-semibold text-sm">{status.contact.name}</div>
              <div className="text-xs text-muted-foreground">{status.time} · {status.count} {status.count === 1 ? "обновление" : "обновления"}</div>
            </div>
            {!status.viewed && <div className="w-2 h-2 rounded-full bg-neon-purple" />}
          </div>
        ))}
      </div>
    </div>
  );
}

function MediaTab() {
  const [filter, setFilter] = useState<"all" | "photo" | "video" | "voice">("all");
  const filtered = filter === "all" ? MEDIA_ITEMS : MEDIA_ITEMS.filter(m => m.type === filter);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 space-y-3">
        <h1 className="text-xl font-bold gradient-text">Медиа</h1>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {(["all", "photo", "video", "voice"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${filter === f ? "gradient-purple-blue text-white" : "bg-muted/50 text-muted-foreground hover:text-foreground"}`}>
              {f === "all" && <Icon name="LayoutGrid" size={12} />}
              {f === "photo" && <Icon name="Image" size={12} />}
              {f === "video" && <Icon name="Play" size={12} />}
              {f === "voice" && <Icon name="Mic" size={12} />}
              {f === "all" ? "Все" : f === "photo" ? "Фото" : f === "video" ? "Видео" : "Аудио"}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4">
        <div className="grid grid-cols-3 gap-2">
          {filtered.map((item, i) => (
            <div key={item.id} className={`aspect-square rounded-2xl bg-gradient-to-br ${item.color} flex flex-col items-center justify-center cursor-pointer hover:scale-95 transition-transform animate-scale-in relative overflow-hidden`} style={{ animationDelay: `${i * 0.05}s` }}>
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
              {item.type === "video" && <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-1"><Icon name="Play" size={14} className="text-white ml-0.5" /></div>}
              {item.type === "voice" && <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-1"><Icon name="Mic" size={14} className="text-white" /></div>}
              {item.type === "photo" && <Icon name="Image" size={20} className="text-white/70" />}
              <span className="relative text-[10px] text-white/80 mt-1 font-medium">{item.from.name.split(" ")[0]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

type PrivacyLevel = "all" | "contacts" | "nobody";

function PrivacyRow({ icon, label, value, onChange }: {
  icon: string;
  label: string;
  value: PrivacyLevel;
  onChange: (v: PrivacyLevel) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const labels: Record<PrivacyLevel, string> = { all: "Все", contacts: "Контакты", nobody: "Никто" };

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative flex items-center gap-3 px-4 py-3.5 border-b border-border/30 last:border-0">
      <div className="w-8 h-8 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0">
        <Icon name={icon} size={16} className="text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold">{label}</div>
      </div>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-muted/50 hover:bg-muted transition-colors text-xs font-medium"
      >
        {labels[value]}
        <Icon name="ChevronDown" size={12} className="text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute right-4 top-full mt-1 z-50 glass-strong border border-border/60 rounded-xl overflow-hidden shadow-xl animate-fade-in min-w-[130px]">
          {(["all", "contacts", "nobody"] as PrivacyLevel[]).map(opt => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left ${value === opt ? "text-neon-purple font-medium" : ""}`}
            >
              {labels[opt]}
              {value === opt && <Icon name="Check" size={13} className="text-neon-purple" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileTab({ globalPin, onChangePin, onRemovePin, hideOnlineStatus, onToggleOnlineStatus, messagePrivacy, onMessagePrivacyChange, avatarPrivacy, onAvatarPrivacyChange, callPrivacy, onCallPrivacyChange, authUser, onLogout, onAvatarUpdate, onProfileUpdate }: {
  globalPin: string | null;
  onChangePin: () => void;
  onRemovePin: () => void;
  hideOnlineStatus: boolean;
  onToggleOnlineStatus: () => void;
  messagePrivacy: PrivacyLevel;
  onMessagePrivacyChange: (v: PrivacyLevel) => void;
  avatarPrivacy: PrivacyLevel;
  onAvatarPrivacyChange: (v: PrivacyLevel) => void;
  callPrivacy: PrivacyLevel;
  onCallPrivacyChange: (v: PrivacyLevel) => void;
  authUser?: AuthUser | null;
  onLogout?: () => void;
  onAvatarUpdate?: (url: string) => void;
  onProfileUpdate?: (user: AuthUser) => void;
}) {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [statusValue, setStatusValue] = useState("");
  const [saving, setSaving] = useState(false);

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function handleCropDone(blob: Blob) {
    setCropSrc(null);
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    setAvatarUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = (reader.result as string).split(",")[1];
        const res = await fetch(UPLOAD_AVATAR_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Session-Token": token },
          body: JSON.stringify({ image: base64, contentType: "image/jpeg" }),
        });
        const data = await res.json();
        if (data.avatar_url) {
          onAvatarUpdate?.(data.avatar_url);
        }
      } catch (_) { /* ignore */ }
      setAvatarUploading(false);
    };
    reader.readAsDataURL(blob);
  }

  async function handleDeleteAvatar() {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    setAvatarUploading(true);
    try {
      const res = await fetch(UPLOAD_AVATAR_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({ action: "delete" }),
      });
      const data = await res.json();
      if (!data.error) {
        onAvatarUpdate?.(null as unknown as string);
      }
    } catch (_) { /* ignore */ }
    setAvatarUploading(false);
  }

  async function handleSaveName() {
    const token = localStorage.getItem("auth_token");
    if (!token || !authUser) return;
    setSaving(true);
    try {
      const res = await fetch(UPDATE_PROFILE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({ display_name: nameValue }),
      });
      const data = await res.json();
      if (data.user) onProfileUpdate?.(data.user);
    } catch (_) { /* ignore */ }
    setSaving(false);
    setEditingName(false);
  }

  async function handleSaveStatus() {
    const token = localStorage.getItem("auth_token");
    if (!token || !authUser) return;
    setSaving(true);
    try {
      const res = await fetch(UPDATE_PROFILE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({ status: statusValue }),
      });
      const data = await res.json();
      if (data.user) onProfileUpdate?.(data.user);
    } catch (_) { /* ignore */ }
    setSaving(false);
    setEditingStatus(false);
  }

  const features = [
    { icon: "Shield", label: "Шифрование", desc: "Сквозная защита", color: "text-emerald-400" },
    { icon: "RefreshCw", label: "Синхронизация", desc: "Все устройства", color: "text-blue-400" },
    { icon: "Bell", label: "Уведомления", desc: "Настроены под вас", color: "text-amber-400" },
    { icon: "Users", label: "Группы", desc: "Командная работа", color: "text-purple-400" },
    { icon: "Megaphone", label: "Каналы", desc: "Новости и контент", color: "text-pink-400" },
    { icon: "Smile", label: "Стикеры", desc: "Пакеты эмодзи", color: "text-cyan-400" },
  ];

  return (
    <>
    {cropSrc && (
      <ImageCropModal
        imageSrc={cropSrc}
        onCrop={handleCropDone}
        onCancel={() => setCropSrc(null)}
      />
    )}
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-4 mb-5">
          <div className="relative animate-float">
            <div className="w-20 h-20 rounded-3xl gradient-purple-blue flex items-center justify-center text-white text-2xl font-bold glow-purple overflow-hidden">
              {authUser?.avatar_url ? (
                <img src={authUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                authUser ? authUser.username.slice(0, 2).toUpperCase() : "АС"
              )}
            </div>
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1 -right-1 w-7 h-7 gradient-cyan-blue rounded-xl flex items-center justify-center shadow-lg"
            >
              {avatarUploading ? (
                <Icon name="Loader2" size={13} className="text-white animate-spin" />
              ) : (
                <Icon name="Camera" size={13} className="text-white" />
              )}
            </button>
            {authUser?.avatar_url && !avatarUploading && (
              <button
                onClick={handleDeleteAvatar}
                className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center shadow-md"
              >
                <Icon name="X" size={10} className="text-white" />
              </button>
            )}
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
          </div>
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="flex items-center gap-1.5 mb-1">
                <input
                  autoFocus
                  value={nameValue}
                  onChange={e => setNameValue(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") setEditingName(false); }}
                  placeholder={authUser?.username ?? "Имя"}
                  maxLength={100}
                  className="flex-1 min-w-0 bg-muted/60 rounded-xl px-2.5 py-1 text-sm font-bold outline-none border border-neon-purple/40 focus:border-neon-purple"
                />
                <button onClick={handleSaveName} disabled={saving} className="w-7 h-7 rounded-xl gradient-purple-blue flex items-center justify-center flex-shrink-0">
                  {saving ? <Icon name="Loader2" size={12} className="text-white animate-spin" /> : <Icon name="Check" size={12} className="text-white" />}
                </button>
                <button onClick={() => setEditingName(false)} className="w-7 h-7 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0">
                  <Icon name="X" size={12} className="text-muted-foreground" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 group mb-0.5">
                <h2 className="text-lg font-bold truncate">{authUser?.display_name || (authUser ? `@${authUser.username}` : "Алексей Смирнов")}</h2>
                <button onClick={() => { setNameValue(authUser?.display_name ?? ""); setEditingName(true); }} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <Icon name="Pencil" size={13} className="text-muted-foreground hover:text-neon-purple" />
                </button>
              </div>
            )}
            <p className="text-xs text-muted-foreground truncate">{authUser ? authUser.phone : "+7 (999) 123-45-67"}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${hideOnlineStatus ? "bg-muted-foreground/40" : "bg-emerald-500"}`} />
              <span className={`text-xs font-medium ${hideOnlineStatus ? "text-muted-foreground" : "text-emerald-400"}`}>
                {hideOnlineStatus ? "Скрыт" : "В сети"}
              </span>
            </div>
          </div>
          {onLogout && (
            <button onClick={onLogout} className="w-9 h-9 rounded-xl bg-muted/50 hover:bg-red-500/20 flex items-center justify-center transition-colors group">
              <Icon name="LogOut" size={16} className="text-muted-foreground group-hover:text-red-400 transition-colors" />
            </button>
          )}
        </div>

        <div className="glass rounded-2xl p-3 mb-4 border border-neon-purple/20 group">
          {editingStatus ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={statusValue}
                onChange={e => setStatusValue(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleSaveStatus(); if (e.key === "Escape") setEditingStatus(false); }}
                placeholder="Ваш статус..."
                maxLength={200}
                className="flex-1 bg-transparent text-sm outline-none text-foreground italic"
              />
              <button onClick={handleSaveStatus} disabled={saving} className="w-7 h-7 rounded-xl gradient-purple-blue flex items-center justify-center flex-shrink-0">
                {saving ? <Icon name="Loader2" size={12} className="text-white animate-spin" /> : <Icon name="Check" size={12} className="text-white" />}
              </button>
              <button onClick={() => setEditingStatus(false)} className="w-7 h-7 rounded-xl bg-muted/50 flex items-center justify-center flex-shrink-0">
                <Icon name="X" size={12} className="text-muted-foreground" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <p className="flex-1 text-sm text-muted-foreground italic">"{authUser?.status || "На связи всегда 🚀"}"</p>
              <button onClick={() => { setStatusValue(authUser?.status ?? ""); setEditingStatus(true); }} className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                <Icon name="Pencil" size={13} className="text-muted-foreground hover:text-neon-purple" />
              </button>
            </div>
          )}
        </div>

        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Конфиденциальность</h3>
        <div className="glass rounded-2xl border border-border/40 overflow-hidden mb-4">
          <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/30">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${hideOnlineStatus ? "bg-neon-purple/20" : "bg-muted/50"}`}>
              <Icon name="EyeOff" size={16} className={hideOnlineStatus ? "text-neon-purple" : "text-muted-foreground"} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Скрыть время захода</div>
              <div className="text-xs text-muted-foreground">{hideOnlineStatus ? "Статус скрыт от других" : "Все видят когда вы онлайн"}</div>
            </div>
            <button
              onClick={onToggleOnlineStatus}
              className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${hideOnlineStatus ? "bg-neon-purple" : "bg-muted"}`}
            >
              <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${hideOnlineStatus ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${globalPin ? "bg-neon-purple/20" : "bg-muted/50"}`}>
              <Icon name="Lock" size={16} className={globalPin ? "text-neon-purple" : "text-muted-foreground"} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold">Закрытые чаты</div>
              <div className="text-xs text-muted-foreground">{globalPin ? "Пин-код установлен" : "Пин-код не задан"}</div>
            </div>
            {globalPin ? (
              <div className="flex gap-1.5">
                <button
                  onClick={onChangePin}
                  className="px-3 py-1.5 rounded-xl bg-muted/50 text-xs font-medium hover:bg-muted transition-colors"
                >
                  Изменить
                </button>
                <button
                  onClick={onRemovePin}
                  className="px-3 py-1.5 rounded-xl bg-destructive/10 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors"
                >
                  Удалить
                </button>
              </div>
            ) : (
              <button
                onClick={onChangePin}
                className="px-3 py-1.5 rounded-xl gradient-purple-blue text-white text-xs font-medium"
              >
                Задать
              </button>
            )}
          </div>
        </div>

        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Кто может</h3>
        <div className="glass rounded-2xl border border-border/40 overflow-hidden mb-4">
          <PrivacyRow icon="ImageIcon" label="Видеть аватар" value={avatarPrivacy} onChange={onAvatarPrivacyChange} />
          <PrivacyRow icon="MessageCircle" label="Писать мне" value={messagePrivacy} onChange={onMessagePrivacyChange} />
          <PrivacyRow icon="Phone" label="Звонить мне" value={callPrivacy} onChange={onCallPrivacyChange} />
        </div>

        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Возможности</h3>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {features.map((f, i) => (
            <div key={f.label} className="glass rounded-2xl p-3 flex items-start gap-2.5 hover:border-neon-purple/30 transition-all cursor-pointer animate-fade-in" style={{ animationDelay: `${i * 0.07}s` }}>
              <Icon name={f.icon} size={18} className={f.color} />
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate">{f.label}</div>
                <div className="text-[10px] text-muted-foreground truncate">{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <button className="w-full py-3 rounded-2xl bg-muted/50 border border-border/50 text-muted-foreground text-sm font-medium hover:bg-muted transition-colors flex items-center justify-center gap-2 mb-2">
          <Icon name="Settings" size={16} />
          Настройки
        </button>
        <button className="w-full py-3 rounded-2xl text-destructive text-sm font-medium hover:bg-destructive/10 transition-colors flex items-center justify-center gap-2">
          <Icon name="LogOut" size={16} />
          Выйти
        </button>
      </div>
    </div>
    </>
  );
}

const NAV_ITEMS: { id: Tab; icon: string; label: string }[] = [
  { id: "chats", icon: "MessageCircle", label: "Чаты" },
  { id: "contacts", icon: "Users", label: "Контакты" },
  { id: "calls", icon: "Phone", label: "Звонки" },
  { id: "status", icon: "Circle", label: "Статусы" },
  { id: "media", icon: "Image", label: "Медиа" },
  { id: "profile", icon: "User", label: "Профиль" },
];

interface CallInfo {
  call_id: number;
  caller: { id: number; username: string; display_name?: string | null; avatar_url?: string | null };
  offer?: RTCSessionDescriptionInit;
  call_type?: 'video' | 'audio';
  ice_servers?: RTCIceServer[];
}
interface ActiveCallInfo {
  call_id: number;
  otherUser: { id: number; username: string; display_name?: string | null; avatar_url?: string | null };
  iscaller: boolean;
  peerConnection: RTCPeerConnection;
  localStream: MediaStream;
  remoteStream: MediaStream;
  call_type: 'video' | 'audio';
}

function IncomingCallScreen({ call, onAccept, onDecline }: { call: CallInfo; onAccept: () => void; onDecline: () => void }) {
  const name = call.caller.display_name || `@${call.caller.username}`;

  useEffect(() => {
    if ('vibrate' in navigator) navigator.vibrate([500, 200, 500, 200, 500]);
    return () => { if ('vibrate' in navigator) navigator.vibrate(0); };
  }, []);

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-between py-16 px-8 animate-fade-in" style={{ background: "linear-gradient(160deg, hsl(258 85% 10%) 0%, hsl(222 25% 5%) 50%, hsl(210 100% 8%) 100%)" }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full" style={{ background: "radial-gradient(circle, hsl(258 85% 65% / 0.15) 0%, transparent 70%)", animation: "pulse-ring 2.5s ease-out infinite" }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full" style={{ background: "radial-gradient(circle, hsl(258 85% 65% / 0.12) 0%, transparent 70%)", animation: "pulse-ring 2.5s ease-out infinite 0.6s" }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full" style={{ background: "radial-gradient(circle, hsl(258 85% 65% / 0.1) 0%, transparent 70%)", animation: "pulse-ring 2.5s ease-out infinite 1.2s" }} />
      </div>
      <div className="text-center z-10 mt-4">
        <p className="text-sm text-muted-foreground mb-1 tracking-widest uppercase font-medium">{call.call_type === 'audio' ? 'Входящий аудиозвонок' : 'Входящий видеозвонок'}</p>
        <h2 className="text-3xl font-bold text-white mb-1">{name}</h2>
        <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Icon name={call.call_type === 'audio' ? 'Phone' : 'Video'} size={14} />
          <span className="animate-pulse">Звонит...</span>
        </div>
      </div>
      <div className="relative z-10">
        <UserAvatar user={call.caller} size={28} />
      </div>
      <div className="flex items-center gap-14 z-10">
        <div className="flex flex-col items-center gap-2">
          <button onClick={onDecline} className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-red-500/40">
            <Icon name="PhoneOff" size={26} className="text-white" />
          </button>
          <span className="text-xs text-muted-foreground">Отклонить</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <button onClick={onAccept} className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-emerald-500/40 animate-pulse-glow" style={{ boxShadow: "0 0 20px hsl(142 71% 45% / 0.6), 0 0 40px hsl(142 71% 45% / 0.3)" }}>
            <Icon name="Video" size={26} className="text-white" />
          </button>
          <span className="text-xs text-muted-foreground">Принять</span>
        </div>
      </div>
    </div>
  );
}

function ActiveCallScreen({ call, onEnd }: { call: ActiveCallInfo; onEnd: () => void }) {
  const [muted, setMuted] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [connState, setConnState] = useState<string>(call.peerConnection.connectionState);
  const [elapsed, setElapsed] = useState(0);
  const [elapsedStarted, setElapsedStarted] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const pc = call.peerConnection;
    function onStateChange() {
      setConnState(pc.connectionState);
      if (pc.connectionState === 'connected' && !elapsedStarted) {
        setElapsedStarted(true);
      }
    }
    pc.addEventListener('connectionstatechange', onStateChange);
    return () => pc.removeEventListener('connectionstatechange', onStateChange);
  }, [call.peerConnection, elapsedStarted]);

  useEffect(() => {
    if (!elapsedStarted) return;
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timer);
  }, [elapsedStarted]);

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = call.localStream;
  }, [call.localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = call.remoteStream;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = call.remoteStream;
  }, [call.remoteStream]);

  function toggleMic() {
    call.localStream.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMuted(m => !m);
  }

  function toggleCam() {
    call.localStream.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setCamOff(c => !c);
  }

  async function flipCamera() {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: newFacing }, audio: false });
      const newTrack = newStream.getVideoTracks()[0];
      const sender = call.peerConnection.getSenders().find(s => s.track?.kind === 'video');
      if (sender) await sender.replaceTrack(newTrack);
      call.localStream.getVideoTracks().forEach(t => t.stop());
      call.localStream.getVideoTracks().forEach(t => call.localStream.removeTrack(t));
      call.localStream.addTrack(newTrack);
      if (localVideoRef.current) localVideoRef.current.srcObject = call.localStream;
      setFacingMode(newFacing);
    } catch (_ignored) { /* flip camera not supported */ }
  }

  async function toggleSpeaker() {
    const audio = remoteAudioRef.current || remoteVideoRef.current;
    if (!audio) return;
    const newSpeaker = !speaker;
    if ('setSinkId' in audio && typeof (audio as HTMLMediaElement & { setSinkId: (id: string) => Promise<void> }).setSinkId === 'function') {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const earpiece = devices.find(d => d.kind === 'audiooutput' && d.deviceId === 'default');
        const speakerDevice = devices.find(d => d.kind === 'audiooutput' && d.label.toLowerCase().includes('speaker'));
        const targetId = newSpeaker ? (speakerDevice?.deviceId || '') : (earpiece?.deviceId || 'default');
        await (audio as HTMLMediaElement & { setSinkId: (id: string) => Promise<void> }).setSinkId(targetId);
      } catch (_ignored) { /* setSinkId not supported */ }
    }
    setSpeaker(newSpeaker);
  }

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const name = call.otherUser.display_name || `@${call.otherUser.username}`;
  const isAudio = call.call_type === 'audio';
  const isConnected = connState === 'connected';
  const statusLabel = connState === 'connecting' || connState === 'new' ? 'Соединение...'
    : connState === 'connected' ? fmt(elapsed)
    : connState === 'disconnected' ? 'Переподключение...'
    : connState === 'failed' ? 'Ошибка связи'
    : 'Ожидание...';

  return (
    <div className="absolute inset-0 z-50 flex flex-col animate-fade-in" style={{ background: isAudio ? "linear-gradient(160deg, hsl(258 85% 10%) 0%, hsl(222 25% 5%) 50%, hsl(210 100% 8%) 100%)" : "black" }}>
      {isAudio ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6">
          <UserAvatar user={call.otherUser} size={28} />
          <div className="text-center">
            <p className="text-white text-xl font-bold">{name}</p>
            <p className={`font-mono text-sm mt-1 ${isConnected ? 'text-emerald-400' : 'text-yellow-400 animate-pulse'}`}>{statusLabel}</p>
          </div>
          <audio ref={remoteAudioRef} autoPlay />
        </div>
      ) : (
        <>
          <video ref={remoteVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/30" />
          <div className="absolute top-4 right-4 w-28 h-40 rounded-2xl overflow-hidden border-2 border-white/20 shadow-xl z-10">
            <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" style={{ transform: facingMode === 'user' ? "scaleX(-1)" : "none" }} />
            {camOff && (
              <div className="absolute inset-0 bg-gray-900 flex items-center justify-center">
                <Icon name="VideoOff" size={24} className="text-white/50" />
              </div>
            )}
          </div>
          <div className="relative z-10 flex items-center justify-between px-5 pt-10">
            <div />
            <div className="text-center">
              <p className="text-white font-semibold">{name}</p>
              <p className={`font-mono text-sm ${isConnected ? 'text-emerald-400' : 'text-yellow-400 animate-pulse'}`}>{statusLabel}</p>
            </div>
            <div />
          </div>
        </>
      )}

      <div className="absolute bottom-0 left-0 right-0 z-10 px-8 pb-12">
        <div className="flex items-center justify-center gap-3 mb-6">
          <button onClick={toggleMic} className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${muted ? "bg-white/30 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"}`}>
            <Icon name={muted ? "MicOff" : "Mic"} size={20} />
            <span className="text-[9px]">{muted ? "Вкл." : "Микр."}</span>
          </button>
          {!isAudio && (
            <button onClick={toggleCam} className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${camOff ? "bg-white/30 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"}`}>
              <Icon name={camOff ? "VideoOff" : "Video"} size={20} />
              <span className="text-[9px]">{camOff ? "Вкл." : "Камера"}</span>
            </button>
          )}
          {!isAudio && (
            <button onClick={flipCamera} className="w-14 h-14 rounded-2xl bg-white/10 text-white/70 hover:bg-white/20 flex flex-col items-center justify-center gap-1 transition-all">
              <Icon name="RefreshCw" size={20} />
              <span className="text-[9px]">Flip</span>
            </button>
          )}
          {isAudio && (
            <button onClick={toggleSpeaker} className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${speaker ? "bg-white/30 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"}`}>
              <Icon name={speaker ? "Volume2" : "VolumeX"} size={20} />
              <span className="text-[9px]">{speaker ? "Динамик" : "Трубка"}</span>
            </button>
          )}
        </div>
        <button onClick={onEnd} className="w-full py-4 rounded-2xl bg-red-500 hover:bg-red-400 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/30">
          <Icon name="PhoneOff" size={22} className="text-white" />
          <span className="text-white font-semibold">Завершить</span>
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return null;
    const saved = localStorage.getItem("auth_user");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    fetch(`${AUTH_URL}?action=me`, { headers: { "X-Session-Token": token } })
      .then(r => r.json())
      .then(d => { if (d.user) { setAuthUser(d.user); localStorage.setItem("auth_user", JSON.stringify(d.user)); } else { localStorage.removeItem("auth_token"); localStorage.removeItem("auth_user"); setAuthUser(null); } })
      .catch(() => {});
  }, []);

  function handleAuth(user: AuthUser, _token: string) {
    localStorage.setItem("auth_user", JSON.stringify(user));
    setAuthUser(user);
  }

  function handleLogout() {
    const token = localStorage.getItem("auth_token");
    if (token) fetch(`${AUTH_URL}?action=logout`, { method: "POST", headers: { "X-Session-Token": token } }).catch(() => {});
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setAuthUser(null);
  }

  const [activeTab, setActiveTab] = useState<Tab>("chats");

  const [incomingCall, setIncomingCall] = useState<CallInfo | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCallInfo | null>(null);
  const activeCallRef = useRef<ActiveCallInfo | null>(null);
  const incomingPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const stopRingtoneRef = useRef<(() => void) | null>(null);
  const [globalPin, setGlobalPin] = useState<string | null>(null);
  const [pinPadApp, setPinPadApp] = useState<null | { mode: "enter" | "confirm"; resolve: (pin: string) => void; onSuccess?: () => void }>(null);
  const [hideOnlineStatus, setHideOnlineStatus] = useState(false);
  const [messagePrivacy, setMessagePrivacy] = useState<PrivacyLevel>("all");
  const [avatarPrivacy, setAvatarPrivacy] = useState<PrivacyLevel>("all");
  const [callPrivacy, setCallPrivacy] = useState<PrivacyLevel>("all");

  function stopRingtone() {
    if (stopRingtoneRef.current) { stopRingtoneRef.current(); stopRingtoneRef.current = null; }
    if (audioCtxRef.current) { audioCtxRef.current.close().catch(() => {}); audioCtxRef.current = null; }
  }

  function startRingtone(type: 'incoming' | 'outgoing') {
    stopRingtone();
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      stopRingtoneRef.current = type === 'incoming' ? createRingTone(ctx) : createDialTone(ctx);
    } catch (_e) { /* AudioContext not supported */ }
  }

  // ping — обновляем last_seen каждые 30 сек
  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) return;
    const ping = () => fetch(`${MESSAGES_URL}?action=ping`, { method: "POST", headers: { "X-Session-Token": token } }).catch(() => {});
    ping();
    const id = setInterval(ping, 30000);
    return () => clearInterval(id);
  }, [authUser]);

  // keep-alive: прогрев всех функций каждые 4 минуты чтобы не было cold start
  useEffect(() => {
    if (!authUser) return;
    const warmup = () => {
      fetch(`${AUTH_URL}?action=ping`).catch(() => {});
      const token = localStorage.getItem("auth_token");
      if (token) {
        fetch(`${MESSAGES_URL}?action=ping`, { method: "POST", headers: { "X-Session-Token": token } }).catch(() => {});
        fetch(`${SIGNALING_URL}?action=incoming`, { headers: { "X-Session-Token": token } }).catch(() => {});
      }
    };
    const id = setInterval(warmup, 4 * 60 * 1000);
    return () => clearInterval(id);
  }, [authUser]);

  // Poll for incoming calls
  useEffect(() => {
    if (!authUser) return;
    const token = localStorage.getItem("auth_token") || "";
    incomingPollRef.current = setInterval(async () => {
      if (activeCallRef.current) return;
      try {
        const r = await fetchWithTimeout(SIGNALING_URL + "?action=incoming", { headers: { "X-Session-Token": token } });
        const d = await r.json();
        if (d.call && !activeCallRef.current) {
          setIncomingCall(prev => {
            if (!prev && d.call) {
              startRingtone('incoming');
              if (Notification.permission === 'granted') {
                const callerName = d.call.caller.display_name || `@${d.call.caller.username}`;
                if (activeCallNotification) { activeCallNotification.close(); activeCallNotification = null; }
                try {
                  activeCallNotification = new Notification('📞 Входящий звонок', {
                    body: callerName,
                    icon: d.call.caller.avatar_url || undefined,
                    tag: 'incoming-call',
                    requireInteraction: true,
                    silent: true,
                  });
                  activeCallNotification.onclick = () => { window.focus(); if (activeCallNotification) { activeCallNotification.close(); activeCallNotification = null; } };
                } catch (_e) { /* Notification not supported */ }
              }
            }
            return { ...d.call, ice_servers: d.ice_servers };
          });
        } else if (!d.call) {
          setIncomingCall(prev => {
            if (prev && !activeCallRef.current) {
              stopRingtone();
              return null;
            }
            return prev;
          });
        }
      } catch (_e) { /* ignore poll error */ }
    }, 3000);
    return () => { if (incomingPollRef.current) clearInterval(incomingPollRef.current); };
  }, [authUser]);

  const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ];

  function buildPcConfig(iceServers?: RTCIceServer[]) {
    return { iceServers: iceServers && iceServers.length ? iceServers : DEFAULT_ICE_SERVERS };
  }

  function attachCallHandlers(
    pc: RTCPeerConnection,
    callId: number,
    isCaller: boolean,
    callInfo: ActiveCallInfo,
    token: string,
    onStop: () => void
  ) {
    let iceSeq = 0;
    let pollErrors = 0;
    const MAX_POLL_ERRORS = 5;

    const poll = setInterval(async () => {
      try {
        const sinceParam = isCaller
          ? `since_caller=0&since_callee=${iceSeq}`
          : `since_caller=${iceSeq}&since_callee=0`;
        const r = await fetchWithTimeout(
          `${SIGNALING_URL}?action=status&call_id=${callId}&${sinceParam}`,
          { headers: { "X-Session-Token": token } }
        );
        const d = await r.json();
        pollErrors = 0;

        if (d.status === 'ended' || d.status === 'rejected' || d.status === 'missed') {
          clearInterval(poll);
          clearInterval(hb);
          onStop();
          return;
        }
        if (isCaller && d.answer && !pc.remoteDescription) {
          await pc.setRemoteDescription(new RTCSessionDescription(d.answer));
        }
        if (d.ice && Array.isArray(d.ice) && d.ice.length > 0) {
          for (const c of d.ice) {
            try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (_ignored) { /* bad ICE candidate */ }
          }
          iceSeq = d.ice_seq;
        }
      } catch (_ignored) {
        pollErrors++;
        if (pollErrors >= MAX_POLL_ERRORS) {
          clearInterval(poll);
          clearInterval(hb);
          onStop();
        }
      }
    }, 1500);

    const hb = setInterval(async () => {
      try {
        await fetchWithTimeout(SIGNALING_URL + "?action=heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Session-Token": token },
          body: JSON.stringify({ call_id: callId }),
        });
      } catch (_ignored) { /* heartbeat error */ }
    }, 10000);

    pc.onicecandidate = async e => {
      if (e.candidate) {
        try {
          await fetchWithTimeout(SIGNALING_URL + "?action=ice", {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Session-Token": token },
            body: JSON.stringify({ call_id: callId, candidate: e.candidate.toJSON() }),
          });
        } catch (_ignored) { /* ICE send error */ }
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        clearInterval(poll);
        clearInterval(hb);
        onStop();
      }
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'disconnected') {
        pc.restartIce();
      }
    };

    return () => { clearInterval(poll); clearInterval(hb); };
  }

  async function startCall(target: OtherUser, callType: 'video' | 'audio' = 'video') {
    const token = localStorage.getItem("auth_token") || "";
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: callType === 'video', audio: true });

      const tempPc = new RTCPeerConnection({ iceServers: DEFAULT_ICE_SERVERS });
      stream.getTracks().forEach(t => tempPc.addTrack(t, stream));
      const offer = await tempPc.createOffer();
      await tempPc.setLocalDescription(offer);
      tempPc.close();

      const res = await fetchWithTimeout(SIGNALING_URL + "?action=call", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({ callee_id: target.id, offer, call_type: callType }),
      });
      const data = await res.json();
      if (!data.call_id) { stream.getTracks().forEach(t => t.stop()); return; }

      const pc = new RTCPeerConnection(buildPcConfig(data.ice_servers));
      const remoteStream = new MediaStream();
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      pc.ontrack = e => e.streams[0].getTracks().forEach(t => remoteStream.addTrack(t));
      await pc.setLocalDescription(offer);

      const callInfo: ActiveCallInfo = {
        call_id: data.call_id, otherUser: target, iscaller: true,
        peerConnection: pc, localStream: stream, remoteStream, call_type: callType,
      };
      activeCallRef.current = callInfo;
      setActiveCall(callInfo);
      startRingtone('outgoing');

      attachCallHandlers(pc, data.call_id, true, callInfo, token, () => stopCall(callInfo));
    } catch (_ignored) { /* startCall error */ }
  }

  async function handleAccept() {
    if (!incomingCall) return;
    stopRingtone();
    if (activeCallNotification) { activeCallNotification.close(); activeCallNotification = null; }
    const token = localStorage.getItem("auth_token") || "";
    const savedCall = incomingCall;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: (savedCall.call_type || 'video') === 'video', audio: true,
      });

      const pc = new RTCPeerConnection(buildPcConfig(savedCall.ice_servers));
      const remoteStream = new MediaStream();
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      pc.ontrack = e => e.streams[0].getTracks().forEach(t => remoteStream.addTrack(t));

      await pc.setRemoteDescription(new RTCSessionDescription(savedCall.offer!));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await fetchWithTimeout(SIGNALING_URL + "?action=answer", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({ call_id: savedCall.call_id, answer }),
      });

      const callInfo: ActiveCallInfo = {
        call_id: savedCall.call_id, otherUser: savedCall.caller, iscaller: false,
        peerConnection: pc, localStream: stream, remoteStream, call_type: savedCall.call_type || 'video',
      };
      activeCallRef.current = callInfo;
      setIncomingCall(null);
      setActiveCall(callInfo);

      attachCallHandlers(pc, savedCall.call_id, false, callInfo, token, () => stopCall(callInfo));
    } catch (_ignored) {
      await fetchWithTimeout(SIGNALING_URL + "?action=reject", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({ call_id: savedCall.call_id }),
      }).catch(() => { /* ignore */ });
      setIncomingCall(null);
    }
  }

  async function handleDecline() {
    if (!incomingCall) return;
    stopRingtone();
    if (activeCallNotification) { activeCallNotification.close(); activeCallNotification = null; }
    const token = localStorage.getItem("auth_token") || "";
    try {
      await fetchWithTimeout(SIGNALING_URL + "?action=reject", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({ call_id: incomingCall.call_id }),
      });
    } catch (_e) { /* ignore decline error */ }
    setIncomingCall(null);
  }

  function stopCall(callInfo: ActiveCallInfo) {
    stopRingtone();
    if (activeCallNotification) { activeCallNotification.close(); activeCallNotification = null; }
    callInfo.localStream.getTracks().forEach(t => t.stop());
    callInfo.peerConnection.close();
    if (activeCallRef.current?.call_id === callInfo.call_id) {
      activeCallRef.current = null;
      setActiveCall(null);
    }
  }

  async function handleEndCall() {
    const call = activeCallRef.current || activeCall;
    if (!call) return;
    const token = localStorage.getItem("auth_token") || "";
    try {
      await fetchWithTimeout(SIGNALING_URL + "?action=end", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Session-Token": token },
        body: JSON.stringify({ call_id: call.call_id }),
      });
    } catch (_e) { /* ignore end call error */ }
    stopCall(call);
  }

  function requestSetPin() {
    if (globalPin) {
      setPinPadApp({
        mode: "enter",
        resolve: (entered) => {
          if (entered !== globalPin) return;
          setPinPadApp({
            mode: "confirm",
            resolve: (newPin) => { setGlobalPin(newPin); setPinPadApp(null); },
          });
        },
      });
    } else {
      setPinPadApp({ mode: "confirm", resolve: (pin) => { setGlobalPin(pin); setPinPadApp(null); } });
    }
  }

  function removePin() {
    if (globalPin) {
      setPinPadApp({
        mode: "enter",
        resolve: (entered) => {
          if (entered !== globalPin) return;
          setGlobalPin(null);
          setPinPadApp(null);
        },
      });
    }
  }

  const renderTab = () => {
    switch (activeTab) {
      case "chats": return <ChatsTab sharedPin={globalPin} onPinCreated={setGlobalPin} hideOnlineStatus={hideOnlineStatus} messagePrivacy={messagePrivacy} onGoToPrivacy={() => setActiveTab("profile")} authUser={authUser} onCall={startCall} />;
      case "contacts": return <ContactsTab authUser={authUser} />;
      case "calls": return <CallsTab authUser={authUser} onCall={startCall} />;
      case "status": return <StatusTab />;
      case "media": return <MediaTab />;
      case "profile": return <ProfileTab globalPin={globalPin} onChangePin={requestSetPin} onRemovePin={removePin} hideOnlineStatus={hideOnlineStatus} onToggleOnlineStatus={() => setHideOnlineStatus(v => !v)} messagePrivacy={messagePrivacy} onMessagePrivacyChange={setMessagePrivacy} avatarPrivacy={avatarPrivacy} onAvatarPrivacyChange={setAvatarPrivacy} callPrivacy={callPrivacy} onCallPrivacyChange={setCallPrivacy} authUser={authUser} onLogout={handleLogout} onAvatarUpdate={(url) => { const updated = { ...authUser!, avatar_url: url ?? null }; setAuthUser(updated); localStorage.setItem("auth_user", JSON.stringify(updated)); }} onProfileUpdate={(user) => { const updated = { ...authUser!, ...user }; setAuthUser(updated); localStorage.setItem("auth_user", JSON.stringify(updated)); }} />;
    }
  };

  if (!authUser) return <AuthPage onAuth={handleAuth} />;

  return (
    <div className="h-screen w-screen mesh-bg flex items-center justify-center overflow-hidden font-golos">
      <div className="w-full max-w-sm h-full md:h-[820px] md:max-h-screen flex flex-col glass-strong md:rounded-3xl overflow-hidden md:shadow-2xl md:shadow-black/60 relative">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-purple/60 to-transparent z-10" />

        <div className="flex-1 overflow-hidden">
          {renderTab()}
        </div>

        <div className="glass-strong border-t border-border/50 px-2 py-2">
          <div className="flex items-center justify-around">
            {NAV_ITEMS.map(item => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex flex-col items-center gap-0.5 px-2.5 py-2 rounded-2xl transition-all duration-200 ${isActive ? "nav-active" : "text-muted-foreground hover:text-foreground hover:bg-muted/30"}`}
                >
                  {item.id === "profile" && authUser ? (
                    <div className={`w-5 h-5 rounded-lg gradient-purple-blue flex items-center justify-center text-white text-[9px] font-bold overflow-hidden ${isActive ? "ring-2 ring-neon-purple/60" : ""}`}>
                      {authUser.avatar_url ? (
                        <img src={authUser.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        authUser.username.slice(0, 2).toUpperCase()
                      )}
                    </div>
                  ) : (
                    <Icon name={item.icon} size={20} className={isActive ? "text-neon-purple" : ""} />
                  )}
                  <span className={`text-[9px] font-medium ${isActive ? "text-neon-purple" : ""}`}>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-blue/30 to-transparent" />

        {pinPadApp && (
          <PinPad
            mode={pinPadApp.mode}
            existingPin={globalPin ?? undefined}
            title={pinPadApp.mode === "enter" ? "Введите текущий пин-код" : undefined}
            onSuccess={(pin) => { if (pin) pinPadApp.resolve(pin); }}
            onCancel={() => setPinPadApp(null)}
          />
        )}
        {incomingCall && (
          <IncomingCallScreen call={incomingCall} onAccept={handleAccept} onDecline={handleDecline} />
        )}
        {activeCall && (
          <ActiveCallScreen call={activeCall} onEnd={handleEndCall} />
        )}
      </div>
    </div>
  );
}