import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import ImageCropModal from "@/components/ImageCropModal";
import { Avatar, UserAvatar } from "@/components/ChatView";
import {
  CONTACTS, STATUSES, MEDIA_ITEMS,
  SIGNALING_URL, UPLOAD_AVATAR_URL, UPDATE_PROFILE_URL,
  fetchWithTimeout,
  type AuthUser, type OtherUser, type PrivacyLevel, type CallHistoryItem,
} from "@/lib/constants";

export function ContactsTab({ authUser }: { authUser?: AuthUser | null }) {
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

export function CallsTab({ authUser, onCall }: { authUser?: AuthUser | null; onCall?: (user: OtherUser, type: 'video' | 'audio') => void }) {
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

export function StatusTab() {
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
              <div className="text-xs text-muted-foreground">Нажмите, чтобы добавить статус</div>
            </div>
          </div>
        </div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Недавние обновления</div>
      </div>
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {STATUSES.map((s, i) => (
          <div key={s.id} className="flex items-center gap-3 px-3 py-3 rounded-2xl hover:bg-muted/40 transition-all cursor-pointer animate-fade-in" style={{ animationDelay: `${i * 0.08}s` }}>
            <div className={`relative w-12 h-12 rounded-full flex-shrink-0 p-0.5 ${s.viewed ? "bg-muted" : "bg-gradient-to-br from-neon-purple to-neon-blue"}`}>
              <Avatar initials={s.contact.avatar} color={s.contact.color} size="md" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{s.contact.name}</div>
              <div className="text-xs text-muted-foreground">{s.time} · {s.count} обновл.</div>
            </div>
            <span className="text-xl">{s.emoji}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function MediaTab() {
  const [tab, setTab] = useState<"photos" | "videos" | "voice">("photos");
  const filtered = MEDIA_ITEMS.filter(m => {
    if (tab === "photos") return m.type === "photo";
    if (tab === "videos") return m.type === "video";
    return m.type === "voice";
  });

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3">
        <h1 className="text-xl font-bold gradient-text mb-4">Медиа</h1>
        <div className="flex gap-2 bg-muted/50 p-1 rounded-xl">
          {(["photos", "videos", "voice"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t ? "gradient-purple-blue text-white shadow-md" : "text-muted-foreground hover:text-foreground"}`}>
              {t === "photos" ? "Фото" : t === "videos" ? "Видео" : "Голос"}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4">
        {tab === "voice" ? (
          <div className="space-y-2 pb-4">
            {filtered.map((item, i) => (
              <div key={item.id} className="glass rounded-2xl p-4 flex items-center gap-3 animate-fade-in" style={{ animationDelay: `${i * 0.07}s` }}>
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center flex-shrink-0`}>
                  <Icon name="Mic" size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{item.from.name}</div>
                  <div className="text-xs text-muted-foreground">Голосовое сообщение</div>
                </div>
                <button className="p-2 rounded-xl hover:bg-muted transition-colors">
                  <Icon name="Play" size={16} className="text-neon-purple" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 pb-4">
            {filtered.map((item, i) => (
              <div key={item.id} className={`aspect-square rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center cursor-pointer hover:scale-105 transition-transform animate-fade-in`} style={{ animationDelay: `${i * 0.07}s` }}>
                {item.type === "video" && (
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                    <Icon name="Play" size={14} className="text-white ml-0.5" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PrivacyRow({ icon, label, value, onChange }: { icon: string; label: string; value: PrivacyLevel; onChange: (v: PrivacyLevel) => void }) {
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

export function ProfileTab({ globalPin, onChangePin, onRemovePin, hideOnlineStatus, onToggleOnlineStatus, messagePrivacy, onMessagePrivacyChange, avatarPrivacy, onAvatarPrivacyChange, callPrivacy, onCallPrivacyChange, authUser, onLogout, onAvatarUpdate, onProfileUpdate }: {
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
                <button onClick={onChangePin} className="px-3 py-1.5 rounded-xl bg-muted/50 text-xs font-medium hover:bg-muted transition-colors">
                  Изменить
                </button>
                <button onClick={onRemovePin} className="px-3 py-1.5 rounded-xl bg-destructive/10 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors">
                  Удалить
                </button>
              </div>
            ) : (
              <button onClick={onChangePin} className="px-3 py-1.5 rounded-xl gradient-purple-blue text-white text-xs font-medium">
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
