import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";

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
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
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

function ChatView({ chatId, onBack, hideOnlineStatus }: { chatId: number; onBack: () => void; hideOnlineStatus?: boolean }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(MESSAGES[chatId] || []);
  const [typing, setTyping] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const mediaRecRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chat = CHATS.find(c => c.id === chatId)!;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => () => {
    mediaRecRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  function sendReply(id: number) {
    setTyping(true);
    setTimeout(() => {
      const replies = REPLIES[chatId] || ["Ок!", "Понял!", "Спасибо!"];
      const reply = replies[Math.floor(Math.random() * replies.length)];
      setTyping(false);
      playNotification();
      setMessages(prev => [...prev, { id: id + 1, text: reply, out: false, time: getNow() }]);
    }, 1200 + Math.random() * 800);
  }

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    const newId = Date.now();
    setMessages(prev => [...prev, { id: newId, text, out: true, time: getNow() }]);
    setInput("");
    sendReply(newId);
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        const dur = recSeconds || 1;
        const newId = Date.now();
        setMessages(prev => [...prev, { id: newId, text: "", out: true, time: getNow(), voice: { url, duration: dur } }]);
        setRecording(false);
        setRecSeconds(0);
        sendReply(newId);
      };
      mr.start();
      mediaRecRef.current = mr;
      setRecording(true);
      setRecSeconds(0);
      timerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000);
    } catch (e) { void e; }
  }

  function stopRecording() {
    mediaRecRef.current?.stop();
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }

  function cancelRecording() {
    if (mediaRecRef.current) {
      mediaRecRef.current.onstop = null;
      mediaRecRef.current.stop();
      mediaRecRef.current.stream?.getTracks().forEach(t => t.stop());
    }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRecording(false);
    setRecSeconds(0);
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex flex-col h-full animate-slide-in-right">
      <div className="glass-strong px-4 py-3 flex items-center gap-3 border-b border-border/50">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
          <Icon name="ChevronLeft" size={20} />
        </button>
        <Avatar initials={chat.contact.avatar} color={chat.contact.color} online={!hideOnlineStatus && chat.contact.online} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm truncate">{chat.contact.name}</div>
          <div className="text-xs text-muted-foreground">
            {typing ? <span className="text-neon-purple animate-pulse">печатает...</span> : (hideOnlineStatus ? chat.contact.status : (chat.contact.online ? "В сети" : chat.contact.status))}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-neon-cyan">
            <Icon name="Phone" size={18} />
          </button>
          <button className="p-2 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-neon-purple">
            <Icon name="Video" size={18} />
          </button>
          <button className="p-2 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
            <Icon name="MoreVertical" size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 mesh-bg">
        {messages.map((msg, i) => (
          <div key={msg.id} className={`flex ${msg.out ? "justify-end" : "justify-start"} animate-fade-in`} style={{ animationDelay: `${i * 0.05}s` }}>
            <div className={`max-w-[72%] px-4 py-2.5 shadow-lg ${msg.out ? "msg-bubble-out text-white" : "msg-bubble-in text-foreground"}`}>
              {msg.voice
                ? <VoiceBubble url={msg.voice.url} duration={msg.voice.duration} out={msg.out} />
                : <p className="text-sm leading-relaxed">{msg.text}</p>
              }
              <div className={`flex items-center justify-end gap-1 mt-1 ${msg.out ? "text-white/60" : "text-muted-foreground"}`}>
                <span className="text-[10px]">{msg.time}</span>
                {msg.out && <Icon name="CheckCheck" size={12} />}
              </div>
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start animate-fade-in">
            <div className="msg-bubble-in px-4 py-3 shadow-lg flex gap-1 items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="glass-strong px-4 py-3 border-t border-border/50">
        {recording ? (
          <div className="flex items-center gap-3">
            <button onClick={cancelRecording} className="p-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors">
              <Icon name="X" size={20} />
            </button>
            <div className="flex-1 flex items-center gap-2 bg-muted/50 border border-red-500/40 rounded-2xl px-4 py-2.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
              <span className="text-sm text-red-400 font-medium">{fmt(recSeconds)}</span>
              <span className="text-xs text-muted-foreground ml-1">Запись...</span>
            </div>
            <button
              onClick={stopRecording}
              className="p-2.5 rounded-xl gradient-purple-blue text-white glow-purple transition-all"
            >
              <Icon name="Send" size={18} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-xl text-muted-foreground hover:text-neon-purple transition-colors">
              <Icon name="Smile" size={20} />
            </button>
            <button className="p-2 rounded-xl text-muted-foreground hover:text-neon-cyan transition-colors">
              <Icon name="Paperclip" size={20} />
            </button>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
              placeholder="Написать сообщение..."
              className="flex-1 bg-muted/50 border border-border/50 rounded-2xl px-4 py-2.5 text-sm outline-none focus:border-neon-purple/60 transition-colors placeholder:text-muted-foreground"
            />
            {input.trim() ? (
              <button onClick={sendMessage} className="p-2.5 rounded-xl gradient-purple-blue text-white glow-purple transition-all">
                <Icon name="Send" size={18} />
              </button>
            ) : (
              <button onClick={startRecording} className="p-2.5 rounded-xl bg-muted text-muted-foreground hover:text-neon-purple hover:bg-neon-purple/10 transition-all">
                <Icon name="Mic" size={20} />
              </button>
            )}
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
        <div className="absolute right-2 top-full mt-1 z-50 glass-strong border border-border/60 rounded-xl overflow-hidden shadow-xl animate-fade-in min-w-[170px]">
          <button
            onClick={() => { setMenuOpen(false); onOpen(); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left"
          >
            <Icon name="MessageCircle" size={15} className="text-muted-foreground" />
            Открыть чат
          </button>
          {!archived && (
            <button
              onClick={() => { setMenuOpen(false); onPin?.(); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left"
            >
              <Icon name={pinned ? "PinOff" : "Pin"} size={15} className="text-muted-foreground" />
              {pinned ? "Открепить" : "Закрепить"}
            </button>
          )}
          <button
            onClick={() => { setMenuOpen(false); onMute?.(); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left"
          >
            <Icon name={muted ? "Bell" : "BellOff"} size={15} className="text-muted-foreground" />
            {muted ? "Включить звук" : "Заглушить"}
          </button>
          <button
            onClick={() => { setMenuOpen(false); onLock?.(); }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left"
          >
            <Icon name={locked ? "LockOpen" : "Lock"} size={15} className="text-muted-foreground" />
            {locked ? "Снять блокировку" : "Закрыть чат"}
          </button>
          <div className="border-t border-border/40" />
          <button
            onClick={() => { setMenuOpen(false); if (archived) { onUnarchive?.(); } else { onArchive?.(); } }}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-muted/50 transition-colors text-left"
          >
            <Icon name={archived ? "ArchiveRestore" : "Archive"} size={15} className="text-muted-foreground" />
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

function ChatsTab({ sharedPin, onPinCreated, hideOnlineStatus }: { sharedPin: string | null; onPinCreated: (pin: string) => void; hideOnlineStatus?: boolean }) {
  const [openChat, setOpenChat] = useState<number | null>(null);
  const [archived, setArchived] = useState<number[]>([]);
  const [pinned, setPinned] = useState<number[]>([]);
  const [muted, setMuted] = useState<number[]>([]);
  const [locked, setLocked] = useState<number[]>([]);
  const globalPin = sharedPin;
  const [showArchive, setShowArchive] = useState(false);
  const [showLocked, setShowLocked] = useState(false);
  const [pinPad, setPinPad] = useState<null | { mode: "set" | "enter" | "confirm"; chatId?: number; action?: "lock" | "unlock" | "open" | "view" }>(null);
  const [unlockedSession, setUnlockedSession] = useState(false);

  if (openChat !== null) return <ChatView chatId={openChat} onBack={() => { setOpenChat(null); setUnlockedSession(false); }} hideOnlineStatus={hideOnlineStatus} />;

  const activeChats = CHATS
    .filter(c => !archived.includes(c.id) && !locked.includes(c.id))
    .sort((a, b) => (pinned.includes(a.id) ? 0 : 1) - (pinned.includes(b.id) ? 0 : 1));
  const archivedChats = CHATS.filter(c => archived.includes(c.id));
  const lockedChats = CHATS.filter(c => locked.includes(c.id));

  function archiveChat(id: number) { setArchived(prev => [...prev, id]); }
  function unarchiveChat(id: number) { setArchived(prev => prev.filter(x => x !== id)); }
  function togglePin(id: number) { setPinned(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); }
  function toggleMute(id: number) { setMuted(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]); }

  function requestLock(chatId: number) {
    if (!globalPin) {
      setPinPad({ mode: "confirm", chatId, action: "lock" });
    } else {
      setLocked(prev => [...prev, chatId]);
    }
  }

  function requestUnlock(chatId: number) {
    setPinPad({ mode: "enter", chatId, action: "unlock" });
  }

  function requestOpenLocked(chatId: number) {
    if (unlockedSession) { setOpenChat(chatId); return; }
    setPinPad({ mode: "enter", chatId, action: "open" });
  }

  function requestViewLocked() {
    if (unlockedSession) { setShowLocked(true); return; }
    setPinPad({ mode: "enter", action: "view" });
  }

  function onPinSuccess(pin?: string) {
    if (!pinPad) return;
    if (pinPad.mode === "confirm" && pin) {
      onPinCreated(pin);
      if (pinPad.chatId) setLocked(prev => [...prev, pinPad.chatId!]);
    } else if (pinPad.action === "unlock" && pinPad.chatId) {
      setLocked(prev => prev.filter(x => x !== pinPad.chatId));
    } else if (pinPad.action === "open" && pinPad.chatId) {
      setUnlockedSession(true);
      setOpenChat(pinPad.chatId);
    } else if (pinPad.action === "view") {
      setUnlockedSession(true);
      setShowLocked(true);
    }
    setPinPad(null);
  }

  if (showArchive) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-4 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowArchive(false)} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
              <Icon name="ChevronLeft" size={20} />
            </button>
            <h1 className="text-xl font-bold gradient-text flex-1">Архив</h1>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2">
          {archivedChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
              <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
                <Icon name="Archive" size={24} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Архив пустой</p>
            </div>
          ) : (
            archivedChats.map(chat => (
              <ChatRow
                key={chat.id}
                chat={chat}
                onOpen={() => setOpenChat(chat.id)}
                onUnarchive={() => unarchiveChat(chat.id)}
                onMute={() => toggleMute(chat.id)}
                muted={muted.includes(chat.id)}
                archived
              />
            ))
          )}
        </div>
      </div>
    );
  }

  if (showLocked) {
    return (
      <div className="relative flex flex-col h-full">
        {pinPad && (
          <PinPad
            mode={pinPad.mode}
            existingPin={globalPin ?? undefined}
            onSuccess={onPinSuccess}
            onCancel={() => setPinPad(null)}
          />
        )}
        <div className="px-4 py-4 space-y-3">
          <div className="flex items-center gap-3">
            <button onClick={() => { setShowLocked(false); setUnlockedSession(false); }} className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
              <Icon name="ChevronLeft" size={20} />
            </button>
            <h1 className="text-xl font-bold gradient-text flex-1">Закрытые чаты</h1>
            <div className="w-6 h-6 rounded-full bg-neon-purple/20 flex items-center justify-center">
              <Icon name="Lock" size={12} className="text-neon-purple" />
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-2">
          {lockedChats.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-8">
              <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
                <Icon name="Lock" size={24} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Нет закрытых чатов</p>
            </div>
          ) : (
            lockedChats.map(chat => (
              <ChatRow
                key={chat.id}
                chat={chat}
                onOpen={() => setOpenChat(chat.id)}
                onMute={() => toggleMute(chat.id)}
                onLock={() => requestUnlock(chat.id)}
                muted={muted.includes(chat.id)}
                locked
              />
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col h-full">
      {pinPad && (
        <PinPad
          mode={pinPad.mode}
          existingPin={globalPin ?? undefined}
          onSuccess={onPinSuccess}
          onCancel={() => setPinPad(null)}
        />
      )}
      <div className="px-4 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold gradient-text">Сообщения</h1>
          <div className="flex gap-1">
            <button className="p-2 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
              <Icon name="Search" size={18} />
            </button>
            <button className="p-2 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-neon-purple">
              <Icon name="SquarePen" size={18} />
            </button>
          </div>
        </div>
        <div className="relative">
          <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input placeholder="Поиск чатов..." className="w-full bg-muted/50 border border-border/50 rounded-xl pl-9 pr-4 py-2 text-sm outline-none focus:border-neon-purple/50 transition-colors placeholder:text-muted-foreground" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-2">
        {lockedChats.length > 0 && (
          <button
            onClick={requestViewLocked}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-muted/40 transition-all text-left mb-1 animate-fade-in"
          >
            <div className="w-10 h-10 rounded-full bg-neon-purple/10 border border-neon-purple/20 flex items-center justify-center flex-shrink-0">
              <Icon name="Lock" size={18} className="text-neon-purple" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-sm">Закрытые чаты</span>
              <div className="text-xs text-muted-foreground">{lockedChats.length} {lockedChats.length === 1 ? "чат" : "чата"} · защищено пин-кодом</div>
            </div>
            <Icon name="ChevronRight" size={16} className="text-muted-foreground flex-shrink-0" />
          </button>
        )}
        {archivedChats.length > 0 && (
          <button
            onClick={() => setShowArchive(true)}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-muted/40 transition-all text-left mb-1 animate-fade-in"
          >
            <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center flex-shrink-0">
              <Icon name="Archive" size={18} className="text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="font-semibold text-sm">Архив</span>
              <div className="text-xs text-muted-foreground">{archivedChats.length} {archivedChats.length === 1 ? "чат" : "чата"}</div>
            </div>
            <Icon name="ChevronRight" size={16} className="text-muted-foreground flex-shrink-0" />
          </button>
        )}
        {activeChats.filter(c => pinned.includes(c.id)).length > 0 && (
          <>
            <div className="flex items-center gap-2 px-3 pt-1 pb-0.5">
              <Icon name="Pin" size={11} className="text-muted-foreground/60" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">Закреплённые</span>
            </div>
            {activeChats.filter(c => pinned.includes(c.id)).map(chat => (
              <ChatRow
                key={chat.id}
                chat={chat}
                onOpen={() => setOpenChat(chat.id)}
                onArchive={() => archiveChat(chat.id)}
                onPin={() => togglePin(chat.id)}
                onMute={() => toggleMute(chat.id)}
                onLock={() => requestLock(chat.id)}
                pinned
                muted={muted.includes(chat.id)}
              />
            ))}
            <div className="mx-3 my-1 border-t border-border/30" />
          </>
        )}
        {activeChats.filter(c => !pinned.includes(c.id)).map(chat => (
          <ChatRow
            key={chat.id}
            chat={chat}
            onOpen={() => setOpenChat(chat.id)}
            onArchive={() => archiveChat(chat.id)}
            onPin={() => togglePin(chat.id)}
            onMute={() => toggleMute(chat.id)}
            onLock={() => requestLock(chat.id)}
            pinned={false}
            muted={muted.includes(chat.id)}
          />
        ))}
      </div>
    </div>
  );
}

function ContactsTab() {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold gradient-text">Контакты</h1>
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

function CallsTab() {
  const [tab, setTab] = useState<"all" | "missed">("all");
  const filtered = tab === "missed" ? CALLS.filter(c => c.missed) : CALLS;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold gradient-text">Звонки</h1>
          <button className="p-2 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-neon-cyan">
            <Icon name="PhoneCall" size={18} />
          </button>
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
        {filtered.map((call, i) => (
          <div key={call.id} className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-muted/40 transition-all cursor-pointer group animate-fade-in" style={{ animationDelay: `${i * 0.07}s` }}>
            <Avatar initials={call.contact.avatar} color={call.contact.color} />
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{call.contact.name}</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Icon name={call.direction === "incoming" ? "PhoneIncoming" : "PhoneOutgoing"} size={12} className={call.missed ? "text-destructive" : "text-emerald-500"} />
                <span className={`text-xs ${call.missed ? "text-destructive" : "text-muted-foreground"}`}>
                  {call.time}{call.duration && ` · ${call.duration}`}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {call.type === "video" ? <Icon name="Video" size={14} className="text-muted-foreground" /> : <Icon name="Phone" size={14} className="text-muted-foreground" />}
              <button className="ml-1 p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted text-neon-cyan">
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

function ProfileTab({ globalPin, onChangePin, onRemovePin, hideOnlineStatus, onToggleOnlineStatus }: {
  globalPin: string | null;
  onChangePin: () => void;
  onRemovePin: () => void;
  hideOnlineStatus: boolean;
  onToggleOnlineStatus: () => void;
}) {
  const [avatarPrivacy, setAvatarPrivacy] = useState<PrivacyLevel>("all");
  const [messagePrivacy, setMessagePrivacy] = useState<PrivacyLevel>("all");
  const [callPrivacy, setCallPrivacy] = useState<PrivacyLevel>("all");

  const features = [
    { icon: "Shield", label: "Шифрование", desc: "Сквозная защита", color: "text-emerald-400" },
    { icon: "RefreshCw", label: "Синхронизация", desc: "Все устройства", color: "text-blue-400" },
    { icon: "Bell", label: "Уведомления", desc: "Настроены под вас", color: "text-amber-400" },
    { icon: "Users", label: "Группы", desc: "Командная работа", color: "text-purple-400" },
    { icon: "Megaphone", label: "Каналы", desc: "Новости и контент", color: "text-pink-400" },
    { icon: "Smile", label: "Стикеры", desc: "Пакеты эмодзи", color: "text-cyan-400" },
  ];

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-center gap-4 mb-5">
          <div className="relative animate-float">
            <div className="w-20 h-20 rounded-3xl gradient-purple-blue flex items-center justify-center text-white text-2xl font-bold glow-purple">АС</div>
            <button className="absolute -bottom-1 -right-1 w-7 h-7 gradient-cyan-blue rounded-xl flex items-center justify-center shadow-lg">
              <Icon name="Camera" size={13} className="text-white" />
            </button>
          </div>
          <div>
            <h2 className="text-lg font-bold">Алексей Смирнов</h2>
            <p className="text-sm text-muted-foreground">+7 (999) 123-45-67</p>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`w-2 h-2 rounded-full ${hideOnlineStatus ? "bg-muted-foreground/40" : "bg-emerald-500"}`} />
              <span className={`text-xs font-medium ${hideOnlineStatus ? "text-muted-foreground" : "text-emerald-400"}`}>
                {hideOnlineStatus ? "Скрыт" : "В сети"}
              </span>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-3 mb-4 border border-neon-purple/20">
          <p className="text-sm text-muted-foreground italic">"На связи всегда 🚀"</p>
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
          <PrivacyRow icon="ImageIcon" label="Видеть аватар" value={avatarPrivacy} onChange={setAvatarPrivacy} />
          <PrivacyRow icon="MessageCircle" label="Писать мне" value={messagePrivacy} onChange={setMessagePrivacy} />
          <PrivacyRow icon="Phone" label="Звонить мне" value={callPrivacy} onChange={setCallPrivacy} />
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

type IncomingCall = {
  contact: typeof CONTACTS[0];
  type: "audio" | "video";
};

function IncomingCallScreen({ call, onAccept, onDecline }: { call: IncomingCall; onAccept: () => void; onDecline: () => void }) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-between py-16 px-8 animate-fade-in" style={{ background: "linear-gradient(160deg, hsl(258 85% 10%) 0%, hsl(222 25% 5%) 50%, hsl(210 100% 8%) 100%)" }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 rounded-full" style={{ background: "radial-gradient(circle, hsl(258 85% 65% / 0.15) 0%, transparent 70%)", animation: "pulse-ring 2.5s ease-out infinite" }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full" style={{ background: "radial-gradient(circle, hsl(258 85% 65% / 0.12) 0%, transparent 70%)", animation: "pulse-ring 2.5s ease-out infinite 0.6s" }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full" style={{ background: "radial-gradient(circle, hsl(258 85% 65% / 0.1) 0%, transparent 70%)", animation: "pulse-ring 2.5s ease-out infinite 1.2s" }} />
      </div>

      <div className="text-center z-10 mt-4">
        <p className="text-sm text-muted-foreground mb-1 tracking-widest uppercase font-medium">
          {call.type === "video" ? "Входящий видеозвонок" : "Входящий звонок"}
        </p>
        <h2 className="text-3xl font-bold text-white mb-1">{call.contact.name}</h2>
        <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
          <Icon name={call.type === "video" ? "Video" : "Phone"} size={14} />
          <span className="animate-pulse">Звонит...</span>
        </div>
      </div>

      <div className="relative z-10">
        <div className={`w-28 h-28 rounded-full bg-gradient-to-br ${call.contact.color} flex items-center justify-center text-white text-4xl font-bold shadow-2xl animate-pulse-glow`}>
          {call.contact.avatar}
        </div>
      </div>

      <div className="flex items-center gap-14 z-10">
        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onDecline}
            className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-400 active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-red-500/40"
          >
            <Icon name="PhoneOff" size={26} className="text-white" />
          </button>
          <span className="text-xs text-muted-foreground">Отклонить</span>
        </div>

        <div className="flex flex-col items-center gap-2">
          <button
            onClick={onAccept}
            className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 active:scale-95 transition-all flex items-center justify-center shadow-lg shadow-emerald-500/40 animate-pulse-glow"
            style={{ boxShadow: "0 0 20px hsl(142 71% 45% / 0.6), 0 0 40px hsl(142 71% 45% / 0.3)" }}
          >
            <Icon name={call.type === "video" ? "Video" : "Phone"} size={26} className="text-white" />
          </button>
          <span className="text-xs text-muted-foreground">Принять</span>
        </div>
      </div>
    </div>
  );
}

function ActiveCallScreen({ call, onEnd }: { call: IncomingCall; onEnd: () => void }) {
  const [muted, setMuted] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(true);
  const [camOff, setCamOff] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useState(() => {
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(timer);
  });

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="absolute inset-0 z-50 flex flex-col animate-fade-in" style={{ background: "linear-gradient(160deg, hsl(185 100% 8%) 0%, hsl(222 25% 5%) 50%, hsl(258 85% 8%) 100%)" }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full" style={{ background: "radial-gradient(circle, hsl(185 100% 55% / 0.08) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full" style={{ background: "radial-gradient(circle, hsl(258 85% 65% / 0.08) 0%, transparent 70%)" }} />
      </div>

      <div className="flex items-center justify-between px-5 pt-5 z-10">
        <button className="p-2 rounded-xl hover:bg-white/10 transition-colors text-white/60 hover:text-white">
          <Icon name="ChevronDown" size={22} />
        </button>
        <div className="text-center">
          <p className="text-white/60 text-xs uppercase tracking-widest">{call.type === "video" ? "Видеозвонок" : "Аудиозвонок"}</p>
          <p className="text-emerald-400 font-semibold text-sm font-mono">{fmt(elapsed)}</p>
        </div>
        <button className="p-2 rounded-xl hover:bg-white/10 transition-colors text-white/60 hover:text-white">
          <Icon name="MoreHorizontal" size={22} />
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center z-10 gap-4">
        <div className={`w-32 h-32 rounded-3xl bg-gradient-to-br ${call.contact.color} flex items-center justify-center text-white text-4xl font-bold shadow-2xl`}>
          {call.contact.avatar}
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">{call.contact.name}</h2>
          <p className="text-white/50 text-sm mt-1">
            {call.contact.online ? "В сети" : call.contact.status}
          </p>
        </div>
      </div>

      <div className="px-8 pb-12 z-10">
        <div className="flex items-center justify-center gap-4 mb-8">
          <button onClick={() => setMuted(m => !m)} className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${muted ? "bg-white/20 text-white" : "bg-white/10 text-white/60 hover:bg-white/15"}`}>
            <Icon name={muted ? "MicOff" : "Mic"} size={20} />
            <span className="text-[9px]">{muted ? "Вкл. микр." : "Микрофон"}</span>
          </button>
          {call.type === "video" && (
            <button onClick={() => setCamOff(c => !c)} className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${camOff ? "bg-white/20 text-white" : "bg-white/10 text-white/60 hover:bg-white/15"}`}>
              <Icon name={camOff ? "VideoOff" : "Video"} size={20} />
              <span className="text-[9px]">{camOff ? "Вкл. камеру" : "Камера"}</span>
            </button>
          )}
          <button onClick={() => setSpeakerOn(s => !s)} className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${speakerOn ? "bg-white/20 text-white" : "bg-white/10 text-white/60 hover:bg-white/15"}`}>
            <Icon name={speakerOn ? "Volume2" : "VolumeX"} size={20} />
            <span className="text-[9px]">{speakerOn ? "Динамик" : "Без звука"}</span>
          </button>
        </div>

        <button
          onClick={onEnd}
          className="w-full py-4 rounded-2xl bg-red-500 hover:bg-red-400 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/30"
        >
          <Icon name="PhoneOff" size={22} className="text-white" />
          <span className="text-white font-semibold">Завершить звонок</span>
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("chats");
  const [incomingCall, setIncomingCall] = useState<IncomingCall | null>({
    contact: CONTACTS[0],
    type: "video",
  });
  const [activeCall, setActiveCall] = useState<IncomingCall | null>(null);
  const [globalPin, setGlobalPin] = useState<string | null>(null);
  const [pinPadApp, setPinPadApp] = useState<null | { mode: "enter" | "confirm"; resolve: (pin: string) => void; onSuccess?: () => void }>(null);
  const [hideOnlineStatus, setHideOnlineStatus] = useState(false);

  const handleAccept = () => {
    setActiveCall(incomingCall);
    setIncomingCall(null);
  };
  const handleDecline = () => setIncomingCall(null);
  const handleEndCall = () => setActiveCall(null);

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
      case "chats": return <ChatsTab sharedPin={globalPin} onPinCreated={setGlobalPin} hideOnlineStatus={hideOnlineStatus} />;
      case "contacts": return <ContactsTab />;
      case "calls": return <CallsTab />;
      case "status": return <StatusTab />;
      case "media": return <MediaTab />;
      case "profile": return <ProfileTab globalPin={globalPin} onChangePin={requestSetPin} onRemovePin={removePin} hideOnlineStatus={hideOnlineStatus} onToggleOnlineStatus={() => setHideOnlineStatus(v => !v)} />;
    }
  };

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
                  <Icon name={item.icon} size={20} className={isActive ? "text-neon-purple" : ""} />
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