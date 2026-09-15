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

  const info = await FileSystem.getInfoAsync(fileUri);
  if (!info.exists) throw new Error('Selected file was not found.');

  return new Promise((resolve, reject) => {
    
    // 🚀 EXPO NATIVE UPLOADER (No XMLHttpRequest!)
    // Ye file ko direct hardware se utha kar upload karta hai (100% Safe & Fast)
    const uploadTask = FileSystem.createUploadTask(
      UPLOAD_URL,
      fileUri,
      {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        mimeType: mimeType || 'application/octet-stream',
        parameters: {
          upload_preset: UPLOAD_PRESET,
          return_delete_token: 'true',
        },
      },
      (event) => {
        // 📊 REAL-TIME PROGRESS BAR TRACKING
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
            secureUrl: data.secure_url, // 🌍 Real Working URL (No Black Box)
            publicId: data.public_id || null,
            resourceType: data.resource_type || null,
            format: data.format || null,
            bytes: data.bytes || info.size || null,
            originalFilename: data.original_filename || fileName || null,
            deleteToken: data.delete_token || null,
            createdAt: data.created_at || null
          });
        } else {
          reject(new Error('Upload failed with status: ' + response.status));
        }
      })
      .catch((error) => {
        console.log("Expo Upload Error:", error);
        reject(new Error('Network error during upload.'));
      });
  });
}

// Delete logic ke liye fetch theek hai kyunki isme file read nahi karni hoti
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
