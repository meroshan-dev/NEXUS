import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DailyIframe from '@daily-co/daily-js';
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  PhoneOff, Users, ChevronRight, Wifi, WifiOff,
  AlertTriangle, Loader2, Camera, Volume2
} from 'lucide-react';

/* ─── Constants ───────────────────────────────────────────────── */

const CALL_STATE = {
  CHECKING_PERMISSIONS: 'checking_permissions',
  PERMISSION_DENIED: 'permission_denied',
  WAITING_FOR_ROOM: 'waiting_for_room',
  JOINING: 'joining',
  JOINED: 'joined',
  ERROR: 'error',
};

/* ─── Participant video tile ──────────────────────────────────── */

function ParticipantTile({ participant, isLocal, size = 'normal' }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const track = participant?.tracks?.video?.persistentTrack;
    console.log(`[Tile] ${isLocal ? 'local' : 'remote'} video track state:`,
      participant?.tracks?.video?.state, '| track:', !!track);
    if (videoRef.current) {
      videoRef.current.srcObject = track ? new MediaStream([track]) : null;
    }
  }, [participant?.tracks?.video?.persistentTrack, participant?.tracks?.video?.state, isLocal]);

  useEffect(() => {
    const track = participant?.tracks?.audio?.persistentTrack;
    if (audioRef.current && track && !isLocal) {
      console.log('[Tile] Attaching remote audio track');
      audioRef.current.srcObject = new MediaStream([track]);
      audioRef.current.play().catch(e => console.warn('[Tile] Audio play error:', e));
    }
  }, [participant?.tracks?.audio?.persistentTrack, isLocal]);

  const hasVideo = participant?.tracks?.video?.state === 'playable';
  const hasAudio = participant?.tracks?.audio?.state === 'playable';
  const name = participant?.user_name || 'Participant';
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  const isSpeaking = (participant?.local_audio_level || 0) > 0.05;

  const baseStyle = {
    position: 'relative',
    borderRadius: '14px',
    overflow: 'hidden',
    background: 'rgba(15,15,35,0.92)',
    border: isSpeaking
      ? '2px solid rgba(99,102,241,0.85)'
      : '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{ ...baseStyle, ...(size === 'large' ? { width: '100%', height: '100%' } : { width: '100%', aspectRatio: '16/9' }) }}>
      {/* Video */}
      <video
        ref={videoRef}
        autoPlay
        muted={isLocal}
        playsInline
        style={{
          position: 'absolute', inset: 0, width: '100%', height: '100%',
          objectFit: 'cover',
          display: hasVideo ? 'block' : 'none',
          transform: isLocal ? 'scaleX(-1)' : 'none',
        }}
      />

      {/* Remote audio (hidden) */}
      {!isLocal && <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />}

      {/* Avatar when no video */}
      {!hasVideo && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', zIndex: 1 }}>
          <div style={{
            width: size === 'large' ? '72px' : '48px',
            height: size === 'large' ? '72px' : '48px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.7), rgba(139,92,246,0.6))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: size === 'large' ? '26px' : '16px',
            fontWeight: 700, color: 'white',
            boxShadow: '0 0 24px rgba(99,102,241,0.35)',
          }}>{initials}</div>
          {size !== 'large' && (
            <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.55)', fontWeight: 500 }}>{name}</span>
          )}
        </div>
      )}

      {/* Name/status badge */}
      <div style={{
        position: 'absolute', bottom: '8px', left: '8px',
        display: 'flex', alignItems: 'center', gap: '5px',
        padding: '3px 8px', borderRadius: '999px',
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', zIndex: 2,
      }}>
        {!hasAudio && <MicOff size={9} style={{ color: '#f87171', flexShrink: 0 }} />}
        {hasAudio && isSpeaking && <Volume2 size={9} style={{ color: '#34d399', flexShrink: 0 }} />}
        <span style={{ fontSize: '10px', fontWeight: 600, color: 'white', maxWidth: '110px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}{isLocal ? ' (You)' : ''}
        </span>
      </div>
    </div>
  );
}

/* ─── Control button ──────────────────────────────────────────── */

function CtrlBtn({ onClick, icon: Icon, label, danger = false, highlight = false, disabled = false }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
        padding: '10px 14px', borderRadius: '14px', cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        background: danger ? 'rgba(239,68,68,0.18)' : highlight ? 'rgba(99,102,241,0.28)' : 'rgba(255,255,255,0.07)',
        border: danger ? '1px solid rgba(239,68,68,0.35)' : highlight ? '1px solid rgba(99,102,241,0.45)' : '1px solid rgba(255,255,255,0.1)',
        color: danger ? '#f87171' : highlight ? 'rgba(165,180,252,1)' : 'rgba(255,255,255,0.8)',
        transition: 'all 0.18s',
        minWidth: '58px',
      }}
    >
      <Icon size={20} strokeWidth={1.8} />
      <span style={{ fontSize: '8px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </button>
  );
}

/* ─── Status overlay (full-screen intermediate states) ────────── */

function StatusOverlay({ icon: Icon, iconColor = 'rgba(99,102,241,0.9)', title, body, actions }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', padding: '32px', textAlign: 'center' }}>
      <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={28} style={{ color: iconColor }} />
      </div>
      <div style={{ maxWidth: '340px' }}>
        <p style={{ fontSize: '15px', fontWeight: 700, color: 'rgba(255,255,255,0.92)', marginBottom: '8px' }}>{title}</p>
        {body && <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>{body}</p>}
      </div>
      {actions && <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>{actions}</div>}
    </div>
  );
}

/* ─── Main component ──────────────────────────────────────────── */

export default function DailyCallScreen({ activeCall, onLeave }) {
  const callRef = useRef(null);
  const containerRef = useRef(null);

  const [callState, setCallState]       = useState(CALL_STATE.CHECKING_PERMISSIONS);
  const [errorMsg, setErrorMsg]         = useState('');
  const [permError, setPermError]       = useState({ mic: false, cam: false });

  const [participants, setParticipants] = useState({});
  const [localParticipant, setLocalParticipant] = useState(null);

  const [isMicOn, setIsMicOn]           = useState(true);
  const [isCamOn, setIsCamOn]           = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [networkQuality, setNetworkQuality] = useState(null);

  const roomUrl      = activeCall?.roomUrl;
  const localName    = activeCall?.localUserName || activeCall?.callerName || 'User';
  const workspaceName = activeCall?.workspaceName || 'Workspace';

  // ── Sync participants from Daily call object ──
  const syncParticipants = useCallback((call) => {
    if (!call) return;
    const pts = call.participants();
    setParticipants({ ...pts });
    if (pts.local) setLocalParticipant({ ...pts.local });
    console.log('[DailyCallScreen] Participants synced:', Object.keys(pts).length, 'total');
  }, []);

  // ── Permission check + join ──
  useEffect(() => {
    let mounted = true;

    async function init() {
      console.log('[DailyCallScreen] Init | roomUrl:', roomUrl, '| userName:', localName);

      // Guard: no room URL
      if (!roomUrl) {
        console.error('[DailyCallScreen] ✗ No roomUrl provided on activeCall');
        setCallState(CALL_STATE.ERROR);
        setErrorMsg(
          'No room URL was generated for this call.\n\n' +
          'Make sure VITE_DAILY_API_KEY is set in your .env.local file and restart the dev server. ' +
          'Get a free key at https://dashboard.daily.co/developers'
        );
        return;
      }

      // Step 1: Request permissions
      console.log('[DailyCallScreen] Requesting mic + camera permissions…');
      setCallState(CALL_STATE.CHECKING_PERMISSIONS);
      let micOk = false;
      let camOk = false;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        micOk = true;
        camOk = true;
        console.log('[DailyCallScreen] ✓ Mic + camera granted');
        // Release the test stream; Daily SDK will open its own
        stream.getTracks().forEach(t => t.stop());
      } catch (err) {
        console.warn('[DailyCallScreen] Full getUserMedia failed, trying audio-only:', err.name);
        // Try audio-only
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          micOk = true;
          audioStream.getTracks().forEach(t => t.stop());
          console.log('[DailyCallScreen] ✓ Mic granted (camera denied)');
        } catch (audioErr) {
          console.error('[DailyCallScreen] ✗ Mic also denied:', audioErr.name);
        }
      }

      if (!mounted) return;

      if (!micOk) {
        console.error('[DailyCallScreen] ✗ Microphone permission denied');
        setPermError({ mic: true, cam: !camOk });
        setCallState(CALL_STATE.PERMISSION_DENIED);
        return;
      }

      if (!camOk) {
        console.warn('[DailyCallScreen] Camera denied — continuing with audio-only');
        setPermError({ mic: false, cam: true });
      }

      // Step 2: Create Daily call object
      console.log('[DailyCallScreen] Creating Daily call object…');
      setCallState(CALL_STATE.JOINING);

      let call;
      try {
        call = DailyIframe.createCallObject({
          audioSource: true,
          videoSource: camOk || false,
          dailyConfig: { experimentalChromeVideoMuteLightOff: true },
        });
        callRef.current = call;
      } catch (err) {
        console.error('[DailyCallScreen] ✗ Failed to create DailyIframe:', err);
        if (mounted) {
          setCallState(CALL_STATE.ERROR);
          setErrorMsg(`Failed to initialise video SDK: ${err.message}`);
        }
        return;
      }

      // Step 3: Attach event listeners
      call
        .on('joined-meeting', () => {
          if (!mounted) return;
          console.log('[DailyCallScreen] ✓ joined-meeting');
          setCallState(CALL_STATE.JOINED);
          syncParticipants(call);
        })
        .on('participant-joined', (evt) => {
          if (!mounted) return;
          console.log('[DailyCallScreen] participant-joined:', evt.participant?.user_name);
          syncParticipants(call);
        })
        .on('participant-updated', () => { if (mounted) syncParticipants(call); })
        .on('participant-left', (evt) => {
          if (!mounted) return;
          console.log('[DailyCallScreen] participant-left:', evt.participant?.user_name);
          syncParticipants(call);
        })
        .on('track-started', (evt) => {
          if (!mounted) return;
          console.log('[DailyCallScreen] track-started | kind:', evt.track?.kind, '| participant:', evt.participant?.user_name);
          syncParticipants(call);
        })
        .on('track-stopped', (evt) => {
          if (!mounted) return;
          console.log('[DailyCallScreen] track-stopped | kind:', evt.track?.kind);
          syncParticipants(call);
        })
        .on('left-meeting', () => {
          console.log('[DailyCallScreen] left-meeting');
          if (mounted) onLeave();
        })
        .on('network-quality-change', ({ threshold }) => {
          if (mounted) setNetworkQuality(threshold);
          console.log('[DailyCallScreen] Network quality:', threshold);
        })
        .on('error', (err) => {
          console.error('[DailyCallScreen] ✗ Daily error:', err);
          if (mounted) {
            setCallState(CALL_STATE.ERROR);
            setErrorMsg(err.errorMsg || err.error?.message || 'Unknown connection error from Daily SDK.');
          }
        });

      // Step 4: Join the room
      try {
        console.log('[DailyCallScreen] Joining room:', roomUrl, '| as:', localName);
        await call.join({
          url: roomUrl,
          userName: localName,
          startVideoOff: !camOk,
          startAudioOff: false,
        });
        console.log('[DailyCallScreen] ✓ call.join() resolved');
      } catch (err) {
        console.error('[DailyCallScreen] ✗ call.join() threw:', err);
        if (mounted) {
          setCallState(CALL_STATE.ERROR);
          const hint = err.message?.includes('failed to load')
            ? 'The Daily room URL is invalid or the room does not exist. Check that your Daily API key is correct.'
            : err.message || 'Failed to connect to the call room.';
          setErrorMsg(hint);
        }
      }
    }

    init();

    return () => {
      mounted = false;
      if (callRef.current) {
        console.log('[DailyCallScreen] Destroying Daily call object');
        callRef.current.destroy();
        callRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomUrl]);

  // ── Controls ──
  const toggleMic = useCallback(async () => {
    if (!callRef.current) return;
    const next = !isMicOn;
    console.log('[DailyCallScreen] toggleMic →', next ? 'on' : 'off');
    await callRef.current.setLocalAudio(next);
    setIsMicOn(next);
  }, [isMicOn]);

  const toggleCam = useCallback(async () => {
    if (!callRef.current) return;
    const next = !isCamOn;
    console.log('[DailyCallScreen] toggleCam →', next ? 'on' : 'off');
    await callRef.current.setLocalVideo(next);
    setIsCamOn(next);
  }, [isCamOn]);

  const toggleScreenShare = useCallback(async () => {
    if (!callRef.current) return;
    try {
      if (isScreenSharing) {
        console.log('[DailyCallScreen] Stopping screen share');
        await callRef.current.stopScreenShare();
        setIsScreenSharing(false);
      } else {
        console.log('[DailyCallScreen] Starting screen share');
        await callRef.current.startScreenShare();
        setIsScreenSharing(true);
      }
    } catch (err) {
      console.warn('[DailyCallScreen] Screen share error:', err.message);
    }
  }, [isScreenSharing]);

  const handleLeave = useCallback(async () => {
    console.log('[DailyCallScreen] Leaving call');
    if (callRef.current) await callRef.current.leave();
    onLeave();
  }, [onLeave]);

  // ── Derived ──
  const allParticipants    = Object.values(participants);
  const remoteParticipants = allParticipants.filter(p => !p.local);
  const totalCount         = allParticipants.length;
  const NetIcon = networkQuality === 'low' ? WifiOff : Wifi;
  const netColor = networkQuality === 'low' ? '#f87171' : networkQuality === 'good' ? '#34d399' : 'rgba(255,255,255,0.35)';

  // grid columns
  const gridCols = remoteParticipants.length <= 1 ? 1
    : remoteParticipants.length <= 3 ? 2
    : 3;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        display: 'flex', flexDirection: 'column',
        background: 'radial-gradient(ellipse at 15% 20%, rgba(67,56,202,0.22) 0%, transparent 55%), radial-gradient(ellipse at 85% 80%, rgba(139,92,246,0.18) 0%, transparent 55%), rgb(6,6,18)',
      }}
    >
      {/* ── TOP BAR ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 20px',
        background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0,
      }}>
        {/* Status pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <StatusPill state={callState} totalCount={totalCount} />
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
            {workspaceName}
          </span>
        </div>

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <NetIcon size={13} style={{ color: netColor }} />
          <button
            onClick={() => setShowParticipants(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 10px', borderRadius: '10px', cursor: 'pointer',
              background: showParticipants ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${showParticipants ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)'}`,
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            <Users size={12} />
            <span style={{ fontSize: '11px', fontWeight: 600 }}>{totalCount}</span>
          </button>
        </div>
      </div>

      {/* ── MAIN AREA ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Video / status area */}
        <div style={{ flex: 1, padding: '14px', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '10px' }}>

          {/* ── STATE: checking permissions ── */}
          {callState === CALL_STATE.CHECKING_PERMISSIONS && (
            <StatusOverlay
              icon={Camera}
              title="Requesting permissions…"
              body="Allow microphone and camera access when prompted by your browser."
            />
          )}

          {/* ── STATE: permission denied ── */}
          {callState === CALL_STATE.PERMISSION_DENIED && (
            <StatusOverlay
              icon={AlertTriangle}
              iconColor="#f59e0b"
              title={permError.mic ? 'Microphone access blocked' : 'Camera access blocked'}
              body={
                permError.mic
                  ? 'This app needs your microphone to connect to the call.\n\nClick the camera/lock icon in your browser address bar → Allow Microphone → reload the page.'
                  : 'Camera is blocked but you can still join with audio only.'
              }
              actions={
                permError.mic ? [
                  <LeaveBtn key="leave" onClick={handleLeave} label="Cancel" />,
                ] : [
                  <LeaveBtn key="leave" onClick={handleLeave} label="Cancel" />,
                  <JoinBtn key="join" onClick={() => { setPermError(p => ({ ...p, cam: false })); setCallState(CALL_STATE.JOINING); }} label="Join audio only" />,
                ]
              }
            />
          )}

          {/* ── STATE: joining ── */}
          {callState === CALL_STATE.JOINING && (
            <StatusOverlay
              icon={Loader2}
              title="Connecting to room…"
              body={`Joining ${workspaceName} huddle`}
            />
          )}

          {/* ── STATE: error ── */}
          {callState === CALL_STATE.ERROR && (
            <StatusOverlay
              icon={AlertTriangle}
              iconColor="#f87171"
              title="Connection failed"
              body={errorMsg}
              actions={[<LeaveBtn key="leave" onClick={handleLeave} label="Close" />]}
            />
          )}

          {/* ── STATE: joined ── */}
          {callState === CALL_STATE.JOINED && (
            <>
              {remoteParticipants.length === 0 ? (
                /* Only local — show local big + waiting text */
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
                  <div style={{ width: '100%', maxWidth: '480px', maxHeight: '55vh' }}>
                    {localParticipant && <ParticipantTile participant={localParticipant} isLocal size="large" />}
                  </div>
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.32)', fontWeight: 500 }}>
                    Waiting for participants to join…
                  </p>
                </div>
              ) : remoteParticipants.length === 1 ? (
                /* 1 remote → full screen remote + local PiP */
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden', borderRadius: '14px' }}>
                  <ParticipantTile participant={remoteParticipants[0]} isLocal={false} size="large" />
                  {localParticipant && (
                    <div style={{ position: 'absolute', bottom: '14px', right: '14px', width: '170px', zIndex: 5, boxShadow: '0 8px 28px rgba(0,0,0,0.55)' }}>
                      <ParticipantTile participant={localParticipant} isLocal />
                    </div>
                  )}
                </div>
              ) : (
                /* Multiple → grid */
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: `repeat(${gridCols}, 1fr)`, gap: '10px', overflow: 'hidden' }}>
                  {localParticipant && <ParticipantTile participant={localParticipant} isLocal />}
                  {remoteParticipants.map(p => (
                    <ParticipantTile key={p.session_id} participant={p} isLocal={false} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* ── PARTICIPANT SIDEBAR ── */}
        <AnimatePresence>
          {showParticipants && (
            <motion.div
              initial={{ width: 0, opacity: 0 }} animate={{ width: 230, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{
                overflow: 'hidden', flexShrink: 0,
                background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(20px)',
                borderLeft: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', flexDirection: 'column',
              }}
            >
              <div style={{ padding: '14px 14px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.09em' }}>
                  Participants · {totalCount}
                </p>
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: '6px' }}>
                {allParticipants.map(p => {
                  const pName = p.user_name || 'Participant';
                  const pInitials = pName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                  const pHasAudio = p.tracks?.audio?.state === 'playable';
                  const pHasVideo = p.tracks?.video?.state === 'playable';
                  return (
                    <div key={p.session_id} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '7px 8px', borderRadius: '10px',
                      background: 'rgba(255,255,255,0.03)', marginBottom: '3px',
                    }}>
                      <div style={{
                        width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.55), rgba(139,92,246,0.45))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', fontWeight: 700, color: 'white',
                      }}>{pInitials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.82)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {pName}{p.local ? ' (You)' : ''}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
                        {!pHasAudio && <MicOff  size={10} style={{ color: '#f87171' }} />}
                        {!pHasVideo && <VideoOff size={10} style={{ color: 'rgba(255,255,255,0.3)' }} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── CONTROLS BAR ── */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
        padding: '14px 24px',
        background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0, flexWrap: 'wrap',
      }}>
        <CtrlBtn onClick={toggleMic}   icon={isMicOn ? Mic : MicOff}        label={isMicOn ? 'Mute' : 'Unmute'}       danger={!isMicOn} disabled={callState !== CALL_STATE.JOINED} />
        <CtrlBtn onClick={toggleCam}   icon={isCamOn ? Video : VideoOff}     label={isCamOn ? 'Stop Cam' : 'Start Cam'} danger={!isCamOn} disabled={callState !== CALL_STATE.JOINED} />
        <CtrlBtn onClick={toggleScreenShare} icon={isScreenSharing ? MonitorOff : Monitor} label={isScreenSharing ? 'Stop Share' : 'Share Screen'} highlight={isScreenSharing} disabled={callState !== CALL_STATE.JOINED} />
        <CtrlBtn onClick={() => setShowParticipants(p => !p)} icon={showParticipants ? ChevronRight : Users} label="People" highlight={showParticipants} />

        <div style={{ flex: 1, maxWidth: '36px' }} />

        {/* Leave */}
        <button
          onClick={handleLeave}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '11px 22px', borderRadius: '14px', cursor: 'pointer',
            background: 'rgba(239,68,68,0.88)', border: '1px solid rgba(239,68,68,0.5)',
            color: 'white', fontSize: '13px', fontWeight: 700,
            boxShadow: '0 4px 18px rgba(239,68,68,0.32)', transition: 'all 0.18s',
          }}
        >
          <PhoneOff size={16} /> Leave
        </button>
      </div>

      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>
    </div>
  );
}

/* ─── Status pill (top bar) ───────────────────────────────────── */
function StatusPill({ state, totalCount }) {
  const configs = {
    [CALL_STATE.CHECKING_PERMISSIONS]: { dot: '#fbbf24', text: 'Requesting permissions…', pulse: true },
    [CALL_STATE.JOINING]:              { dot: '#fbbf24', text: 'Connecting…',               pulse: true },
    [CALL_STATE.JOINED]:               { dot: '#34d399', text: `Live · ${totalCount} participant${totalCount !== 1 ? 's' : ''}`, pulse: false },
    [CALL_STATE.PERMISSION_DENIED]:    { dot: '#f59e0b', text: 'Permission required',       pulse: false },
    [CALL_STATE.ERROR]:                { dot: '#f87171', text: 'Connection failed',          pulse: false },
    [CALL_STATE.WAITING_FOR_ROOM]:     { dot: '#fbbf24', text: 'Preparing room…',           pulse: true },
  };
  const cfg = configs[state] || configs[CALL_STATE.ERROR];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '6px',
      padding: '4px 11px', borderRadius: '999px',
      background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)',
    }}>
      <span style={{
        width: '7px', height: '7px', borderRadius: '50%', background: cfg.dot, flexShrink: 0,
        animation: cfg.pulse ? 'pulse 1.4s ease-in-out infinite' : 'none',
      }} />
      <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.82)' }}>{cfg.text}</span>
      <style>{`@keyframes pulse{0%,100%{opacity:1;}50%{opacity:0.38;}}`}</style>
    </div>
  );
}

/* ─── Small leave / join buttons inside StatusOverlay ────────── */
function LeaveBtn({ onClick, label = 'Leave' }) {
  return (
    <button onClick={onClick} style={{ padding: '9px 20px', borderRadius: '12px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, background: 'rgba(239,68,68,0.18)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)' }}>{label}</button>
  );
}
function JoinBtn({ onClick, label = 'Join' }) {
  return (
    <button onClick={onClick} style={{ padding: '9px 20px', borderRadius: '12px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, background: 'rgba(99,102,241,0.25)', color: 'rgba(165,180,252,1)', border: '1px solid rgba(99,102,241,0.4)' }}>{label}</button>
  );
}
