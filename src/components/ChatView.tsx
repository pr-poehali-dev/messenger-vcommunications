import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import {
  MESSAGES_URL, SYSTEM_FOLDERS,
  fetchWithTimeout, fetchWithRetry,
  fmtMsgTime, fmtLastSeen, fmtConvTime,
  playNotification, showPushNotification, requestNotificationPermission,
  loadFolders, saveFolders,
  type AuthUser, type OtherUser, type RealMessage, type Conversation,
  type ChatFolder, type PrivacyLevel,
} from "@/lib/constants";

type PinPadMode = "enter" | "set" | "confirm";

export function UserAvatar({ user, size = 10 }: { user: OtherUser; size?: number }) {
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

export function Avatar({ initials, color, size = "md", online = false }: { initials: string; color: string; size?: "sm" | "md" | "lg" | "xl"; online?: boolean }) {
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

export function VoiceBubble({ url, duration, out }: { url: string; duration: number; out: boolean }) {
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

export function PinPad({ mode, onSuccess, onCancel, existingPin, title: titleProp }: {
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
        </div>
        <div className="grid grid-cols-3 gap-3">
          <button onClick={onCancel}
            className="h-14 rounded-2xl text-muted-foreground hover:bg-white/5 transition-all text-sm">
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

export function ChatView({ convId, otherUser, myId, onBack, hideOnlineStatus, messagePrivacy, onGoToPrivacy, onCall }: {
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

export function ChatRow({ chat, onOpen, onArchive, onUnarchive, archived, pinned, muted, onPin, onMute, locked, onLock }: {
  chat: typeof import("@/lib/constants").CHATS[0];
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
          <button onClick={() => { setMenuOpen(false); onOpen(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left rounded-lg">
            <Icon name="MessageCircle" size={15} className="text-blue-400" />
            Открыть чат
          </button>
          {!archived && (
            <button onClick={() => { setMenuOpen(false); onPin?.(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left rounded-lg">
              <Icon name={pinned ? "PinOff" : "Pin"} size={15} className="text-yellow-400" />
              {pinned ? "Открепить" : "Закрепить"}
            </button>
          )}
          <button onClick={() => { setMenuOpen(false); onMute?.(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left rounded-lg">
            <Icon name={muted ? "Bell" : "BellOff"} size={15} className="text-green-400" />
            {muted ? "Включить звук" : "Заглушить"}
          </button>
          <button onClick={() => { setMenuOpen(false); onLock?.(); }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-muted/50 transition-colors text-left rounded-lg">
            <Icon name={locked ? "LockOpen" : "Lock"} size={15} className="text-purple-400" />
            {locked ? "Снять блокировку" : "Закрыть чат"}
          </button>
          <div className="border-t border-border/40 my-0.5" />
          <button onClick={() => { setMenuOpen(false); if (archived) { onUnarchive?.(); } else { onArchive?.(); } }} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-red-500/10 text-red-400 transition-colors text-left rounded-lg">
            <Icon name={archived ? "ArchiveRestore" : "Archive"} size={15} className="text-red-400" />
            {archived ? "Восстановить" : "В архив"}
          </button>
        </div>
      )}
    </div>
  );
}

export function ChatsTab({ sharedPin, onPinCreated, hideOnlineStatus, messagePrivacy, onGoToPrivacy, authUser, onCall }: {
  sharedPin: string | null;
  onPinCreated: (pin: string) => void;
  hideOnlineStatus?: boolean;
  messagePrivacy?: PrivacyLevel;
  onGoToPrivacy?: () => void;
  authUser?: AuthUser | null;
  onCall?: (user: OtherUser, type: 'video' | 'audio') => void;
}) {
  const [openConv, setOpenConv] = useState<{ convId: number; otherUser: OtherUser } | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [newChat, setNewChat] = useState(false);
  const [newChatQuery, setNewChatQuery] = useState("");
  const [newChatResults, setNewChatResults] = useState<OtherUser[]>([]);
  const [offline, setOffline] = useState(false);
  const [reconnected, setReconnected] = useState(false);
  const [activeFolder, setActiveFolder] = useState("all");
  const [folders, setFolders] = useState<ChatFolder[]>(() => loadFolders(authUser?.id ?? 0));
  const [manageFolders, setManageFolders] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
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
          <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
            <Icon name="MessageCircle" size={40} className="opacity-20" />
            <p className="text-sm">{searchQuery ? "Чаты не найдены" : "Нет чатов. Начните общение!"}</p>
          </div>
        )}
        {filteredConvs.map((conv, i) => (
          <button
            key={conv.id}
            onClick={() => setOpenConv({ convId: conv.id, otherUser: conv.other_user })}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-muted/40 transition-all text-left animate-fade-in"
            style={{ animationDelay: `${i * 0.04}s` }}
          >
            <UserAvatar user={conv.other_user} size={10} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="font-semibold text-sm truncate">{conv.other_user.display_name || `@${conv.other_user.username}`}</span>
                <span className="text-[11px] text-muted-foreground flex-shrink-0 ml-2">
                  {conv.last_message?.at ? fmtConvTime(conv.last_message.at) : ""}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground truncate">
                  {conv.last_message ? (conv.last_message.mine ? "Вы: " : "") + conv.last_message.text : "Нет сообщений"}
                </span>
                {conv.unread > 0 && (
                  <span className="flex-shrink-0 min-w-5 h-5 text-[10px] font-bold rounded-full gradient-purple-blue text-white flex items-center justify-center px-1.5">
                    {conv.unread}
                  </span>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
