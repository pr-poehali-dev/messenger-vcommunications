import { useState, useRef, useEffect } from "react";
import Icon from "@/components/ui/icon";
import { UserAvatar } from "@/components/ChatView";
import { type CallInfo, type ActiveCallInfo } from "@/lib/constants";

export function IncomingCallScreen({ call, onAccept, onDecline }: { call: CallInfo; onAccept: () => void; onDecline: () => void }) {
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

export function ActiveCallScreen({ call, onEnd }: { call: ActiveCallInfo; onEnd: () => void }) {
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
          <button onClick={toggleSpeaker} className={`w-14 h-14 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all ${speaker ? "bg-white/30 text-white" : "bg-white/10 text-white/70 hover:bg-white/20"}`}>
            <Icon name={speaker ? "Volume2" : "VolumeX"} size={20} />
            <span className="text-[9px]">{speaker ? "Динамик" : "Трубка"}</span>
          </button>
        </div>
        <button onClick={onEnd} className="w-full py-4 rounded-2xl bg-red-500 hover:bg-red-400 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-500/30">
          <Icon name="PhoneOff" size={22} className="text-white" />
          <span className="text-white font-semibold">Завершить</span>
        </button>
      </div>
    </div>
  );
}
