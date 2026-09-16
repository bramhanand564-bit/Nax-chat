// ==========================================
// FILE: utils/webrtcHelper.js
// ==========================================
import { RTCPeerConnection, RTCIceCandidate } from 'react-native-webrtc';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    }
  ],
};

export function createPeerConnection(stream, type, onTrack, onIceCandidate) {
  const pc = new RTCPeerConnection(ICE_SERVERS);

  // 🚀 CLEAN IMPLEMENTATION: No addTransceiver, just addTrack to avoid duplicate ghost tracks
  if (stream) {
    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });
  }

  pc.ontrack = (event) => {
    if (event.streams && event.streams[0]) {
      onTrack(event.streams[0]);
    }
  };

  // React Native Fallback
  pc.onaddstream = (event) => {
    if (event.stream) {
      onTrack(event.stream);
    }
  };

  pc.onicecandidate = (event) => {
    if (event.candidate && onIceCandidate) {
      onIceCandidate(event.candidate);
    }
  };

  return pc;
}

export async function processIceQueue(pc, queueRef) {
  while (queueRef.current.length > 0) {
    const candidateData = queueRef.current.shift();
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidateData));
    } catch (error) {
      console.log('❌ Queue Process Error:', error);
    }
  }
}
