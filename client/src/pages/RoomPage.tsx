import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import io from 'socket.io-client';
import Peer from 'peerjs';

const socket = io('http://localhost:3000');

export default function MeetingRoom() {
  const { roomCode } = useParams();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const myVideoRef = useRef<HTMLVideoElement>(null);
  const peerInstance = useRef<Peer | null>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((myStream) => {
      setStream(myStream);
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = myStream;
      }

      const peer = new Peer();
      peerInstance.current = peer;

      peer.on('open', (id) => {
        socket.emit('join-room', roomCode, id);
      });

      peer.on('call', (call) => {
        call.answer(myStream);
        call.on('stream', (userVideoStream) => {
          // Логіка додавання відео іншого користувача на екран
        });
      });
    });

    return () => {
      socket.disconnect();
      peerInstance.current?.destroy();
    };
  }, [roomCode]);

  return (
    <div>
      <h2>Кімната: {roomCode}</h2>
      <div id="video-grid">
        <video ref={myVideoRef} autoPlay muted style={{ width: '300px' }} />
        {/* Сюди будуть додаватися відео інших учасників */}
      </div>
    </div>
  );
}