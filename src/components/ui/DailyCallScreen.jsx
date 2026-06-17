import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DailyIframe from '@daily-co/daily-js';
import {
  Mic, MicOff, Video, VideoOff, Monitor, MonitorOff,
  PhoneOff, Users, ChevronRight, ChevronLeft, Maximize2,
  Minimize2, Wifi, WifiOff
} from 'lucide-react';
import Avatar from './Avatar';

/* ─── Helpers ─────────────────────────────────────────────────── */

function ParticipantTile({ participant, isLocal, size = 'normal' }) {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    const videoTrack = participant?.tracks?.video?.persistentTrack;
    if (videoRef.current && videoTrack) {
      videoRef.current.srcObject = new MediaStream([videoTrack]);
    } else if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [participant?.tracks?.video?.persistentTrack]);

  useEffect(() => {
    const audioTrack = participant?.tracks?.audio?.persistentTrack;
    if (audioRef.current && audioTrack && !isLocal) {
      audioRef.current.srcObject = new MediaStream([audioTrack]);
    }
  }, [participant?.tracks?.audio?.persistentTrack, isLocal]);

  const hasVideo = participant?.tracks?.video?.state === 'playable';
  const hasAudio = participant?.tracks?.audio?.state === 'playable';
  const name = participant?.user_name || 'Participant';
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const tileStyle = size === 'large'
    ? { width: '100%', height: '100%' }
    : { width: '100%', aspectRatio: '16/9' };

  return (
    <div
      style={{
        ...tileStyle,
        position: 'relative',
        borderRadius: '16px',
        overflow: 'hidden',
        background: 'rgba(15, 15, 35, 0.9)',
        border: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        muted={isLocal}
        playsInline
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          display: hasVideo ? 'block' : 'none',
          transform: isLocal ? 'scaleX(-1)' : 'none',
        }}
      />

      {/* Audio element (not shown, just plays) */}
      {!isLocal && (
        <audio ref={audioRef} autoPlay playsInline style={{ display: 'none' }} />
      )}

      {/* Avatar fallback when no video */}
      {!hasVideo && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          zIndex: 1,
        }}>
          <div style={{
            width: size === 'large' ? '80px' : '52px',
            height: size === 'large' ? '80px' : '52px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(99,102,241,0.6), rgba(139,92,246,0.5))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size === 'large' ? '28px' : '18px',
            fontWeight: 700,
            color: 'white',
            boxShadow: '0 0 30px rgba(99,102,241,0.3)',
          }}>
            {initials}
          </div>
          {size !== 'large' && (
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: 500 }}>{name}</span>
          )}
        </div>
      )}

      {/* Name badge */}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '4px 10px',
        borderRadius: '999px',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(8px)',
        zIndex: 2,
      }}>
        {!hasAudio && (
          <MicOff size={10} style={{ color: '#f87171', flexShrink: 0 }} />
        )}
        <span style={{ fontSize: '11px', fontWeight: 600, color: 'white', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}{isLocal ? ' (You)' : ''}
        </span>
      </div>

      {/* Speaking indicator */}
      {participant?.local_audio_level > 0.05 && (
        <div style={{
          position: 'absolute',
          inset: 0,
          border: '2px solid rgba(99,102,241,0.8)',
          borderRadius: '16px',
          pointerEvents: 'none',
          zIndex: 3,
        }} />
      )}
    </div>
  );
}

/* ─── Main Component ──────────────────────────────────────────── */

export default function DailyCallScreen({ activeCall, onLeave }) {
  const callRef = useRef(null);
  const [participants, setParticipants] = useState({});
  const [localParticipant, setLocalParticipant] = useState(null);
  const [callState, setCallState] = useState('joining'); // joining | joined | error
  const [errorMsg, setErrorMsg] = useState('');
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [networkQuality, setNetworkQuality] = useState(null);
  const containerRef = useRef(null);

  const roomUrl = activeCall?.roomUrl;

  /* ── Update participants state from call object ── */
  const syncParticipants = useCallback((call) => {
    if (!call) return;
    const pts = call.participants();
    setParticipants({ ...pts });
    if (pts.local) setLocalParticipant({ ...pts.local });
  }, []);

  /* ── Initialize Daily call ── */
  useEffect(() => {
    if (!roomUrl) {
      setCallState('error');
      setErrorMsg('No room URL provided. Please ask the call initiator to start again.');
      return;
    }

    let call;
    let mounted = true;

    async function startCall() {
      try {
        call = DailyIframe.createCallObject({
          audioSource: true,
          videoSource: true,
          dailyConfig: {
            experimentalChromeVideoMuteLightOff: true,
          },
        });

        callRef.current = call;

        // Attach event listeners
        const events = [
          'participant-joined', 'participant-updated', 'participant-left',
          'track-started', 'track-stopped', 'left-meeting',
          'network-quality-change', 'error'
        ];

        call
          .on('joined-meeting', () => {
            if (!mounted) return;
            setCallState('joined');
            syncParticipants(call);
          })
          .on('participant-joined', () => { if (mounted) syncParticipants(call); })
          .on('participant-updated', () => { if (mounted) syncParticipants(call); })
          .on('participant-left', () => { if (mounted) syncParticipants(call); })
          .on('track-started', () => { if (mounted) syncParticipants(call); })
          .on('track-stopped', () => { if (mounted) syncParticipants(call); })
          .on('left-meeting', () => { if (mounted) onLeave(); })
          .on('network-quality-change', ({ threshold }) => {
            if (mounted) setNetworkQuality(threshold);
          })
          .on('error', (err) => {
            console.error('[Daily] Error:', err);
            if (mounted) {
              setCallState('error');
              setErrorMsg(err.errorMsg || 'Connection error. Please try again.');
            }
          });

        await call.join({
          url: roomUrl,
          userName: activeCall?.callerName || activeCall?.localUserName || 'User',
          startVideoOff: false,
          startAudioOff: false,
        });
      } catch (err) {
        console.error('[Daily] Failed to join room:', err);
        if (mounted) {
          setCallState('error');
          setErrorMsg(err.message || 'Failed to join the call. Check your camera/mic permissions.');
        }
      }
    }

    startCall();

    return () => {
      mounted = false;
      if (callRef.current) {
        callRef.current.destroy();
        callRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomUrl]);

  /* ── Controls ── */
  const toggleMic = useCallback(async () => {
    if (!callRef.current) return;
    const next = !isMicOn;
    await callRef.current.setLocalAudio(next);
    setIsMicOn(next);
  }, [isMicOn]);

  const toggleCam = useCallback(async () => {
    if (!callRef.current) return;
    const next = !isCamOn;
    await callRef.current.setLocalVideo(next);
    setIsCamOn(next);
  }, [isCamOn]);

  const toggleScreenShare = useCallback(async () => {
    if (!callRef.current) return;
    try {
      if (isScreenSharing) {
        await callRef.current.stopScreenShare();
        setIsScreenSharing(false);
      } else {
        await callRef.current.startScreenShare();
        setIsScreenSharing(true);
      }
    } catch (err) {
      console.warn('[Daily] Screen share error:', err);
    }
  }, [isScreenSharing]);

  const handleLeave = useCallback(async () => {
    if (callRef.current) {
      await callRef.current.leave();
    }
    onLeave();
  }, [onLeave]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }, []);

  /* ── Participant list (exclude local + screen share tracks) ── */
  const remoteParticipants = Object.values(participants).filter(p => !p.local);
  const allParticipants = Object.values(participants);
  const totalCount = allParticipants.length;

  /* ── Layout: 1 remote → big tile; many → grid ── */
  const gridCols = remoteParticipants.length === 0 ? 1
    : remoteParticipants.length === 1 ? 2
    : remoteParticipants.length <= 3 ? 2
    : 3;

  /* ── Network quality icon ── */
  const NetIcon = networkQuality === 'low' ? WifiOff : Wifi;
  const netColor = networkQuality === 'low' ? '#f87171'
    : networkQuality === 'good' ? '#34d399'
    : 'rgba(255,255,255,0.4)';

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9000,
        display: 'flex',
        flexDirection: 'column',
        background: 'radial-gradient(ellipse at 20% 20%, rgba(67,56,202,0.25) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(139,92,246,0.2) 0%, transparent 50%), rgb(6, 6, 18)',
      }}
    >
      {/* ── TOP BAR ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 20px',
        background: 'rgba(0,0,0,0.3)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            padding: '5px 12px',
            borderRadius: '999px',
            background: callState === 'joined' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.06)',
            border: `1px solid ${callState === 'joined' ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.1)'}`,
          }}>
            <span style={{
              width: '7px', height: '7px', borderRadius: '50%',
              background: callState === 'joined' ? '#34d399' : callState === 'error' ? '#f87171' : '#fbbf24',
              animation: callState === 'joining' ? 'pulse 1.5s infinite' : 'none',
              flexShrink: 0,
            }} />
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>
              {callState === 'joining' ? 'Connecting…'
                : callState === 'joined' ? `Live · ${totalCount} participant${totalCount !== 1 ? 's' : ''}`
                : 'Connection error'}
            </span>
          </div>

          <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>
            {activeCall?.workspaceName}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Network quality */}
          <NetIcon size={14} style={{ color: netColor }} />

          {/* Participants toggle */}
          <button
            onClick={() => setShowParticipants(p => !p)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '6px 12px', borderRadius: '10px', cursor: 'pointer',
              background: showParticipants ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${showParticipants ? 'rgba(99,102,241,0.4)' : 'rgba(255,255,255,0.1)'}`,
              color: showParticipants ? 'rgba(165,180,252,1)' : 'rgba(255,255,255,0.6)',
              transition: 'all 0.2s',
            }}
          >
            <Users size={13} />
            <span style={{ fontSize: '11px', fontWeight: 600 }}>{totalCount}</span>
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            style={{
              width: '34px', height: '34px', borderRadius: '10px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.6)',
            }}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* ── MAIN AREA ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>

        {/* Video grid */}
        <div style={{ flex: 1, padding: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {callState === 'error' ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', textAlign: 'center',
            }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <WifiOff size={28} style={{ color: '#f87171' }} />
              </div>
              <div>
                <p style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', marginBottom: '6px' }}>Unable to join call</p>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', maxWidth: '320px', lineHeight: 1.6 }}>{errorMsg}</p>
              </div>
              <button
                onClick={handleLeave}
                style={{
                  padding: '10px 24px', borderRadius: '12px', cursor: 'pointer', fontSize: '13px', fontWeight: 600,
                  background: 'rgba(239,68,68,0.2)', color: '#f87171', border: '1px solid rgba(239,68,68,0.3)',
                }}
              >
                Leave
              </button>
            </div>

          ) : callState === 'joining' ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                border: '3px solid rgba(99,102,241,0.3)', borderTopColor: 'rgba(99,102,241,0.9)',
                animation: 'spin 0.9s linear infinite',
              }} />
              <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>Joining room…</p>
            </div>

          ) : (
            <>
              {/* Remote participants grid */}
              {remoteParticipants.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                  {localParticipant && (
                    <div style={{ width: '100%', maxWidth: '500px', maxHeight: '60vh' }}>
                      <ParticipantTile participant={localParticipant} isLocal size="large" />
                    </div>
                  )}
                  <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '12px', fontWeight: 500 }}>
                    Waiting for others to join…
                  </p>
                </div>
              ) : remoteParticipants.length === 1 ? (
                /* 1 remote: big remote tile + local PiP */
                <div style={{ flex: 1, position: 'relative', overflow: 'hidden', borderRadius: '16px' }}>
                  <ParticipantTile participant={remoteParticipants[0]} isLocal={false} size="large" />
                  {/* Local PiP */}
                  {localParticipant && (
                    <div style={{
                      position: 'absolute', bottom: '16px', right: '16px',
                      width: '180px', zIndex: 5,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                    }}>
                      <ParticipantTile participant={localParticipant} isLocal />
                    </div>
                  )}
                </div>
              ) : (
                /* Grid for multiple */
                <div style={{
                  flex: 1,
                  display: 'grid',
                  gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                  gap: '12px',
                  overflow: 'hidden',
                }}>
                  {localParticipant && (
                    <ParticipantTile participant={localParticipant} isLocal />
                  )}
                  {remoteParticipants.map(p => (
                    <ParticipantTile key={p.session_id} participant={p} isLocal={false} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Participants sidebar */}
        <AnimatePresence>
          {showParticipants && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              style={{
                overflow: 'hidden',
                background: 'rgba(0,0,0,0.35)',
                backdropFilter: 'blur(20px)',
                borderLeft: '1px solid rgba(255,255,255,0.07)',
                display: 'flex',
                flexDirection: 'column',
                flexShrink: 0,
              }}
            >
              <div style={{ padding: '16px 16px 8px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <p style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Participants · {totalCount}
                </p>
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
                {allParticipants.map(p => {
                  const name = p.user_name || 'Participant';
                  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                  const hasAudio = p.tracks?.audio?.state === 'playable';
                  const hasVideo = p.tracks?.video?.state === 'playable';
                  return (
                    <div key={p.session_id} style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '8px 10px', borderRadius: '10px',
                      background: 'rgba(255,255,255,0.03)',
                      marginBottom: '4px',
                    }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, rgba(99,102,241,0.5), rgba(139,92,246,0.4))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', fontWeight: 700, color: 'white',
                      }}>{initials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.85)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {name}{p.local ? ' (You)' : ''}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        {!hasAudio && <MicOff size={11} style={{ color: '#f87171' }} />}
                        {!hasVideo && <VideoOff size={11} style={{ color: 'rgba(255,255,255,0.3)' }} />}
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '16px 24px',
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        flexShrink: 0,
        flexWrap: 'wrap',
      }}>
        {/* Mic */}
        <ControlButton
          onClick={toggleMic}
          active={isMicOn}
          icon={isMicOn ? Mic : MicOff}
          label={isMicOn ? 'Mute' : 'Unmute'}
          danger={!isMicOn}
        />

        {/* Camera */}
        <ControlButton
          onClick={toggleCam}
          active={isCamOn}
          icon={isCamOn ? Video : VideoOff}
          label={isCamOn ? 'Stop Video' : 'Start Video'}
          danger={!isCamOn}
        />

        {/* Screen Share */}
        <ControlButton
          onClick={toggleScreenShare}
          active={!isScreenSharing}
          icon={isScreenSharing ? MonitorOff : Monitor}
          label={isScreenSharing ? 'Stop Share' : 'Share Screen'}
          highlight={isScreenSharing}
        />

        {/* Participants (mobile shortcut) */}
        <ControlButton
          onClick={() => setShowParticipants(p => !p)}
          active={!showParticipants}
          icon={showParticipants ? ChevronRight : ChevronLeft}
          label="Participants"
        />

        {/* Spacer */}
        <div style={{ flex: 1, maxWidth: '40px' }} />

        {/* Leave */}
        <button
          onClick={handleLeave}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '12px 24px', borderRadius: '14px', cursor: 'pointer',
            background: 'rgba(239,68,68,0.9)',
            border: '1px solid rgba(239,68,68,0.5)',
            color: 'white', fontSize: '13px', fontWeight: 700,
            boxShadow: '0 4px 20px rgba(239,68,68,0.35)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.9)'}
        >
          <PhoneOff size={16} />
          Leave
        </button>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>
    </div>
  );
}

/* ─── Control button subcomponent ────────────────────────────── */
function ControlButton({ onClick, icon: Icon, label, active = true, danger = false, highlight = false }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
        padding: '10px 14px', borderRadius: '14px', cursor: 'pointer',
        background: danger
          ? 'rgba(239,68,68,0.15)'
          : highlight
          ? 'rgba(99,102,241,0.25)'
          : 'rgba(255,255,255,0.07)',
        border: danger
          ? '1px solid rgba(239,68,68,0.3)'
          : highlight
          ? '1px solid rgba(99,102,241,0.4)'
          : '1px solid rgba(255,255,255,0.1)',
        color: danger ? '#f87171' : highlight ? 'rgba(165,180,252,1)' : 'rgba(255,255,255,0.75)',
        transition: 'all 0.2s',
        minWidth: '60px',
      }}
    >
      <Icon size={20} strokeWidth={1.8} />
      <span style={{ fontSize: '9px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </button>
  );
}
