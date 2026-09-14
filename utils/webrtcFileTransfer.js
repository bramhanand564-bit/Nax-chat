import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc
} from 'firebase/firestore';

import { db } from '../firebaseConfig';
import {
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate
} from 'react-native-webrtc';

import * as FileSystem from 'expo-file-system/legacy';

const ICE_SERVERS = [
  {
    urls: 'stun:stun.l.google.com:19302'
  },
  {
    urls: 'stun:stun1.l.google.com:19302'
  }
];

const CHUNK_SIZE = 12 * 1024;
const MAX_P2P_FILE_SIZE = 15 * 1024 * 1024;

function getTransferRef(transferId) {
  return doc(db, 'file_transfers', transferId);
}

function getOfferCandidatesRef(transferId) {
  return collection(
    db,
    'file_transfers',
    transferId,
    'offerCandidates'
  );
}

function getAnswerCandidatesRef(transferId) {
  return collection(
    db,
    'file_transfers',
    transferId,
    'answerCandidates'
  );
}

export function canUseP2PFileTransfer(fileSize) {
  if (!Number.isFinite(fileSize)) {
    return false;
  }

  return fileSize > 0 && fileSize <= MAX_P2P_FILE_SIZE;
}

export function getP2PFileTransferLimit() {
  return MAX_P2P_FILE_SIZE;
}

function base64ToBytes(base64) {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

  let bufferLength = base64.length * 0.75;
  let len = base64.length;

  if (base64.endsWith('==')) {
    bufferLength -= 2;
  } else if (base64.endsWith('=')) {
    bufferLength -= 1;
  }

  const bytes = new Uint8Array(Math.floor(bufferLength));

  let p = 0;

  for (let i = 0; i < len; i += 4) {
    const encoded1 = chars.indexOf(base64[i]);
    const encoded2 = chars.indexOf(base64[i + 1]);
    const encoded3 = chars.indexOf(base64[i + 2]);
    const encoded4 = chars.indexOf(base64[i + 3]);

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);

    if (p < bytes.length && encoded3 !== -1) {
      bytes[p++] =
        ((encoded2 & 15) << 4) |
        (encoded3 >> 2);
    }

    if (p < bytes.length && encoded4 !== -1) {
      bytes[p++] =
        ((encoded3 & 3) << 6) |
        encoded4;
    }
  }

  return bytes;
}

function createPeerConnection() {
  return new RTCPeerConnection({
    iceServers: ICE_SERVERS
  });
}

export async function createP2PTransfer({
  senderId,
  receiverId,
  chatId,
  fileName,
  mimeType,
  fileSize
}) {
  if (!senderId || !receiverId) {
    throw new Error('Sender and receiver are required.');
  }

  if (!chatId) {
    throw new Error('Chat ID is required.');
  }

  if (!fileName) {
    throw new Error('File name is required.');
  }

  if (!canUseP2PFileTransfer(fileSize)) {
    throw new Error(
      'File is too large for P2P transfer.'
    );
  }

  const transferRef = await addDoc(
    collection(db, 'file_transfers'),
    {
      senderId,
      receiverId,
      chatId,
      fileName,
      mimeType: mimeType || 'application/octet-stream',
      fileSize,
      status: 'offering',
      createdAt: serverTimestamp()
    }
  );

  const transferId = transferRef.id;

  const peerConnection = createPeerConnection();

  const dataChannel =
    peerConnection.createDataChannel(
      'file',
      {
        ordered: true
      }
    );

  let offerCandidatesStopped = false;

  peerConnection.onicecandidate = async (event) => {
    if (
      !event.candidate ||
      offerCandidatesStopped
    ) {
      return;
    }

    try {
      await addDoc(
        getOfferCandidatesRef(transferId),
        event.candidate.toJSON()
      );
    } catch (error) {
      console.log(
        'P2P offer candidate error:',
        error
      );
    }
  };

  dataChannel.onopen = () => {
    console.log(
      'P2P file DataChannel connected:',
      transferId
    );
  };

  dataChannel.onerror = (error) => {
    console.log(
      'P2P DataChannel error:',
      error
    );
  };

  dataChannel.onclose = () => {
    console.log(
      'P2P DataChannel closed:',
      transferId
    );
  };

  const offer = await peerConnection.createOffer();

  await peerConnection.setLocalDescription(
    offer
  );

  await updateDoc(
    transferRef,
    {
      offer: {
        type: offer.type,
        sdp: offer.sdp
      },
      status: 'waiting_for_answer'
    }
  );

  const unsubscribeAnswer = onSnapshot(
    transferRef,
    async (snapshot) => {
      const data = snapshot.data();

      if (!data || !data.answer) {
        return;
      }

      if (
        peerConnection.currentRemoteDescription
      ) {
        return;
      }

      try {
        const answer =
          new RTCSessionDescription({
            type: data.answer.type,
            sdp: data.answer.sdp
          });

        await peerConnection.setRemoteDescription(
          answer
        );

        await updateDoc(
          transferRef,
          {
            status: 'connected'
          }
        );
      } catch (error) {
        console.log(
          'P2P answer error:',
          error
        );
      }
    }
  );

  const unsubscribeCandidates = onSnapshot(
    getAnswerCandidatesRef(transferId),
    async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type !== 'added') {
          continue;
        }

        try {
          const candidate =
            new RTCIceCandidate(
              change.doc.data()
            );

          await peerConnection.addIceCandidate(
            candidate
          );
        } catch (error) {
          console.log(
            'P2P answer candidate error:',
            error
          );
        }
      }
    }
  );

  return {
    transferId,
    peerConnection,
    dataChannel,
    cleanup: () => {
      offerCandidatesStopped = true;

      unsubscribeAnswer();
      unsubscribeCandidates();

      try {
        dataChannel.close();
      } catch (error) {
        console.log(error);
      }

      try {
        peerConnection.close();
      } catch (error) {
        console.log(error);
      }
    }
  };
}

export async function acceptP2PTransfer({
  transferId,
  receiverId
}) {
  if (!transferId) {
    throw new Error('Transfer ID is required.');
  }

  if (!receiverId) {
    throw new Error('Receiver ID is required.');
  }

  const transferRef =
    getTransferRef(transferId);

  const snapshot =
    await new Promise((resolve, reject) => {
      const unsubscribe = onSnapshot(
        transferRef,
        (value) => {
          unsubscribe();
          resolve(value);
        },
        (error) => {
          unsubscribe();
          reject(error);
        }
      );
    });

  const transfer = snapshot.data();

  if (!transfer) {
    throw new Error(
      'File transfer was not found.'
    );
  }

  if (transfer.receiverId !== receiverId) {
    throw new Error(
      'This transfer is not assigned to this user.'
    );
  }

  if (!transfer.offer) {
    throw new Error(
      'P2P offer is not available yet.'
    );
  }

  const peerConnection =
    createPeerConnection();

  let answerCandidatesStopped = false;

  peerConnection.onicecandidate = async (
    event
  ) => {
    if (
      !event.candidate ||
      answerCandidatesStopped
    ) {
      return;
    }

    try {
      await addDoc(
        getAnswerCandidatesRef(transferId),
        event.candidate.toJSON()
      );
    } catch (error) {
      console.log(
        'P2P answer candidate error:',
        error
      );
    }
  };

  let incomingDataChannel = null;

  const dataChannelPromise =
    new Promise((resolve) => {
      peerConnection.ondatachannel = (event) => {
        incomingDataChannel =
          event.channel;

        resolve(event.channel);
      };
    });

  const offer =
    new RTCSessionDescription({
      type: transfer.offer.type,
      sdp: transfer.offer.sdp
    });

  await peerConnection.setRemoteDescription(
    offer
  );

  const answer =
    await peerConnection.createAnswer();

  await peerConnection.setLocalDescription(
    answer
  );

  await updateDoc(
    transferRef,
    {
      answer: {
        type: answer.type,
        sdp: answer.sdp
      },
      status: 'answer_sent'
    }
  );

  const unsubscribeCandidates = onSnapshot(
    getOfferCandidatesRef(transferId),
    async (snapshot) => {
      for (const change of snapshot.docChanges()) {
        if (change.type !== 'added') {
          continue;
        }

        try {
          const candidate =
            new RTCIceCandidate(
              change.doc.data()
            );

          await peerConnection.addIceCandidate(
            candidate
          );
        } catch (error) {
          console.log(
            'P2P offer candidate error:',
            error
          );
        }
      }
    }
  );

  const dataChannel =
    await dataChannelPromise;

  return {
    transferId,
    peerConnection,
    dataChannel,
    cleanup: () => {
      answerCandidatesStopped = true;

      unsubscribeCandidates();

      try {
        dataChannel.close();
      } catch (error) {
        console.log(error);
      }

      try {
        peerConnection.close();
      } catch (error) {
        console.log(error);
      }
    }
  };
}

export async function sendFileOverDataChannel({
  dataChannel,
  fileUri,
  fileName,
  mimeType,
  fileSize,
  onProgress
}) {
  if (!dataChannel) {
    throw new Error(
      'DataChannel is required.'
    );
  }

  if (!fileUri) {
    throw new Error('File URI is required.');
  }

  if (!canUseP2PFileTransfer(fileSize)) {
    throw new Error(
      'File is too large for P2P transfer.'
    );
  }

  const base64 =
    await FileSystem.readAsStringAsync(
      fileUri,
      {
        encoding:
          FileSystem.EncodingType.Base64
      }
    );

  const totalBytes = base64ToBytes(base64);
  const totalSize = totalBytes.length;

  const header = JSON.stringify({
    type: 'file-start',
    fileName,
    mimeType:
      mimeType || 'application/octet-stream',
    fileSize: fileSize || totalSize
  });

  dataChannel.send(header);

  let offset = 0;

  while (offset < totalSize) {
    const end = Math.min(
      offset + CHUNK_SIZE,
      totalSize
    );

    const chunk =
      totalBytes.slice(offset, end);

    let binary = '';

    for (let i = 0; i < chunk.length; i++) {
      binary += String.fromCharCode(
        chunk[i]
      );
    }

    let encoded = '';

    if (typeof btoa === 'function') {
      encoded = btoa(binary);
    } else {
      throw new Error(
        'Base64 encoder is not available.'
      );
    }

    dataChannel.send(
      JSON.stringify({
        type: 'file-chunk',
        data: encoded
      })
    );

    offset = end;

    if (onProgress) {
      onProgress(
        Math.min(
          offset / totalSize,
          1
        )
      );
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }

  dataChannel.send(
    JSON.stringify({
      type: 'file-end'
    })
  );

  return {
    fileName,
    mimeType:
      mimeType || 'application/octet-stream',
    fileSize: fileSize || totalSize
  };
}

export function attachFileReceiver({
  dataChannel,
  onStart,
  onProgress,
  onComplete,
  onError
}) {
  if (!dataChannel) {
    throw new Error(
      'DataChannel is required.'
    );
  }

  const chunks = [];

  let fileInfo = null;
  let receivedBytes = 0;

  const handleMessage = (event) => {
    try {
      const packet =
        typeof event.data === 'string'
          ? JSON.parse(event.data)
          : null;

      if (!packet) {
        return;
      }

      if (packet.type === 'file-start') {
        fileInfo = {
          fileName: packet.fileName,
          mimeType: packet.mimeType,
          fileSize: packet.fileSize
        };

        receivedBytes = 0;
        chunks.length = 0;

        if (onStart) {
          onStart(fileInfo);
        }

        return;
      }

      if (packet.type === 'file-chunk') {
        if (!fileInfo) {
          throw new Error(
            'Received file chunk before file start.'
          );
        }

        chunks.push(packet.data);

        const chunkBytes =
          base64ToBytes(packet.data).length;

        receivedBytes += chunkBytes;

        if (onProgress) {
          onProgress(
            Math.min(
              receivedBytes /
                Math.max(
                  fileInfo.fileSize,
                  1
                ),
              1
            )
          );
        }

        return;
      }

      if (packet.type === 'file-end') {
        if (!fileInfo) {
          throw new Error(
            'Received file end without file.'
          );
        }

        const combinedBase64 =
          chunks.join('');

        const result = {
          ...fileInfo,
          base64: combinedBase64
        };

        if (onComplete) {
          onComplete(result);
        }

        return;
      }
    } catch (error) {
      console.log(
        'P2P receiver error:',
        error
      );

      if (onError) {
        onError(error);
      }
    }
  };

  dataChannel.addEventListener(
    'message',
    handleMessage
  );

  return () => {
    try {
      dataChannel.removeEventListener(
        'message',
        handleMessage
      );
    } catch (error) {
      console.log(error);
    }
  };
}

export async function saveReceivedFile({
  base64,
  fileName
}) {
  if (!base64) {
    throw new Error(
      'Received file data is empty.'
    );
  }

  const safeName =
    String(fileName || 'received-file')
      .replace(/[^a-zA-Z0-9._-]/g, '_');

  const directory =
    FileSystem.cacheDirectory ||
    FileSystem.documentDirectory;

  if (!directory) {
    throw new Error(
      'No writable file directory is available.'
    );
  }

  const fileUri =
    `${directory}${Date.now()}-${safeName}`;

  await FileSystem.writeAsStringAsync(
    fileUri,
    base64,
    {
      encoding:
        FileSystem.EncodingType.Base64
    }
  );

  return fileUri;
}

export async function markP2PTransferFailed(
  transferId,
  reason
) {
  if (!transferId) {
    return;
  }

  try {
    await updateDoc(
      getTransferRef(transferId),
      {
        status: 'failed',
        failureReason:
          reason || 'P2P transfer failed',
        failedAt: serverTimestamp()
      }
    );
  } catch (error) {
    console.log(
      'Failed to update P2P status:',
      error
    );
  }
}

export async function markP2PTransferCompleted(
  transferId
) {
  if (!transferId) {
    return;
  }

  try {
    await updateDoc(
      getTransferRef(transferId),
      {
        status: 'completed',
        completedAt: serverTimestamp()
      }
    );
  } catch (error) {
    console.log(
      'Failed to update P2P completion:',
      error
    );
  }
}
