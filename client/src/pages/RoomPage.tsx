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
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
      }
    }, [stream]);
  
    return <video ref={videoRef} autoPlay style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
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

  const [peers, setPeers] = useState<Record<string, MediaStream>>({});
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [peersMicStates, setPeersMicStates] = useState<Record<string, boolean>>({});

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteUsernames, setInviteUsernames] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');

  const chatId = Number(localStorage.getItem('meetingChatId'))

  const applyBitrateLimit = (call: any) => {
    call.on('stream', () => {
      const pc = call.peerConnection;
      if (!pc) return;

      const sender = pc.getSenders().find((s: any) => s.track?.kind === 'video');
      if (sender) {
        const parameters = sender.getParameters();
        if (!parameters.encodings || parameters.encodings.length === 0) {
          parameters.encodings = [{}];
        }

        parameters.encodings[0].maxBitrate = 150000; 
        
        sender.setParameters(parameters)
          .then(() => console.log('Bitrate limited to 150kbps'))
          .catch((err: any) => console.error('Bitrate limit error:', err));
      }
    });
  };

  useEffect(() => {
    const socket = io('http://localhost:3000', {
        transports: ['websocket'],
        query: { userId: user.id },
    });
    socketRef.current = socket;
    (window as any)._socket = socket

    const calls = new Map<string, any>();

    const addVideoStream = (userId: string, stream: MediaStream, userName?: string) => {
        setPeers((prev) => {
            if (prev[userId]) return prev;
            return { ...prev, [userId]: stream as any };
        });

        if (userName) {
            setPeerNames(prev => ({ ...prev, [userId]: userName }));
        }
        
        setPeersMicStates((prev) => {
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
          const incomingName = (call.metadata as any)?.userName || 'Учасник';
          
          call.answer(myStream);
          applyBitrateLimit(call);
          call.on('stream', (remoteStream) => {
            addVideoStream(call.peer, remoteStream, incomingName);
          });
          calls.set(call.peer, call);
        });

        socket.on('user-connected', (remotePeerId: string, remoteUserName: string) => {
          console.log('Підключився:', remoteUserName);

          const call = peer.call(remotePeerId, myStream, {
            metadata: { userName: user.name || user.username || 'Гість' }
          });
          applyBitrateLimit(call);
          call.on('stream', (remoteStream) => {
            addVideoStream(remotePeerId, remoteStream, remoteUserName);
          });
          calls.set(remotePeerId, call);
        });

        socket.on('initial-mic-states', (states: Record<string, boolean>) => {
            setPeersMicStates((prev) => ({
                ...prev,
                ...states
            }));
        });

        socket.on('user-disconnected', (remotePeerId: string) => {
          calls.get(remotePeerId)?.close();
          calls.delete(remotePeerId);
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
      } catch (err) {
        console.error('Помилка доступу до камери:', err);
      }
    };

    initCall();
    socket.emit('joinChat', chatId)
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

  const participantCount = Object.keys(peers).length + 1;
  const columns = Math.ceil(Math.sqrt(participantCount));
  const rows = Math.ceil(participantCount / columns);

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
                            style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scaleX(-1)' }} 
                        />
                        {!isMicEnabled && (
                            <div style={{ position: 'absolute', top: '10px', right: '10px', background: ' #ff6b6b', padding: '4px 8px', borderRadius: '50%', color: 'white' }}>
                                🔇
                            </div>
                        )}
                    </div>

                    {/* Відео інших учасників */}
                    {Object.entries(peers).map(([peerId, remoteStream]) => (
                        <div key={peerId} style={videoWrapperStyle}>
                            <p style={nameLabelStyle}>
                                {peerNames[peerId] || `Учасник ${peerId.substring(0, 4)}`}
                            </p>
                            <RemoteVideo stream={remoteStream} />
                            {peersMicStates[peerId] === false && (
                                <div style={{ position: 'absolute', top: '10px', right: '10px', background: ' #ff6b6b', padding: '4px 8px', borderRadius: '50%', color: 'white', zIndex: 10 }}>
                                    🔇
                                </div>
                            )}
                        </div>
                    ))}

                </div>
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
                <button 
                    onClick={toggleMic}
                    style={{ 
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                        background: isMicEnabled ? ' #007bb5' : ' #ff6b6b',
                        border: 'none', color: 'white', cursor: 'pointer', width: '70px', height: '60px',
                        borderRadius: '12px', transition: 'background 0.2s', fontWeight: 'bold'
                    }}>
                    <span style={{ fontSize: '24px', marginBottom: '4px' }}>
                        {isMicEnabled ? '🎤' : '🔇'}
                    </span>
                </button>
                <button style={{ 
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                    background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', width: '70px'
                }}>
                    <img src={cameraIcon} alt="Камера" style={{ width: '24px', height: '24px', marginBottom: '4px' }} />
                    <span style={{ fontSize: '12px' }}>Камера</span>
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