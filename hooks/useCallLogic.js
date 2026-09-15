// ==========================================
// FILE: hooks/useCallLogic.js
// ==========================================
import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices } from 'react-native-webrtc';
import { collection, doc, onSnapshot, setDoc, updateDoc, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export default function useCallLogic(route, navigation) {
  const params = route?.params || {};
  const type = params.type === 'voice' ? 'voice' : 'video';
  const name = params.name || 'Nax User';
  const friendId = params.friendId || params.receiverId || '';
  const isCaller = params.isCaller === true;
  const incomingCallId = params.callId || '';
  const currentUser = auth.currentUser;

  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(type !== 'video');
  const [facing, setFacing] = useState('front');
  const [status, setStatus] = useState(isCaller ? 'Calling...' : 'Connecting...');
  const [connected, setConnected] = useState(false);
  const [timer, setTimer] = useState(0);
  const [busy, setBusy] = useState(true);

  const peerRef = useRef(null);
  const callRef = useRef(null);
  const candidateCleanupRef = useRef([]);
  const mountedRef = useRef(true);
  const timerRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);

  useEffect(() => {
    if (!connected) return undefined;
    timerRef.current = setInterval(() => setTimer((value) => value + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [connected]);

  useEffect(() => {
    mountedRef.current = true;
    startCall();
    return () => { mountedRef.current = false; cleanupCall(false); };
  }, []);

  const createLocalStream = async () => {
    const constraints = {
      audio: true,
      video: type === 'video' ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } } : false,
    };
    const stream = await mediaDevices.getUserMedia(constraints);
    localStreamRef.current = stream;
    if (mountedRef.current) setLocalStream(stream);
    return stream;
  };

  const createPeer = (stream) => {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peerRef.current = pc;
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.ontrack = (event) => {
      const stream = event.streams?.[0];
      if (!stream) return;
      remoteStreamRef.current = stream;
      if (mountedRef.current) {
        setRemoteStream(stream);
        setConnected(true);
        setBusy(false);
        setStatus('Connected');
      }
    };

    pc.onicecandidate = async (event) => {
      if (!event.candidate || !callRef.current) return;
      try {
        const side = isCaller ? 'offerCandidates' : 'answerCandidates';
        await addDoc(collection(db, 'calls', callRef.current, side), event.candidate.toJSON());
      } catch (error) { console.log('ICE error:', error); }
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      if (state === 'connected' && mountedRef.current) { 
        setConnected(true); setBusy(false); setStatus('Connected'); 
      }
      if (state === 'disconnected' && mountedRef.current) setStatus('Connection lost');
      if (state === 'failed' && mountedRef.current) { setStatus('Connection failed'); setBusy(false); }
    };
    return pc;
  };

  // ==========================================
  // CALLER LOGIC
  // ==========================================
  const startOutgoingCall = async () => {
    if (!friendId) throw new Error('Friend ID missing.');
    const callDoc = doc(collection(db, 'calls'));
    callRef.current = callDoc.id;
    const stream = await createLocalStream();
    const pc = createPeer(stream);

    await setDoc(callDoc, {
      callerId: currentUser.uid, receiverId: friendId, callerName: currentUser.displayName || 'User',
      receiverName: name, type, status: 'ringing', createdAt: serverTimestamp(),
    });

    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: type === 'video' });
    await pc.setLocalDescription(offer);
    await updateDoc(callDoc, { offer: { type: offer.type, sdp: offer.sdp } });

    listenForAnswer(callDoc.id, pc);
    // 🛑 Yahan se maine ICE candidate listener hata diya hai (Bug yahi tha!)
    listenForCallStatus(callDoc.id);

    if (mountedRef.current) { setBusy(false); setStatus('Ringing...'); }
  };

  const listenForAnswer = (callId, pc) => {
    const unsubscribe = onSnapshot(doc(db, 'calls', callId), async (snapshot) => {
      const data = snapshot.data();
      if (!data) return;
      if (data.status === 'rejected') { Alert.alert('Rejected', `${name} declined.`); navigation.goBack(); return; }
      if (data.status === 'ended') { navigation.goBack(); return; }
      
      if (!data.answer || pc.remoteDescription) return;
      
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        if (mountedRef.current) setStatus('Connecting...');
        
        // 🚀 FIX: Jab call puri connect hone wali ho, TAB network raste (ICE) check karo!
        listenForRemoteCandidates(callId, pc, 'answerCandidates');
      } catch (error) {}
    });
    candidateCleanupRef.current.push(unsubscribe);
  };

  // ==========================================
  // RECEIVER LOGIC
  // ==========================================
  const startIncomingCall = async () => {
    if (!incomingCallId) throw new Error('Call ID missing.');
    callRef.current = incomingCallId;
    setStatus('Incoming...'); setBusy(false);
    
    const callDoc = doc(db, 'calls', incomingCallId);
    const unsubscribe = onSnapshot(callDoc, (snapshot) => {
      const data = snapshot.data();
      if (!data) return;
      if (data.status === 'ended' || data.status === 'rejected') {
        unsubscribe();
        if (mountedRef.current) { setStatus('Call ended'); cleanupCall(true); }
      }
    });
    candidateCleanupRef.current.push(unsubscribe);
  };

  const acceptCall = async () => {
    setStatus('Connecting...');
    const callDoc = doc(db, 'calls', incomingCallId);
    try {
      const stream = await createLocalStream();
      const pc = createPeer(stream);
      // 🛑 Yahan se bhi purana ICE candidate listener hata diya gaya hai

      const snap = await getDoc(callDoc);
      const data = snap.data();
      if (data && data.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        const answer = await pc.createAnswer({ offerToReceiveAudio: true, offerToReceiveVideo: type === 'video' });
        await pc.setLocalDescription(answer);
        await updateDoc(callDoc, { answer: { type: answer.type, sdp: answer.sdp }, status: 'connected' });

        // 🚀 FIX: Yahan par lagaya gaya hai ICE candidate listener
        listenForRemoteCandidates(incomingCallId, pc, 'offerCandidates');
      }
    } catch (error) { console.log('Accept error:', error); cleanupCall(true); }
  };

  // ==========================================
  // COMMON LOGIC
  // ==========================================
  const listenForRemoteCandidates = (callId, pc, collectionName) => {
    const unsubscribe = onSnapshot(collection(db, 'calls', callId, collectionName), (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type !== 'added') return;
        try { await pc.addIceCandidate(new RTCIceCandidate(change.doc.data())); } catch (error) {}
      });
    });
    candidateCleanupRef.current.push(unsubscribe);
  };

  const declineCall = async () => {
    try {
      if (callRef.current) await updateDoc(doc(db, 'calls', callRef.current), { status: 'rejected', endedAt: serverTimestamp() });
    } catch (error) {}
    cleanupCall(true);
  };

  const startCall = async () => {
    try {
      if (!currentUser?.uid) throw new Error('Login required.');
      if (isCaller) await startOutgoingCall();
      else await startIncomingCall();
    } catch (error) { Alert.alert('Call Error', error?.message, [{ text: 'OK', onPress: () => navigation.goBack() }]); }
  };

  const listenForCallStatus = (callId) => {
    const unsubscribe = onSnapshot(doc(db, 'calls', callId), (snapshot) => {
      const data = snapshot.data();
      if (!data) return;
      if (data.status === 'rejected' || data.status === 'ended') navigation.goBack();
    });
    candidateCleanupRef.current.push(unsubscribe);
  };

  const toggleMute = () => {
    if (!localStreamRef.current) return;
    localStreamRef.current.getAudioTracks().forEach(track => track.enabled = !track.enabled);
    setIsMuted(v => !v);
  };

  const toggleCamera = () => {
    if (type !== 'video' || !localStreamRef.current) return;
    localStreamRef.current.getVideoTracks().forEach(track => track.enabled = !track.enabled);
    setIsCameraOff(v => !v);
  };

  const switchCamera = () => {
    if (!localStreamRef.current) return;
    const videoTrack = localStreamRef.current.getVideoTracks()[0];
    if (videoTrack && typeof videoTrack._switchCamera === 'function') {
      videoTrack._switchCamera();
      setFacing(v => v === 'front' ? 'back' : 'front');
    }
  };

  const endCall = async () => {
    try { if (callRef.current) await updateDoc(doc(db, 'calls', callRef.current), { status: 'ended', endedAt: serverTimestamp() }); } catch (error) {}
    cleanupCall(true);
  };

  const cleanupCall = (goBack) => {
    candidateCleanupRef.current.forEach((unsub) => { try { unsub(); } catch {} });
    candidateCleanupRef.current = [];
    if (timerRef.current) clearInterval(timerRef.current);
    if (localStreamRef.current) localStreamRef.current.getTracks().forEach(track => { try { track.stop(); } catch {} });
    localStreamRef.current = null;
    if (peerRef.current) { try { peerRef.current.close(); } catch {} }
    peerRef.current = null;
    if (goBack) navigation.goBack();
  };

  const formatTime = (value) => {
    const m = Math.floor(value / 60).toString().padStart(2, '0');
    const s = (value % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return {
    type, name, isCaller,
    localStream, remoteStream, isMuted, isCameraOff, facing, status, connected, timer, busy,
    acceptCall, declineCall, endCall, toggleMute, toggleCamera, switchCamera, formatTime
  };
}
