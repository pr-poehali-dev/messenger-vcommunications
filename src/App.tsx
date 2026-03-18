import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import AuthPage from "@/AuthPage";
import { ChatsTab, PinPad } from "@/components/ChatView";
import { IncomingCallScreen, ActiveCallScreen } from "@/components/CallScreens";
import { ContactsTab, CallsTab, StatusTab, MediaTab, ProfileTab } from "@/components/TabViews";
import {
  AUTH_URL, MESSAGES_URL, SIGNALING_URL,
  NAV_ITEMS,
  fetchWithTimeout,
  createRingTone, createDialTone,
  showPushNotification,
  type AuthUser, type Tab, type PrivacyLevel,
  type OtherUser, type CallInfo, type ActiveCallInfo,
} from "@/lib/constants";

let activeCallNotification: Notification | null = null;

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
                    <div className={`w-5 h-5 rounded-full overflow-hidden flex items-center justify-center text-[8px] font-bold ${isActive ? "ring-2 ring-neon-purple" : ""} bg-gradient-to-br from-purple-500 to-pink-500 text-white`}>
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
