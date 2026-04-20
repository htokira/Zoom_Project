import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import Peer from 'peerjs';
import axios from 'axios'

const user = JSON.parse(localStorage.getItem('user') || '{}')

const RemoteVideo = ({ stream }: { stream: MediaStream }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
  
    useEffect(() => {
      if (videoRef.current && stream) {
        videoRef.current.srcObject = stream;
      }
    }, [stream]);
  
    return <video ref={videoRef} autoPlay style={{ width: '300px' }} />;
};

export default function MeetingRoom() {
  const { roomCode } = useParams();
  const fileInputRef = useRef<HTMLInputElement>(null)
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const peerInstance = useRef<Peer | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const myStreamRef = useRef<MediaStream | null>(null);
  const [peers, setPeers] = useState<Record<string, MediaStream>>({});
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')

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
    };

    const initCall = async () => {
      try {
        const myStream = await navigator.mediaDevices.getUserMedia({
          video: true,
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

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
        <div style={{ flex: 1, padding: '20px' }}>
            <h2>Кімната: {roomCode}</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
                <div style={{ textAlign: 'center' }}>
                    <p>Ви (Я)</p>
                    <video ref={myVideoRef} autoPlay muted style={{ width: '300px', borderRadius: '8px', transform: 'scaleX(-1)' }} />
                </div>
                {Object.entries(peers).map(([peerId, remoteStream]) => (
                    <div key={peerId} style={{ textAlign: 'center' }}>
                        <p>Учасник: {peerId.substring(0, 5)}...</p>
                        <RemoteVideo stream={remoteStream} />
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
  );
}