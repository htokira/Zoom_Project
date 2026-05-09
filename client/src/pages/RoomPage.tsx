import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import Peer from 'peerjs';
import axios from 'axios';
import microphoneIcon from '../assets/microphone.png';
import cameraIcon from '../assets/camera.png';

const user = JSON.parse(localStorage.getItem('user') || '{}')

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
  const { roomCode } = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null)
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const peerInstance = useRef<Peer | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const myStreamRef = useRef<MediaStream | null>(null);

  const [peers, setPeers] = useState<Record<string, MediaStream>>({});
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [peersMicStates, setPeersMicStates] = useState<Record<string, boolean>>({});

  const chatId = Number(localStorage.getItem('meetingChatId'))

  useEffect(() => {
    const socket = io('http://localhost:3000', {
        transports: ['websocket'],
    });
    socketRef.current = socket;
    (window as any)._socket = socket

    const calls = new Map<string, any>();

    const addVideoStream = (userId: string, stream: MediaStream) => {
      setPeers((prev) => {
        if (prev[userId]) return prev;
        return { ...prev, [userId]: stream as any };
      });
      setPeersMicStates((prev) => ({ ...prev, [userId]: true }));
    };

    const initCall = async () => {
      try {
        const myStream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, frameRate: 15 },
          audio: true,
        });
        myStreamRef.current = myStream;

        if (myVideoRef.current) {
          myVideoRef.current.srcObject = myStream;
        }

        const peer = new Peer();
        peerInstance.current = peer;

        peer.on('open', (id) => {
          console.log('Мій Peer ID:', id);
          socket.emit('join-room', roomCode, id);
        });

        peer.on('call', (call) => {
          call.answer(myStream);
          call.on('stream', (remoteStream) => {
            addVideoStream(call.peer, remoteStream);
          });
          calls.set(call.peer, call);
        });

        socket.on('user-connected', (remotePeerId: string) => {
          console.log('Новий учасник:', remotePeerId);
          const call = peer.call(remotePeerId, myStream);
          call.on('stream', (remoteStream) => {
            addVideoStream(remotePeerId, remoteStream);
          });
          calls.set(remotePeerId, call);
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

    return () => {
      socket.disconnect();
      peerInstance.current?.destroy();
      myStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [roomCode]);

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

  const participantCount = Object.keys(peers).length + 1;
  const columns = Math.ceil(Math.sqrt(participantCount));
  const rows = Math.ceil(participantCount / columns);

  const videoWrapperStyle: React.CSSProperties = {
    position: 'relative',
    background: '#000',
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
    background: 'rgba(0, 0, 0, 0.6)',
    color: 'white',
    padding: '4px 10px',
    borderRadius: '6px',
    margin: 0,
    fontSize: '14px',
    zIndex: 10
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
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
                        <p style={nameLabelStyle}>Ви (Я)</p>
                        <video 
                            ref={myVideoRef} 
                            autoPlay 
                            muted 
                            style={{ width: '100%', height: '100%', objectFit: 'contain', transform: 'scaleX(-1)' }} 
                        />
                        {!isMicEnabled && (
                            <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(239, 68, 68, 0.8)', padding: '4px 8px', borderRadius: '50%', color: 'white' }}>
                                🔇
                            </div>
                        )}
                    </div>

                    {/* Відео інших учасників */}
                    {Object.entries(peers).map(([peerId, remoteStream]) => (
                        <div key={peerId} style={videoWrapperStyle}>
                            <p style={nameLabelStyle}>{peerId.substring(0, 5)}...</p>
                            <RemoteVideo stream={remoteStream} />
                            {peersMicStates[peerId] === false && (
                                <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(239, 68, 68, 0.8)', padding: '4px 8px', borderRadius: '50%', color: 'white', zIndex: 10 }}>
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
                          background: msg.senderId === user.id ? '#4f46e5' : '#f3f4f6',
                          color: msg.senderId === user.id ? 'white' : 'black',
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
                      style={{ padding: '8px 12px', background: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                      📎
                  </button>
                  <button
                      onClick={handleSendMessage}
                      style={{ padding: '8px 12px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                  >
                      →
                  </button>
              </div>
          </div>
        </div>

        {/* Нижня плажка */}
        <div style={{ 
            height: '80px', 
            background: '#1f2937', 
            color: 'white', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '0 30px',
            borderTop: '1px solid #374151'
        }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                Код кімнати: <span style={{ fontWeight: 'normal', color: '#9ca3af', marginLeft: '8px' }}>{roomCode}</span>
            </div>
            
            {/* Кнопки керування */}
            <div style={{ display: 'flex', gap: '20px' }}>
                <button 
                    onClick={toggleMic}
                    style={{ 
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
                        background: isMicEnabled ? '#374151' : '#ef4444', // Червоний, якщо вимкнено
                        border: 'none', color: 'white', cursor: 'pointer', width: '70px', height: '60px',
                        borderRadius: '12px', transition: 'background 0.2s'
                    }}>
                    <span style={{ fontSize: '24px', marginBottom: '4px' }}>
                        {isMicEnabled ? '🎤' : '🔇'}
                    </span>
                    <span style={{ fontSize: '12px' }}>
                        {isMicEnabled ? 'Вимкнути' : 'Увімкнути'}
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
            <div style={{ fontSize: '16px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                👥 Учасників: 
                <span style={{ background: '#374151', padding: '4px 12px', borderRadius: '12px', fontWeight: 'bold' }}>
                    {Object.keys(peers).length + 1}
                </span>
            </div>
        </div>
    </div>
  );
}