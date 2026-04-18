import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import Peer from 'peerjs';

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
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const peerInstance = useRef<Peer | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const myStreamRef = useRef<MediaStream | null>(null);
  const [peers, setPeers] = useState<Record<string, MediaStream>>({});

  useEffect(() => {
    const socket = io('http://localhost:3000', {
        transports: ['websocket'],
    });
    socketRef.current = socket;

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

    return () => {
      socket.disconnect();
      peerInstance.current?.destroy();
      myStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [roomCode]);

  return (
    <div style={{ padding: '20px' }}>
      <h2>Кімната: {roomCode}</h2>
      <div id="video-grid" style={{ display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
        {/* Твоє відео */}
        <div style={{ textAlign: 'center' }}>
            <p>Ви (Я)</p>
            <video ref={myVideoRef} autoPlay muted style={{ width: '300px', borderRadius: '8px', transform: 'scaleX(-1)' }} />
        </div>
        
        {/* Відео інших учасників */}
        {Object.entries(peers).map(([peerId, remoteStream]) => (
          <div key={peerId} style={{ textAlign: 'center' }}>
            <p>Учасник: {peerId.substring(0, 5)}...</p>
            <RemoteVideo stream={remoteStream} />
          </div>
        ))}
      </div>
    </div>
  );
}
