// ==========================================
// FILE: utils/cloudinaryUpload.js
// ==========================================
import * as FileSystem from 'expo-file-system';

const CLOUD_NAME = 'gjndjchf';
const UPLOAD_PRESET = 'nax_chat_upload';

const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/auto/upload`;
const DELETE_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/delete_by_token`;

export async function uploadToCloudinary({ fileUri, fileName, mimeType, onProgress }) {
  if (!fileUri) throw new Error('File URI is required.');

  // 🚀 FIX 1: URI Normalizer (Ensure 'file://' prefix is present)
  let finalUri = fileUri;
  if (!finalUri.startsWith('file://') && !finalUri.startsWith('content://') && !finalUri.startsWith('http')) {
    finalUri = 'file://' + finalUri;
  }

  const info = await FileSystem.getInfoAsync(finalUri);
  if (!info.exists) throw new Error('Selected file was not found.');

  // 🚀 FIX 2: Smart MIME Type Detector (Fixes the 400 Bad Request)
  // Hum old mimeType (like video/quicktime) ko ignore karke new compressed file ka real type bhejenge
  let safeMimeType = mimeType || 'application/octet-stream';
  const lowerUri = finalUri.toLowerCase();
  
  if (lowerUri.endsWith('.jpg') || lowerUri.endsWith('.jpeg')) {
    safeMimeType = 'image/jpeg';
  } else if (lowerUri.endsWith('.png')) {
    safeMimeType = 'image/png';
  } else if (lowerUri.endsWith('.mp4')) {
    safeMimeType = 'video/mp4';
  } else if (lowerUri.endsWith('.mov')) {
    safeMimeType = 'video/quicktime';
  }

  return new Promise((resolve, reject) => {
    
    // 🚀 EXPO NATIVE UPLOADER
    const uploadTask = FileSystem.createUploadTask(
      UPLOAD_URL,
      finalUri,
      {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        mimeType: safeMimeType, // 👈 Passing the corrected MIME type here!
        parameters: {
          upload_preset: UPLOAD_PRESET,
          return_delete_token: 'true',
        },
      },
      (event) => {
        if (onProgress && event.totalBytesExpectedToSend > 0) {
          const progress = Math.round((event.totalBytesSent / event.totalBytesExpectedToSend) * 100);
          onProgress(progress);
        }
      }
    );

    // Upload Start
    uploadTask.uploadAsync()
      .then((response) => {
        if (response.status === 200 || response.status === 201) {
          const data = JSON.parse(response.body);
          
          if (!data.secure_url) {
            reject(new Error('Cloudinary did not return a valid URL.'));
            return;
          }

          resolve({
            url: data.secure_url,
            secureUrl: data.secure_url, 
            publicId: data.public_id || null,
            resourceType: data.resource_type || null,
            format: data.format || null,
            bytes: data.bytes || info.size || null,
            originalFilename: data.original_filename || fileName || null,
            deleteToken: data.delete_token || null,
            createdAt: data.created_at || null
          });
        } else {
          // 🚀 Detailed Error Parsing (Taaki agar fail ho to exact Cloudinary ka message dikhe)
          let errorMessage = 'Upload failed with status: ' + response.status;
          try {
            const errorData = JSON.parse(response.body);
            if (errorData.error && errorData.error.message) {
              errorMessage = errorData.error.message;
            }
          } catch (e) {}
          reject(new Error(errorMessage));
        }
      })
      .catch((error) => {
        console.log("Expo Upload Error:", error);
        reject(new Error('Network error during upload.'));
      });
  });
}

// Delete logic
export async function deleteCloudinaryByToken(deleteToken) {
  if (!deleteToken) return { success: false, reason: 'No delete token.' };

  try {
    const formData = new FormData();
    formData.append('token', deleteToken);

    const response = await fetch(DELETE_URL, { method: 'POST', body: formData });
    const text = await response.text();
    let data = {};
    try { data = JSON.parse(text); } catch (error) { data = {}; }

    if (!response.ok) return { success: false, reason: data?.error?.message || 'Delete request failed.' };
    return { success: true, data };
  } catch (error) {
    return { success: false, reason: error?.message || 'Delete request failed.' };
  }
}

export function isCloudinaryFileUrl(url) {
  if (!url) return false;
  return url.includes('res.cloudinary.com/') && url.includes('/upload/');
}
