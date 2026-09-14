import React, {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from 'react-native';

import {
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  mediaDevices,
} from 'react-native-webrtc';

import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';

import {
  auth,
  db,
} from '../firebaseConfig';

import {
  Ionicons,
} from '@expo/vector-icons';


const ICE_SERVERS = {
  iceServers: [
    {
      urls: 'stun:stun.l.google.com:19302',
    },
    {
      urls: 'stun:stun1.l.google.com:19302',
    },
  ],
};


export default function CallScreen({
  route,
  navigation,
}) {
  const params =
    route?.params || {};

  const type =
    params.type === 'voice'
      ? 'voice'
      : 'video';

  const name =
    params.name ||
    'Nax User';

  const friendId =
    params.friendId ||
    params.receiverId ||
    '';

  const isCaller =
    params.isCaller === true;

  const incomingCallId =
    params.callId ||
    '';

  const currentUser =
    auth.currentUser;


  const [localStream, setLocalStream] =
    useState(null);

  const [remoteStream, setRemoteStream] =
    useState(null);

  const [isMuted, setIsMuted] =
    useState(false);

  const [isCameraOff, setIsCameraOff] =
    useState(type !== 'video');

  const [facing, setFacing] =
    useState('front');

  const [status, setStatus] =
    useState(
      isCaller
        ? 'Calling...'
        : 'Connecting...'
    );

  const [connected, setConnected] =
    useState(false);

  const [timer, setTimer] =
    useState(0);

  const [busy, setBusy] =
    useState(true);


  const peerRef =
    useRef(null);

  const callRef =
    useRef(null);

  const candidateCleanupRef =
    useRef([]);

  const mountedRef =
    useRef(true);

  const timerRef =
    useRef(null);

  const localStreamRef =
    useRef(null);

  const remoteStreamRef =
    useRef(null);


  /* =========================
     TIMER
  ========================= */

  useEffect(() => {
    if (!connected) {
      return undefined;
    }

    timerRef.current =
      setInterval(() => {
        setTimer((value) =>
          value + 1
        );
      }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(
          timerRef.current
        );
      }
    };
  }, [connected]);


  /* =========================
     START CALL
  ========================= */

  useEffect(() => {
    mountedRef.current = true;

    startCall();

    return () => {
      mountedRef.current = false;
      cleanupCall(false);
    };
  }, []);


  /* =========================
     CREATE MEDIA
  ========================= */

  const createLocalStream =
    async () => {
      const constraints = {
        audio: true,
        video:
          type === 'video'
            ? {
                facingMode:
                  'user',
                width: {
                  ideal: 640,
                },
                height: {
                  ideal: 480,
                },
                frameRate: {
                  ideal: 24,
                },
              }
            : false,
      };

      const stream =
        await mediaDevices.getUserMedia(
          constraints
        );

      localStreamRef.current =
        stream;

      if (mountedRef.current) {
        setLocalStream(stream);
      }

      return stream;
    };


  /* =========================
     PEER CONNECTION
  ========================= */

  const createPeer =
    (stream) => {
      const pc =
        new RTCPeerConnection(
          ICE_SERVERS
        );

      peerRef.current = pc;

      stream
        .getTracks()
        .forEach((track) => {
          pc.addTrack(
            track,
            stream
          );
        });

      pc.ontrack = (event) => {
        const stream =
          event.streams?.[0];

        if (!stream) {
          return;
        }

        remoteStreamRef.current =
          stream;

        if (mountedRef.current) {
          setRemoteStream(
            stream
          );
        }
      };

      pc.onicecandidate =
        async (event) => {
          if (
            !event.candidate ||
            !callRef.current
          ) {
            return;
          }

          try {
            const callId =
              callRef.current;

            const side =
              isCaller
                ? 'offerCandidates'
                : 'answerCandidates';

            await addDoc(
              collection(
                db,
                'calls',
                callId,
                side
              ),
              event.candidate.toJSON()
            );
          } catch (error) {
            console.log(
              'ICE candidate error:',
              error
            );
          }
        };

      pc.onconnectionstatechange =
        () => {
          const state =
            pc.connectionState;

          console.log(
            'WebRTC state:',
            state
          );

          if (
            state ===
              'connected'
          ) {
            if (
              mountedRef.current
            ) {
              setConnected(true);
              setBusy(false);
              setStatus(
                'Connected'
              );
            }
          }

          if (
            state ===
              'disconnected'
          ) {
            if (
              mountedRef.current
            ) {
              setStatus(
                'Connection lost'
              );
            }
          }

          if (
            state === 'failed'
          ) {
            if (
              mountedRef.current
            ) {
              setStatus(
                'Connection failed'
              );
              setBusy(false);
            }
          };
        };

      return pc;
    };


  /* =========================
     OUTGOING CALL
  ========================= */

  const startOutgoingCall =
    async () => {
      if (!friendId) {
        throw new Error(
          'Friend ID missing.'
        );
      }

      const callDoc =
        doc(
          collection(
            db,
            'calls'
          )
        );

      callRef.current =
        callDoc.id;

      const stream =
        await createLocalStream();

      const pc =
        createPeer(stream);

      await setDoc(
        callDoc,
        {
          callerId:
            currentUser.uid,

          receiverId:
            friendId,

          callerName:
            currentUser.displayName ||
            'Nax User',

          receiverName:
            name,

          type,

          status:
            'ringing',

          createdAt:
            serverTimestamp(),
        }
      );

      const offer =
        await pc.createOffer({
          offerToReceiveAudio:
            true,
          offerToReceiveVideo:
            type === 'video',
        });

      await pc.setLocalDescription(
        offer
      );

      await updateDoc(
        callDoc,
        {
          offer: {
            type:
              offer.type,
            sdp:
              offer.sdp,
          },
        }
      );

      listenForAnswer(
        callDoc.id,
        pc
      );

      listenForRemoteCandidates(
        callDoc.id,
        pc,
        'answerCandidates'
      );

      listenForCallStatus(
        callDoc.id
      );

      if (mountedRef.current) {
        setBusy(false);
        setStatus(
          'Ringing...'
        );
      }
    };


  /* =========================
     INCOMING CALL
  ========================= */

  const startIncomingCall =
    async () => {
      if (!incomingCallId) {
        throw new Error(
          'Call ID missing.'
        );
      }

      callRef.current =
        incomingCallId;

      const callDoc =
        doc(
          db,
          'calls',
          incomingCallId
        );

      const stream =
        await createLocalStream();

      const pc =
        createPeer(stream);

      listenForRemoteCandidates(
        incomingCallId,
        pc,
        'offerCandidates'
      );

      const unsubscribe =
        onSnapshot(
          callDoc,
          async (snapshot) => {
            const data =
              snapshot.data();

            if (!data) {
              return;
            }

            if (
              data.status ===
              'ended'
            ) {
              unsubscribe();

              if (
                mountedRef.current
              ) {
                setStatus(
                  'Call ended'
                );

                navigation.goBack();
              }

              return;
            }

            if (
              !data.offer ||
              data.answer
            ) {
              return;
            }

            try {
              await pc.setRemoteDescription(
                new RTCSessionDescription(
                  data.offer
                )
              );

              const answer =
                await pc.createAnswer({
                  offerToReceiveAudio:
                    true,
                  offerToReceiveVideo:
                    type === 'video',
                });

              await pc.setLocalDescription(
                answer
              );

              await updateDoc(
                callDoc,
                {
                  answer: {
                    type:
                      answer.type,
                    sdp:
                      answer.sdp,
                  },

                  status:
                    'connected',
                }
              );

              if (
                mountedRef.current
              ) {
                setBusy(false);
                setStatus(
                  'Connecting...'
                );
              }
            } catch (error) {
              console.log(
                'Incoming offer error:',
                error
              );
            }
          }
        );

      candidateCleanupRef.current.push(
        unsubscribe
      );

      if (mountedRef.current) {
        setBusy(false);
        setStatus(
          'Connecting...'
        );
      }
    };


  /* =========================
     START
  ========================= */

  const startCall =
    async () => {
      try {
        if (!currentUser?.uid) {
          throw new Error(
            'Login required.'
          );
        }

        if (isCaller) {
          await startOutgoingCall();
        } else {
          await startIncomingCall();
        }
      } catch (error) {
        console.log(
          'Call start error:',
          error
        );

        Alert.alert(
          'Call Error',
          error?.message ||
            'Call start nahi ho paayi.',
          [
            {
              text: 'OK',
              onPress: () =>
                navigation.goBack(),
            },
          ]
        );
      }
    };


  /* =========================
     ANSWER LISTENER
  ========================= */

  const listenForAnswer =
    (
      callId,
      pc
    ) => {
      const callDoc =
        doc(
          db,
          'calls',
          callId
        );

      const unsubscribe =
        onSnapshot(
          callDoc,
          async (snapshot) => {
            const data =
              snapshot.data();

            if (!data) {
              return;
            }

            if (
              data.status ===
              'rejected'
            ) {
              Alert.alert(
                'Call Rejected',
                `${name} ne call reject kar di.`
              );

              navigation.goBack();

              return;
            }

            if (
              data.status ===
              'ended'
            ) {
              navigation.goBack();
              return;
            }

            if (
              !data.answer
            ) {
              return;
            }

            if (
              pc.remoteDescription
            ) {
              return;
            }

            try {
              await pc.setRemoteDescription(
                new RTCSessionDescription(
                  data.answer
                )
              );

              if (
                mountedRef.current
              ) {
                setStatus(
                  'Connecting...'
                );
              }
            } catch (error) {
              console.log(
                'Set answer error:',
                error
              );
            }
          }
        );

      candidateCleanupRef.current.push(
        unsubscribe
      );
    };


  /* =========================
     REMOTE ICE
  ========================= */

  const listenForRemoteCandidates =
    (
      callId,
      pc,
      collectionName
    ) => {
      const candidatesRef =
        collection(
          db,
          'calls',
          callId,
          collectionName
        );

      const unsubscribe =
        onSnapshot(
          candidatesRef,
          (snapshot) => {
            snapshot.docChanges().forEach(
              async (change) => {
                if (
                  change.type !==
                  'added'
                ) {
                  return;
                }

                try {
                  await pc.addIceCandidate(
                    new RTCIceCandidate(
                      change.doc.data()
                    )
                  );
                } catch (error) {
                  console.log(
                    'Add ICE error:',
                    error
                  );
                }
              }
            );
          }
        );

      candidateCleanupRef.current.push(
        unsubscribe
      );
    };


  /* =========================
     CALL STATUS
  ========================= */

  const listenForCallStatus =
    (callId) => {
      const callDoc =
        doc(
          db,
          'calls',
          callId
        );

      const unsubscribe =
        onSnapshot(
          callDoc,
          (snapshot) => {
            const data =
              snapshot.data();

            if (!data) {
              return;
            }

            if (
              data.status ===
              'rejected'
            ) {
              Alert.alert(
                'Call Rejected',
                `${name} ne call reject kar di.`
              );

              navigation.goBack();
            }

            if (
              data.status ===
              'ended'
            ) {
              navigation.goBack();
            }
          }
        );

      candidateCleanupRef.current.push(
        unsubscribe
      );
    };


  /* =========================
     MUTE
  ========================= */

  const toggleMute =
    () => {
      const stream =
        localStreamRef.current;

      if (!stream) {
        return;
      }

      stream
        .getAudioTracks()
        .forEach((track) => {
          track.enabled =
            !track.enabled;
        });

      setIsMuted(
        (value) => !value
      );
    };


  /* =========================
     CAMERA
  ========================= */

  const toggleCamera =
    () => {
      if (type !== 'video') {
        return;
      }

      const stream =
        localStreamRef.current;

      if (!stream) {
        return;
      }

      stream
        .getVideoTracks()
        .forEach((track) => {
          track.enabled =
            !track.enabled;
        });

      setIsCameraOff(
        (value) => !value
      );
    };


  /* =========================
     SWITCH CAMERA
  ========================= */

  const switchCamera =
    () => {
      const stream =
        localStreamRef.current;

      if (!stream) {
        return;
      }

      const videoTrack =
        stream.getVideoTracks()[0];

      if (
        videoTrack &&
        typeof videoTrack._switchCamera ===
          'function'
      ) {
        videoTrack._switchCamera();

        setFacing(
          (value) =>
            value === 'front'
              ? 'back'
              : 'front'
        );
      }
    };


  /* =========================
     END CALL
  ========================= */

  const endCall =
    async () => {
      const callId =
        callRef.current;

      try {
        if (
          callId &&
          isCaller
        ) {
          await updateDoc(
            doc(
              db,
              'calls',
              callId
            ),
            {
              status: 'ended',
              endedAt:
                serverTimestamp(),
            }
          );
        } else if (callId) {
          await updateDoc(
            doc(
              db,
              'calls',
              callId
            ),
            {
              status: 'ended',
              endedAt:
                serverTimestamp(),
            }
          );
        }
      } catch (error) {
        console.log(
          'End call Firestore error:',
          error
        );
      }

      cleanupCall(true);
    };


  /* =========================
     CLEANUP
  ========================= */

  const cleanupCall =
    (goBack) => {
      candidateCleanupRef.current.forEach(
        (unsubscribe) => {
          try {
            unsubscribe();
          } catch {}
        }
      );

      candidateCleanupRef.current =
        [];

      if (timerRef.current) {
        clearInterval(
          timerRef.current
        );
      }

      const stream =
        localStreamRef.current;

      if (stream) {
        stream
          .getTracks()
          .forEach((track) => {
            try {
              track.stop();
            } catch {}
          });
      }

      localStreamRef.current =
        null;

      const pc =
        peerRef.current;

      if (pc) {
        try {
          pc.close();
        } catch {}
      }

      peerRef.current =
        null;

      if (goBack) {
        navigation.goBack();
      }
    };


  /* =========================
     FORMAT TIME
  ========================= */

  const formatTime =
    (value) => {
      const minutes =
        Math.floor(
          value / 60
        )
          .toString()
          .padStart(2, '0');

      const seconds =
        (value % 60)
          .toString()
          .padStart(2, '0');

      return `${minutes}:${seconds}`;
    };


  /* =========================
     LOADING
  ========================= */

  if (busy && !localStream) {
    return (
      <View
        style={
          styles.loadingScreen
        }
      >
        <ActivityIndicator
          size="large"
          color="#1687FF"
        />

        <Text
          style={
            styles.loadingTitle
          }
        >
          {isCaller
            ? `Calling ${name}...`
            : `Connecting with ${name}...`}
        </Text>

        <Text
          style={
            styles.loadingSub
          }
        >
          {type === 'video'
            ? 'Video call'
            : 'Voice call'}
        </Text>
      </View>
    );
  }


  /* =========================
     VIDEO
  ========================= */

  if (type === 'video') {
    return (
      <View
        style={
          styles.videoContainer
        }
      >

        {remoteStream ? (
          <RTCView
            streamURL={
              remoteStream.toURL()
            }
            style={
              styles.remoteVideo
            }
            objectFit="cover"
            mirror={false}
          />
        ) : (
          <View
            style={
              styles.waitingVideo
            }
          >
            <Ionicons
              name="videocam"
              size={55}
              color="#5E7485"
            />

            <Text
              style={
                styles.waitingName
              }
            >
              {name}
            </Text>

            <Text
              style={
                styles.waitingStatus
              }
            >
              {status}
            </Text>
          </View>
        )}


        {localStream &&
          !isCameraOff && (
            <RTCView
              streamURL={
                localStream.toURL()
              }
              style={
                styles.localVideo
              }
              objectFit="cover"
              mirror={
                facing === 'front'
              }
            />
          )}


        <SafeAreaView
          style={
            styles.videoOverlay
          }
        >

          <View
            style={
              styles.topBar
            }
          >
            <TouchableOpacity
              style={
                styles.topButton
              }
              onPress={
                endCall
              }
            >
              <Ionicons
                name="chevron-down"
                size={28}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <View
              style={
                styles.statusPill
              }
            >
              <View
                style={
                  styles.statusDot
                }
              />

              <Text
                style={
                  styles.statusText
                }
              >
                {connected
                  ? formatTime(
                      timer
                    )
                  : status}
              </Text>
            </View>

            <View
              style={
                styles.topButton
              }
            />
          </View>


          <View
            style={
              styles.videoControls
            }
          >

            <TouchableOpacity
              style={
                styles.controlButton
              }
              onPress={
                toggleCamera
              }
            >
              <Ionicons
                name={
                  isCameraOff
                    ? 'videocam-off'
                    : 'videocam'
                }
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={
                styles.controlButton
              }
              onPress={
                switchCamera
              }
            >
              <Ionicons
                name="camera-reverse"
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.controlButton,
                isMuted &&
                  styles.activeControl,
              ]}
              onPress={
                toggleMute
              }
            >
              <Ionicons
                name={
                  isMuted
                    ? 'mic-off'
                    : 'mic'
                }
                size={24}
                color={
                  isMuted
                    ? '#111111'
                    : '#FFFFFF'
                }
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={
                styles.endButton
              }
              onPress={
                endCall
              }
            >
              <Ionicons
                name="call"
                size={27}
                color="#FFFFFF"
                style={{
                  transform: [
                    {
                      rotate:
                        '135deg',
                    },
                  ],
                }}
              />
            </TouchableOpacity>

          </View>
        </SafeAreaView>
      </View>
    );
  }


  /* =========================
     VOICE
  ========================= */

  return (
    <SafeAreaView
      style={
        styles.voiceContainer
      }
    >

      <View
        style={
          styles.voiceTop
        }
      >
        <TouchableOpacity
          style={
            styles.topButton
          }
          onPress={
            endCall
          }
        >
          <Ionicons
            name="chevron-down"
            size={28}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <View
          style={
            styles.statusPill
          }
        >
          <View
            style={
              styles.statusDot
            }
          />

          <Text
            style={
              styles.statusText
            }
          >
            {connected
              ? formatTime(timer)
              : status}
          </Text>
        </View>

        <View
          style={
            styles.topButton
          }
        />
      </View>


      <View
        style={
          styles.voiceCenter
        }
      >
        <View
          style={
            styles.voiceAvatar
          }
        >
          <Text
            style={
              styles.avatarLetter
            }
          >
            {name
              .charAt(0)
              .toUpperCase()}
          </Text>
        </View>

        <Text
          style={
            styles.voiceName
          }
        >
          {name}
        </Text>

        <Text
          style={
            styles.voiceStatus
          }
        >
          {connected
            ? formatTime(timer)
            : status}
        </Text>
      </View>


      <View
        style={
          styles.voiceControls
        }
      >

        <TouchableOpacity
          style={
            styles.controlButton
          }
          onPress={
            toggleMute
          }
        >
          <Ionicons
            name={
              isMuted
                ? 'mic-off'
                : 'mic'
            }
            size={25}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={
            styles.controlButton
          }
        >
          <Ionicons
            name="volume-high"
            size={25}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={
            styles.endButton
          }
          onPress={
            endCall
          }
        >
          <Ionicons
            name="call"
            size={27}
            color="#FFFFFF"
            style={{
              transform: [
                {
                  rotate:
                    '135deg',
                },
              ],
            }}
          />
        </TouchableOpacity>

      </View>

    </SafeAreaView>
  );
}


const styles =
  StyleSheet.create({

  loadingScreen: {
    flex: 1,
    backgroundColor: '#050A10',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },

  loadingTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    marginTop: 18,
    textAlign: 'center',
  },

  loadingSub: {
    color: '#8FA6B9',
    fontSize: 14,
    marginTop: 7,
  },

  videoContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },

  remoteVideo: {
    ...StyleSheet.absoluteFillObject,
  },

  waitingVideo: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#07111A',
  },

  waitingName: {
    color: '#FFFFFF',
    fontSize: 25,
    fontWeight: '800',
    marginTop: 15,
  },

  waitingStatus: {
    color: '#8FA6B9',
    fontSize: 14,
    marginTop: 6,
  },

  localVideo: {
    position: 'absolute',
    width: 110,
    height: 155,
    top: 58,
    right: 15,
    borderRadius: 16,
    overflow: 'hidden',
  },

  videoOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    paddingHorizontal: 15,
    paddingTop: 8,
  },

  topButton: {
    width: 45,
    height: 45,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor:
      'rgba(0,0,0,0.48)',
  },

  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor:
      '#34C759',
    marginRight: 7,
  },

  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },

  videoControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'center',
    gap: 14,
    paddingBottom: 25,
  },

  controlButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      'rgba(255,255,255,0.18)',
  },

  activeControl: {
    backgroundColor: '#FFFFFF',
  },

  endButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      '#FF3B30',
  },

  voiceContainer: {
    flex: 1,
    backgroundColor: '#050A10',
  },

  voiceTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    paddingHorizontal: 15,
    paddingTop: 10,
  },

  voiceCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  voiceAvatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor:
      '#1687FF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  avatarLetter: {
    color: '#FFFFFF',
    fontSize: 62,
    fontWeight: '800',
  },

  voiceName: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 25,
  },

  voiceStatus: {
    color: '#8FA6B9',
    fontSize: 15,
    marginTop: 8,
  },

  voiceControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'center',
    gap: 18,
    paddingBottom: 35,
  },

});
