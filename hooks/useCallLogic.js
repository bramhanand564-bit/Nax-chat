// ==========================================
// FILE: hooks/useCallLogic.js
// ==========================================
import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { RTCSessionDescription, RTCIceCandidate } from 'react-native-webrtc';
import { collection, doc, onSnapshot, setDoc, updateDoc, addDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

import useMediaStream from './useMediaStream';
import { createPeerConnection, processIceQueue } from '../utils/webrtcHelper';

export default function useCallLogic(route, navigation) {
  const params = route?.params || {};
  const type = params.type === 'voice' ? 'voice' : 'video';
  const name = params.name || 'Nax User';
  const friendId = params.friendId || params.receiverId || '';
  const isCaller = params.isCaller === true;
  const incomingCallId = params.callId || '';
  const currentUser = auth.currentUser;

  const {
    localStream, localStreamRef, isMuted, isCameraOff, facing,
    createLocalStream, toggleMute, toggleCamera, switchCamera, stopLocalStream
  } = useMediaStream(type);

  const [remoteStream, setRemoteStream] = useState(null);
  const [status, setStatus] = useState(isCaller ? 'Calling...' : 'Connecting...');
  const [connected, setConnected] = useState(false);
  const [timer, setTimer] = useState(0);
  const [busy, setBusy] = useState(true);

  const peerRef = useRef(null);
  const callRef = useRef(null);
  const candidateCleanupRef = useRef([]);
  const mountedRef = useRef(true);
  const timerRef = useRef(null);
  const iceCandidateQueue = useRef([]);

  useEffect(() => {
    if (!connected) return undefined;
    timerRef.current = setInterval(() => setTimer((v) => v + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [connected]);

  useEffect(() => {
    mountedRef.current = true;
    startCall();
    return () => { mountedRef.current = false; cleanupCall(false); };
  }, []);

  const initializePeer = (stream) => {
    const pc = createPeerConnection(
      stream,
      type,
      (remote) => {
        if (mountedRef.current) {
          setRemoteStream(remote);
        }
      },
      async (candidate) => {
        if (!callRef.current) return;
        try {
          const side = isCaller ? 'offerCandidates' : 'answerCandidates';
          await addDoc(collection(db, 'calls', callRef.current, side), candidate.toJSON());
        } catch (error) { 
          console.log('❌ ICE Firebase Write Error:', error); 
        }
      }
    );

    // Track ICE connection state directly for reliable connection status
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log("🧊 ICE State Changed:", state);
      
      if ((state === 'connected' || state === 'completed') && mountedRef.current) {
        setConnected(true); 
        setBusy(false); 
        setStatus('Connected');
      }
      if (state === 'disconnected' && mountedRef.current) setStatus('Connection lost');
      if (state === 'failed' && mountedRef.current) { setStatus('Connection failed'); setBusy(false); }
    };

    peerRef.current = pc;
    return pc;
  };

  const listenForRemoteCandidates = (callId, pc, collectionName) => {
    const unsubscribe = onSnapshot(collection(db, 'calls', callId, collectionName), (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type !== 'added') return;
        try {
          const candidateData = change.doc.data();
          if (!pc.remoteDescription) {
            iceCandidateQueue.current.push(candidateData);
          } else {
            await pc.addIceCandidate(new RTCIceCandidate(candidateData));
          }
        } catch (error) {
          console.log('❌ Remote ICE Add Error:', error);
        }
      });
    });
    candidateCleanupRef.current.push(unsubscribe);
  };

  const listenForCallStatus = (callId) => {
    const unsubscribe = onSnapshot(doc(db, 'calls', callId), (snapshot) => {
      const data = snapshot.data();
      if (!data) return;
      if (data.status === 'rejected' || data.status === 'ended') navigation.goBack();
    });
    candidateCleanupRef.current.push(unsubscribe);
  };

  const startOutgoingCall = async () => {
    if (!friendId) throw new Error('Friend ID missing.');
    const callDoc = doc(collection(db, 'calls'));
    callRef.current = callDoc.id;

    const stream = await createLocalStream();
    const pc = initializePeer(stream);

    listenForRemoteCandidates(callDoc.id, pc, 'answerCandidates');

    await setDoc(callDoc, {
      callerId: currentUser.uid, receiverId: friendId, callerName: currentUser.displayName || 'User',
      receiverName: name, type, status: 'ringing', createdAt: serverTimestamp(),
    });

    const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: type === 'video' });
    await pc.setLocalDescription(offer);
    await updateDoc(callDoc, { offer: { type: offer.type, sdp: offer.sdp } });

    listenForAnswer(callDoc.id, pc);
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
        await processIceQueue(pc, iceCandidateQueue);
      } catch (error) {
        console.log('❌ Answer Processing Error:', error);
      }
    });
    candidateCleanupRef.current.push(unsubscribe);
  };

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
      const pc = initializePeer(stream);

      listenForRemoteCandidates(incomingCallId, pc, 'offerCandidates');

      const snap = await getDoc(callDoc);
      const data = snap.data();
      if (data && data.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        await processIceQueue(pc, iceCandidateQueue);

        const answer = await pc.createAnswer({ offerToReceiveAudio: true, offerToReceiveVideo: type === 'video' });
        await pc.setLocalDescription(answer);
        await updateDoc(callDoc, { answer: { type: answer.type, sdp: answer.sdp }, status: 'connected' });
      }
    } catch (error) { 
      console.log('❌ Accept Call Error:', error); 
      cleanupCall(true); 
    }
  };

  const declineCall = async () => {
    try {
      if (callRef.current) await updateDoc(doc(db, 'calls', callRef.current), { status: 'rejected', endedAt: serverTimestamp() });
    } catch (error) {
      console.log('❌ Decline Error:', error);
    }
    cleanupCall(true);
  };

  const startCall = async () => {
    try {
      if (!currentUser?.uid) throw new Error('Login required.');
      if (isCaller) await startOutgoingCall();
      else await startIncomingCall();
    } catch (error) { Alert.alert('Call Error', error?.message, [{ text: 'OK', onPress: () => navigation.goBack() }]); }
  };

  const endCall = async () => {
    try { if (callRef.current) await updateDoc(doc(db, 'calls', callRef.current), { status: 'ended', endedAt: serverTimestamp() }); } catch (error) {}
    cleanupCall(true);
  };

  const cleanupCall = (goBack) => {
    candidateCleanupRef.current.forEach((unsub) => { try { unsub(); } catch {} });
    candidateCleanupRef.current = [];
    if (timerRef.current) clearInterval(timerRef.current);
    
    stopLocalStream();

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
