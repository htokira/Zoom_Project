import { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import Peer from 'peerjs';
import axios from 'axios';
import cameraIcon from '../assets/camera.png';

const API = 'http://localhost:3000/api'

const RemoteVideo = ({ stream }: { stream: MediaStream }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;

      // Додаємо обробники для надійності
      const handleTrackChange = () => {
        video.srcObject = stream; // Перепідключаємо, якщо треки змінилися
      };

      stream.addEventListener('addtrack', handleTrackChange);
      stream.addEventListener('removetrack', handleTrackChange);

      return () => {
        stream.removeEventListener('addtrack', handleTrackChange);
        stream.removeEventListener('removetrack', handleTrackChange);
      };
    }
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline // Важливо для мобільних та деяких браузерів
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  );
};

export default function MeetingRoom() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const [accessError, setAccessError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!user.id) {
      alert("Будь ласка, спочатку увійдіть у систему!");
      navigate('/login');
    }
  }, [user.id, navigate]);

  if (!user.id) return null;

  const fileInputRef = useRef<HTMLInputElement>(null)
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const peerInstance = useRef<Peer | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const myStreamRef = useRef<MediaStream | null>(null);
  const [peerNames, setPeerNames] = useState<Record<string, string>>({});
  const callsRef = useRef<Map<string, any>>(new Map());
  const [screenStreams, setScreenStreams] = useState<Record<string, MediaStream>>({});
  const screenCallsRef = useRef<Map<string, any>>(new Map());
  
// Цей реф допоможе нам не заплутатися, чий це екран
 const [screenNames, setScreenNames] = useState<Record<string, string>>({});

  const [peers, setPeers] = useState<Record<string, MediaStream>>({});
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [peersVideoStates, setPeersVideoStates] = useState<Record<string, boolean>>({});
  const [peersMicStates, setPeersMicStates] = useState<Record<string, boolean>>({});


  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const animFrameIdRef = useRef<number>(0);
  const hiddenVideosRef = useRef<Map<MediaStream, HTMLVideoElement>>(new Map());
  const peersRef = useRef(peers);
  
  useEffect(() => { peersRef.current = peers; }, [peers]);

  const peerNamesRef = useRef(peerNames);
  useEffect(() => { peerNamesRef.current = peerNames; }, [peerNames]);

  const screenStreamsRef = useRef(screenStreams);
  useEffect(() => { screenStreamsRef.current = screenStreams; }, [screenStreams]);

  const screenNamesRef = useRef(screenNames);
  useEffect(() => { screenNamesRef.current = screenNames; }, [screenNames]);
  useEffect(() => {
  chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);


  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteUsernames, setInviteUsernames] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);
  // Переприв'язуємо відео коли міняється режим (звичайний ↔ zoom з екраном)
  useEffect(() => {
  if (myVideoRef.current && myStreamRef.current) {
    myVideoRef.current.srcObject = myStreamRef.current;
  }
}, [screenStreams]);

  const [chatId, setChatId] = useState<number>(0);

useEffect(() => {
  const id = Number(localStorage.getItem('meetingChatId'));
  if (id) setChatId(id);
}, []);

 const applyBitrateLimit = (call: any) => {
  // Чекаємо, поки з'єднання реально встановиться
  const pc = call.peerConnection;
  if (!pc) return;

  const update = () => {
    if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
      const sender = pc.getSenders().find((s: any) => s.track?.kind === 'video');
      if (sender) {
        const parameters = sender.getParameters();
        if (!parameters.encodings || parameters.encodings.length === 0) {
          parameters.encodings = [{}];
        }

        // Ставимо 1.5 Mbps (для демки екрану це важливо!)
        parameters.encodings[0].maxBitrate = 1500000; 

        sender.setParameters(parameters)
          .then(() => console.log('Bitrate limited to 1.5Mbps'))
          .catch((err: any) => console.error('Bitrate limit error:', err));
      }
    }
  };

  // Слухаємо зміни стану з'єднання
  pc.oniceconnectionstatechange = update;
  // На випадок, якщо вже підключено
  update();
};

  useEffect(() => {
    const socket = io('http://localhost:3000', {
        transports: ['websocket'],
        query: { userId: user.id },
    });
    socketRef.current = socket;
    (window as any)._socket = socket

    

    const addVideoStream = (userId: string, stream: MediaStream, userName?: string) => {
        setPeers((prev) => {
            if (prev[userId]) return prev;
            return { ...prev, [userId]: stream as any };
        });

        if (userName) {
            setPeerNames(prev => ({ ...prev, [userId]: userName }));
        }
        
        setPeersVideoStates((prev) => {
            if (prev[userId] !== undefined) return prev;
            return { ...prev, [userId]: true };
        });
    };

      const initCall = async () => {
    try {
      const myStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240, frameRate: 10 },
        audio: true,
      });
      myStreamRef.current = myStream;

      if (myVideoRef.current) {
        myVideoRef.current.srcObject = myStream;
      }

      const peer = new Peer(undefined as any, {
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
          ],
          sdpSemantics: 'unified-plan'
        }
      });
      peerInstance.current = peer;

      peer.on('open', (id) => {
        socket.emit('join-room', roomCode, id, user.name || user.username || 'Гість', user.id);
      });

      peer.on('call', (call) => {
        const metadata = call.metadata as any;
        const isScreenCall = metadata?.isScreen; 
        const incomingName = metadata?.userName || 'Учасник';

        if (isScreenCall) {
          call.answer();
        } else {
          call.answer(myStreamRef.current!); 
        }

        call.on('stream', (remoteStream) => {
          console.log("Отримано потік, isScreen:", isScreenCall);
          if (isScreenCall) {
            setScreenStreams(prev => ({ ...prev, [call.peer]: remoteStream }));
            setScreenNames(prev => ({ ...prev, [call.peer]: `${incomingName} (Екран)` }));
          } else {
            addVideoStream(call.peer, remoteStream, incomingName);
          }
        });

        call.on('close', () => {
          setScreenStreams(prev => {
            const next = { ...prev };
            delete next[call.peer];
            return next;
          });
        });
      });

      // ====================== ВСТАВЛЯЄМО ТУТ ======================
      socket.on('all-users', (users: Array<{peerId: string, userName: string}>) => {
        console.log('🔄 Already in room:', users);

        users.forEach(({ peerId, userName }) => {
          if (peerId === peerInstance.current?.id) return;

          const call = peerInstance.current!.call(peerId, myStreamRef.current!, {
            metadata: { userName: user.name || user.username || 'Гість' }
          });

          applyBitrateLimit(call);

          call.on('stream', (remoteStream) => {
            addVideoStream(peerId, remoteStream, userName);
          });

          callsRef.current.set(peerId, call);
        });
      });
      // ===========================================================

      socket.on('user-connected', (remotePeerId: string, remoteUserName: string) => {
        console.log('Підключився:', remoteUserName);

        const call = peer.call(remotePeerId, myStream, {
          metadata: { userName: user.name || user.username || 'Гість' }
        });
        applyBitrateLimit(call);
        call.on('stream', (remoteStream) => {
          addVideoStream(remotePeerId, remoteStream, remoteUserName);
        });
        callsRef.current.set(remotePeerId, call);
      });

      socket.on('initial-mic-states', (states: Record<string, boolean>) => {
        setPeersMicStates((prev) => ({ ...prev, ...states }));
      });
      
      socket.on('user-toggled-video', (remotePeerId: string, isEnabled: boolean) => {
        setPeersVideoStates((prev) => ({ ...prev, [remotePeerId]: isEnabled }));
      });

      socket.on('user-started-screen', () => { 
        console.log("Хтось почав демку...");
      });

      socket.on('user-stopped-screen', (remotePeerId: string) => {
        setScreenStreams(prev => {
          const next = { ...prev };
          delete next[remotePeerId];
          return next;
        });
      });

      socket.on('user-disconnected', (remotePeerId: string) => {
        callsRef.current.get(remotePeerId)?.close();
        callsRef.current.delete(remotePeerId);
        setPeers((prev) => {
          const next = { ...prev };
          delete next[remotePeerId];
          return next;
        });
        setPeersMicStates((prev) => {
          const next = { ...prev };
          delete next[remotePeerId];
          return next;
        });
      });

      socket.on('user-toggled-mic', (remotePeerId: string, isEnabled: boolean) => {
        setPeersMicStates((prev) => ({ ...prev, [remotePeerId]: isEnabled }));
      });
      socket.on('user-toggled-video', (remotePeerId: string, isEnabled: boolean) => {
        setPeersVideoStates((prev) => ({ ...prev, [remotePeerId]: isEnabled }));
      });

    } catch (err) {
      console.error('Помилка доступу до камери:', err);
    }
  };

    initCall();
    const id = Number(localStorage.getItem('meetingChatId'));
    if (id) socket.emit('joinChat', id);
    socket.on('receiveMessage', (data: any) => {
        setMessages(prev => [...prev, data])
    })

    socket.on('access-denied', (message: string) => {
        setAccessError(message);
        setTimeout(() => navigate('/'), 3000);
    });

    return () => {
      socket.disconnect();
      peerInstance.current?.destroy();
      myStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [roomCode, navigate]);

  if (accessError) {
    return (
      <div style={{ 
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', 
        background: '#111827', color: 'white', flexDirection: 'column' 
      }}>
        <h2>Доступ обмежено</h2>
        <p style={{ color: ' #ef4444' }}>{accessError}</p>
        <p>Вас буде перенаправлено на головну сторінку...</p>
      </div>
    );
  }

  const toggleMic = () => {
    if (myStreamRef.current && peerInstance.current) {
      const audioTrack = myStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicEnabled(audioTrack.enabled);
        socketRef.current?.emit('toggle-mic', roomCode, peerInstance.current.id, audioTrack.enabled);
      }
    }
  };
 const toggleVideo = () => {
  if (myStreamRef.current) {
    const videoTrack = myStreamRef.current.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setIsVideoEnabled(videoTrack.enabled);
      // Тепер сповіщаємо інших — як і з мікрофоном
      socketRef.current?.emit(
        'toggle-video',
        roomCode,
        peerInstance.current?.id,
        videoTrack.enabled
      );
    }
  }
};
const toggleScreenShare = async () => {
  if (!isScreenSharing) {
    try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { 
            cursor: "always",
            selfBrowserSurface: "exclude", // ← не показує поточну вкладку
            surfaceSwitching: "exclude",
          } as any,
          audio: false,
          selfBrowserSurface: "exclude", // ← на рівні запиту теж
        } as any);

      // ПОВІДОМЛЯЄМО СЕРВЕР (щоб інші знали, що треба підключитися)
      socketRef.current?.emit('start-screen-share', roomCode, peerInstance.current?.id);

      Object.keys(peers).forEach(remotePeerId => {
        const call = peerInstance.current?.call(remotePeerId, screenStream, {
          metadata: { userName: user.name || user.username, isScreen: true }
        });

        // ВАЖЛИВО: це має бути ВСЕРЕДИНІ циклу forEach
        if (call) {
          screenCallsRef.current.set(remotePeerId, call);
        }
      });

      setScreenStreams(prev => ({ ...prev, 'me-screen': screenStream }));
      setIsScreenSharing(true);

      screenStream.getVideoTracks()[0].onended = () => stopScreenShare();
    } catch (err) {
      console.error("Помилка демки:", err);
    }
  } else {
    stopScreenShare();
  }
};

const stopScreenShare = () => {
  // Закриваємо всі "екранні" дзвінки
  screenCallsRef.current.forEach(call => call.close());
  screenCallsRef.current.clear();
  
  // Прибираємо свій екран з нашої сітки
  setScreenStreams(prev => {
    const next = { ...prev };
    delete next['me-screen'];
    return next;
  });
  setIsScreenSharing(false);
};

const startRecording = () => {
  if (!myStreamRef.current) return;

  const canvas = document.createElement('canvas');
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext('2d')!;

  // Створюємо прихований відео-елемент для кожного стріму
  const createHiddenVideo = (stream: MediaStream): HTMLVideoElement => {
    const v = document.createElement('video');
    v.srcObject = stream;
    v.autoplay = true;
    v.muted = true;
    v.playsInline = true;
    v.style.position = 'fixed';
    v.style.opacity = '0';
    v.style.pointerEvents = 'none';
    v.style.width = '1px';
    v.style.height = '1px';
    document.body.appendChild(v);
    v.play().catch(() => {});
    return v;
  };

  const drawFrame = () => {
    // Збираємо стріми напряму — не з DOM
    const items: { stream: MediaStream; label: string }[] = [];

    items.push({ stream: myStreamRef.current!, label: user.name || user.username || 'Ви' });

    Object.entries(peersRef.current).forEach(([peerId, stream]) => {
      items.push({ stream, label: peerNamesRef.current[peerId] || 'Учасник' });
    });

    Object.entries(screenStreamsRef.current).forEach(([id, stream]) => {
      items.push({ stream, label: id === 'me-screen' ? 'Ваш екран' : screenNamesRef.current[id] || 'Екран' });
    });

    // Синхронізуємо прихованi відео
    items.forEach(({ stream }) => {
      if (!hiddenVideosRef.current.has(stream)) {
        hiddenVideosRef.current.set(stream, createHiddenVideo(stream));
      }
    });

    // Прибираємо старі
    hiddenVideosRef.current.forEach((v, stream) => {
      if (!items.find(i => i.stream === stream)) {
        v.remove();
        hiddenVideosRef.current.delete(stream);
      }
    });

    const count = items.length || 1;
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const cellW = canvas.width / cols;
    const cellH = canvas.height / rows;

    ctx.fillStyle = '#0b3d60';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    items.forEach(({ stream, label }, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * cellW;
      const y = row * cellH;

      const v = hiddenVideosRef.current.get(stream);
      if (v && v.readyState >= 2) {
        ctx.drawImage(v, x, y, cellW, cellH);
      }

      ctx.fillStyle = 'rgba(11, 61, 96, 0.8)';
      ctx.fillRect(x + 8, y + cellH - 30, ctx.measureText(label).width + 16, 24);
      ctx.fillStyle = 'white';
      ctx.font = '14px sans-serif';
      ctx.fillText(label, x + 16, y + cellH - 12);
    });

    animFrameIdRef.current = requestAnimationFrame(drawFrame);
  };

  drawFrame();

  const canvasStream = canvas.captureStream(30);
  myStreamRef.current.getAudioTracks().forEach(t => canvasStream.addTrack(t));

  const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
    ? 'video/webm;codecs=vp9,opus'
    : 'video/webm';

  const recorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond: 2_500_000 });
  mediaRecorderRef.current = recorder;
  recordingChunksRef.current = [];

  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) recordingChunksRef.current.push(e.data);
  };

  recorder.onstop = () => {
    cancelAnimationFrame(animFrameIdRef.current);
    // Чистимо всі приховані відео
    hiddenVideosRef.current.forEach(v => v.remove());
    hiddenVideosRef.current.clear();

    const blob = new Blob(recordingChunksRef.current, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `meeting-${new Date().toISOString().slice(0, 19)}.webm`;
    a.click();
    URL.revokeObjectURL(url);
    setRecordingDuration(0);
  };

  recorder.start(1000);
  setIsRecording(true);

  let seconds = 0;
  recordingTimerRef.current = setInterval(() => {
    seconds += 1;
    setRecordingDuration(seconds);
  }, 1000);
};

const stopRecording = () => {
  mediaRecorderRef.current?.stop();
  cancelAnimationFrame(animFrameIdRef.current);
  if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
  setIsRecording(false);
};

const formatDuration = (s: number) => {
  const m = Math.floor(s / 60).toString().padStart(2, '0');
  const sec = (s % 60).toString().padStart(2, '0');
  return `${m}:${sec}`;
};

  function handleSendMessage() {
    if (!newMessage.trim()) return
    const msg = {
        chatId: chatId,
        senderId: user.id,
        text: newMessage
    }
    socketRef.current?.emit('sendMessage', msg)
    setNewMessage('')
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0 || !chatId) return
    const file = files[0]
    e.target.value = ''
    try {
        const msgRes = await axios.post('http://localhost:3000/api/messages', {
            chatId: chatId,
            senderId: user.id,
            text: `📎 ${file.name}`
        })
        const messageId = msgRes.data.id

        const formData = new FormData()
        formData.append('file', file)
        formData.append('messageId', String(messageId))
        await axios.post('http://localhost:3000/api/files/upload', formData)

        const msg = {
            chatId: chatId,
            senderId: user.id,
            text: `📎 ${file.name}`
        }
        socketRef.current?.emit('sendMessage', msg)
    } catch (err) {
        console.error('Помилка завантаження файлу:', err)
    }
  }

  async function handleSendInvites() {
    try {
        setInviteMessage('');
        const usernames = inviteUsernames.split(',').map(u => u.trim()).filter(u => u);
        
        if (usernames.length === 0) {
            setInviteMessage('Введіть хоча б один нікнейм');
            return;
        }

        const ids: number[] = [];
        for (const username of usernames) {
            const res = await axios.get(`${API}/auth/users/search?username=${username}`);
            const found = res.data.find((u: any) => u.username === username);
            if (!found) {
                setInviteMessage(`Юзера "${username}" не знайдено`);
                return;
            }
            if (found.id !== user.id) {
                ids.push(found.id);
            }
        }

        if (ids.length > 0) {
            const meetingRes = await axios.get(`${API}/meetings/by-code/${roomCode}`);
            const meetingId = meetingRes.data.id;
            
            await axios.post(`${API}/invites`, {
                meetingId: meetingId, 
                userIds: ids
            });
            setInviteMessage('Запрошення успішно надіслано!');
            setInviteUsernames('');
            
            setTimeout(() => {
                setIsInviteModalOpen(false);
                setInviteMessage('');
            }, 2000);
        } else {
            setInviteMessage('Немає нових учасників для запрошення');
        }
    } catch (err) {
        setInviteMessage('Помилка при надсиланні запрошення');
        console.error(err);
    }
  }

  const handleLeaveMeeting = () => {
    if (window.confirm("Ви впевнені, що хочете покинути зустріч?")) {
      navigate('/');
    }
  };

  // Рахуємо ВСІ вікна: камери + екрани
// СТАЛО:
const hasScreenShare = Object.keys(screenStreams).length > 0;
const totalItems = Object.keys(peers).length + 1 + Object.keys(screenStreams).length;
const columns = Math.ceil(Math.sqrt(totalItems));
const rows = Math.ceil(totalItems / columns);

  const videoWrapperStyle: React.CSSProperties = {
    position: 'relative',
    background: ' #0b3d60',
    borderRadius: '12px',
    overflow: 'hidden',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  };

  const nameLabelStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '10px',
    left: '10px',
    background: ' #0b3d60',
    color: 'white',
    padding: '4px 10px',
    borderRadius: '6px',
    margin: 0,
    fontSize: '14px',
    zIndex: 10
  };

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Відео та Чат */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px' }}>
                {hasScreenShare ? (
  // ===== ZOOM-РЕЖИМ: демка велика, камери зверху =====
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%', gap: '8px' }}>
                
                {/* Маленькі камери зверху */}
                <div style={{ display: 'flex', gap: '8px', height: '120px', flexShrink: 0 }}>
                  {/* Моя камера */}
                  <div style={{ ...videoWrapperStyle, width: '160px', height: '120px', flexShrink: 0 }}>
                    <p style={{ ...nameLabelStyle, fontSize: '11px', padding: '2px 6px' }}>
                      {user.name || user.username} (Ви)
                    </p>
                    <video
                      ref={myVideoRef}
                      autoPlay
                      muted
                      style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                    />
                    {!isMicEnabled && (
                      <div style={{ position: 'absolute', top: '4px', right: '4px', background: '#ff6b6b', padding: '2px 4px', borderRadius: '50%', color: 'white', fontSize: '10px' }}>
                        🔇
                      </div>
                    )}
                  </div>

                  {/* Камери інших */}
                  {Object.entries(peers).map(([peerId, remoteStream]) => (
                    <div key={peerId} style={{ ...videoWrapperStyle, width: '160px', height: '120px', flexShrink: 0 }}>
                      <p style={{ ...nameLabelStyle, fontSize: '11px', padding: '2px 6px' }}>
                        {peerNames[peerId] || `Учасник`}
                      </p>
                      <RemoteVideo stream={remoteStream} />
                      {peersMicStates[peerId] === false && (
                        <div style={{ position: 'absolute', top: '4px', right: '4px', background: '#ff6b6b', padding: '2px 4px', borderRadius: '50%', color: 'white', fontSize: '10px' }}>
                          🔇
                        </div>
                      )}
                      {peersVideoStates[peerId] === false && (
                        <div style={{ position: 'absolute', inset: 0, background: '#0b3d60', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                          <span style={{ fontSize: 24 }}>👤</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Великі екрани внизу */}
                <div style={{ flex: 1, display: 'flex', gap: '8px', overflow: 'hidden' }}>
                  {Object.entries(screenStreams).map(([id, stream]) => (
                    <div key={`screen-${id}`} style={{ ...videoWrapperStyle, flex: 1, border: '3px solid #007bb5' }}>
                      <p style={nameLabelStyle}>
                        📺 {id === 'me-screen' ? 'Ваш екран' : screenNames[id] || 'Екран учасника'}
                      </p>
                      <RemoteVideo stream={stream} />
                    </div>
                  ))}
                </div>
              </div>

            ) : (
              // ===== ЗВИЧАЙНИЙ РЕЖИМ: сітка камер =====
              <div style={{
                flex: 1,
                display: 'grid',
                gridTemplateColumns: `repeat(${columns}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, 1fr)`,
                gap: '16px',
                width: '100%',
                height: '100%'
              }}>
                {/* Моє відео */}
                <div style={videoWrapperStyle}>
                  <p style={nameLabelStyle}>{user.name || user.username} (Ви)</p>
                  <video
                    ref={myVideoRef}
                    autoPlay
                    muted
                    style={{ width: '100%', height: '100%', objectFit: 'cover', transform: isScreenSharing ? 'scaleX(1)' : 'scaleX(-1)' }}
                  />
                  {!isMicEnabled && (
                    <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#ff6b6b', padding: '4px 8px', borderRadius: '50%', color: 'white' }}>
                      🔇
                    </div>
                  )}
                </div>

                {/* Відео інших */}
                {Object.entries(peers).map(([peerId, remoteStream]) => (
                  <div key={peerId} style={videoWrapperStyle}>
                    <p style={nameLabelStyle}>
                      {peerNames[peerId] || `Учасник ${peerId.substring(0, 4)}`}
                    </p>
                    <RemoteVideo stream={remoteStream} />
                    {peersMicStates[peerId] === false && (
                      <div style={{ position: 'absolute', top: '10px', right: '10px', background: '#ff6b6b', padding: '4px 8px', borderRadius: '50%', color: 'white', zIndex: 10 }}>
                        🔇
                      </div>
                    )}
                    {peersVideoStates[peerId] === false && (
                      <div style={{ position: 'absolute', inset: 0, background: '#0b3d60', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'white', zIndex: 5 }}>
                        <span style={{ fontSize: 48 }}>👤</span>
                        <span style={{ fontSize: 13, marginTop: 8, opacity: 0.7 }}>
                          {peerNames[peerId] || 'Учасник'} вимкнув камеру
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            </div>
            

          <div style={{ width: '300px', borderLeft: '1px solid #ddd', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>
                  <h3 style={{ margin: 0 }}>Чат зустрічі</h3>
              </div>
              <div style={{ flex: 1, padding: '12px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  
                  {messages.map((msg: any, index) => (
                      <div key={index} style={{
                          alignSelf: msg.senderId === user.id ? 'flex-end' : 'flex-start',
                          background: msg.senderId === user.id ? ' #007bb5' : ' #ffffff',
                          color: msg.senderId === user.id ? 'white' : ' #333',
                          padding: '8px 12px',
                          borderRadius: '12px',
                          maxWidth: '80%',
                          fontSize: '14px'
                      }}>
                          {msg.text}
                      </div>
                  ))}
              </div>
              <div ref={chatBottomRef} />
              <div style={{ padding: '12px', borderTop: '1px solid #ddd', display: 'flex', gap: '8px' }}>
                  <input
                      type="text"
                      placeholder="Повідомлення..."
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                      style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                  />
                  <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      onChange={handleFileUpload}
                  />
                  <button
                      onClick={() => fileInputRef.current?.click()}
                      style={{ padding: '8px 12px', background: ' #ff6b6b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                      📎
                  </button>
                  <button
                      onClick={handleSendMessage}
                      style={{ padding: '8px 12px', background: ' #007bb5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                      →
                  </button>
              </div>
          </div>
        </div>

        {/* Нижня плажка */}
        <div style={{ 
            height: '80px', 
            background: ' #fdf5e6', 
            color: 'white', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '0 30px',
            borderTop: '1px solid #e0cda7'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: ' #1a1b1c' }}>
                    Код: <span style={{ fontWeight: 'bold', color: ' #1a1b1c', marginLeft: '4px' }}>{roomCode}</span>
                </div>
                <button 
                    onClick={() => setIsInviteModalOpen(!isInviteModalOpen)}
                    style={{ 
                        background: ' #007bb5', color: 'white', border: 'none', padding: '6px 12px', 
                        borderRadius: '6px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold',
                        display: 'flex', alignItems: 'center', gap: '6px'
                    }}
                >
                    Запросити
                </button>
            </div>
            
            {/* Кнопки керування */}
            <div style={{ display: 'flex', gap: '20px' }}>
                {/* Кнопка Мікрофона (вже є у тебе) */}
                <button 
                    onClick={toggleMic}
                    style={{ 
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                        background: isMicEnabled ? ' #103e53' : ' #ff6b6b',
                        border: 'none', color: 'white', cursor: 'pointer', width: '70px', height: '60px',
                        borderRadius: '12px', transition: 'background 0.2s', fontWeight: 'bold'
                    }}>
                    <span style={{ fontSize: '24px', marginBottom: '4px' }}>
                        {isMicEnabled ? '🎤' : '🔇'}
                    </span>
                </button>
                    <button 
                    onClick={toggleScreenShare}
                    style={{ 
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                        background: isScreenSharing ? '#10b981' : '#007bb5', // Зелений, якщо трансляція йде
                        border: 'none', color: 'white', cursor: 'pointer', width: '70px', height: '60px',
                        borderRadius: '12px', transition: 'background 0.2s', fontWeight: 'bold'
                    }}>
                    <span style={{ fontSize: '24px', marginBottom: '4px' }}>
                        {isScreenSharing ? '🛑' : '🖥️'} 
                    </span>
                    <span style={{ fontSize: '10px' }}>Екран</span>
                </button>
                {/* Кнопка Запису */}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: isRecording ? '#dc2626' : '#374151',
                    border: 'none', color: 'white', cursor: 'pointer', width: '70px', height: '60px',
                    borderRadius: '12px', transition: 'background 0.2s', fontWeight: 'bold'
                  }}>
                  <span style={{ fontSize: '24px', marginBottom: '4px' }}>
                    {isRecording ? '⏹️' : '⏺️'}
                  </span>
                  <span style={{ fontSize: '10px' }}>
                    {isRecording ? formatDuration(recordingDuration) : 'Запис'}
                  </span>
                </button>
                {/* Оновлена Кнопка Камери */}
                <button 
                    onClick={toggleVideo} // Викликаємо функцію, яку ми створили
                    style={{ 
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                        background: isVideoEnabled ? ' #007bb5' : ' #ff6b6b', // Міняє колір: синій/червоний
                        border: 'none', color: 'white', cursor: 'pointer', width: '70px', height: '60px',
                        borderRadius: '12px', transition: 'background 0.2s', fontWeight: 'bold'
                    }}>
                    <span style={{ fontSize: '24px', marginBottom: '4px' }}>
                        {isVideoEnabled ? <img src={cameraIcon} style={{ width: '24px' }} /> : '🚫'} 
                    </span>
                    <span style={{ fontSize: '10px' }}>Камера</span>
                </button>
            </div>

            {/* Кількість учасників */}
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: ' #1a1b1c', display: 'flex', alignItems: 'center', gap: '8px' }}>
                👥 Учасників: 
                <span style={{ background: ' #007bb5', padding: '4px 12px', borderRadius: '12px', fontWeight: 'bold', color: 'white' }}>
                    {Object.keys(peers).length + 1}
                </span>

                <button 
                    onClick={handleLeaveMeeting}
                    style={{ 
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                        background: ' #ff6b6b',
                        border: 'none', color: 'white', cursor: 'pointer', width: '70px', height: '60px',
                        borderRadius: '12px', fontWeight: 'bold'
                    }}>
                    <span style={{ fontSize: '11px', marginTop: '2px' }}>Вийти</span>
                </button>
            </div>

        </div>
        {/* Вікно запрошення */}
        {isInviteModalOpen && (
            <div style={{ 
                position: 'absolute', 
                bottom: '90px',
                left: '30px',
                background: ' #111827', 
                border: '1px solid #fdf5e6',
                padding: '20px', 
                borderRadius: '12px', 
                width: '320px', 
                boxShadow: '0 10px 25px rgba(0, 75, 100, 0.15)', 
                zIndex: 50 
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h4 style={{ margin: 0, color: 'white', fontSize: '16px' }}>Запросити учасників</h4>
                    <button 
                        onClick={() => setIsInviteModalOpen(false)} 
                        style={{ background: 'transparent', border: 'none', color: ' #9ca3af', cursor: 'pointer', fontSize: '16px' }}
                    >
                        ✖
                    </button>
                </div>
                
                <input 
                    type="text" 
                    placeholder="Нікнейми через кому..." 
                    value={inviteUsernames}
                    onChange={e => setInviteUsernames(e.target.value)}
                    style={{ 
                        width: '100%', padding: '10px', borderRadius: '8px', 
                        border: '1px solid rgba(0, 75, 100, 0.15)', background: ' #111827', 
                        color: 'white', marginBottom: '12px', boxSizing: 'border-box',
                        outline: 'none'
                    }}
                />
                
                {inviteMessage && (
                    <div style={{ 
                        fontSize: '13px', 
                        color: inviteMessage.includes('Помилка') || inviteMessage.includes('не знайдено') ? '#ef4444' : '#10b981', 
                        marginBottom: '12px' 
                    }}>
                        {inviteMessage}
                    </div>
                )}
                
                <button 
                    onClick={handleSendInvites} 
                    style={{ 
                        width: '100%', padding: '10px', background: ' #007bb5', 
                        color: 'white', border: 'none', borderRadius: '8px', 
                        cursor: 'pointer', fontWeight: 'bold' 
                    }}
                >
                    Надіслати запрошення
                </button>
            </div>
        )}

    </div>
  );
}