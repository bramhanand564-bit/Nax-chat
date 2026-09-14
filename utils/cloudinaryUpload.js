import * as FileSystem from 'expo-file-system';

const CLOUD_NAME = 'gjndjchf';

const UPLOAD_PRESET = 'nax_chat_upload';

const UPLOAD_URL =
  `https://api.cloudinary.com/v1_1/` +
  `${CLOUD_NAME}/auto/upload`;

const DELETE_URL =
  `https://api.cloudinary.com/v1_1/` +
  `${CLOUD_NAME}/delete_by_token`;

export async function uploadToCloudinary({
  fileUri,
  fileName,
  mimeType,
  onProgress
}) {
  if (!fileUri) {
    throw new Error(
      'File URI is required.'
    );
  }

  const info =
    await FileSystem.getInfoAsync(
      fileUri
    );

  if (!info.exists) {
    throw new Error(
      'Selected file was not found.'
    );
  }

  const formData =
    new FormData();

  formData.append(
    'file',
    {
      uri: fileUri,
      name:
        fileName ||
        `nax-${Date.now()}`,
      type:
        mimeType ||
        'application/octet-stream'
    }
  );

  formData.append(
    'upload_preset',
    UPLOAD_PRESET
  );

  /*
   * Cloudinary can return a short-lived
   * delete token for client-side cleanup.
   */
  formData.append(
    'return_delete_token',
    'true'
  );

  if (onProgress) {
    onProgress(0);
  }

  const response =
    await fetch(
      UPLOAD_URL,
      {
        method: 'POST',
        body: formData
      }
    );

  const text =
    await response.text();

  let data = null;

  try {
    data = JSON.parse(text);
  } catch (error) {
    throw new Error(
      'Cloudinary returned an invalid response.'
    );
  }

  if (!response.ok) {
    throw new Error(
      data?.error?.message ||
        'Cloudinary upload failed.'
    );
  }

  if (!data?.secure_url) {
    throw new Error(
      'Cloudinary did not return a file URL.'
    );
  }

  if (onProgress) {
    onProgress(1);
  }

  return {
    url: data.secure_url,
    secureUrl: data.secure_url,

    publicId:
      data.public_id || null,

    resourceType:
      data.resource_type || null,

    format:
      data.format || null,

    bytes:
      data.bytes || info.size || null,

    originalFilename:
      data.original_filename ||
      fileName ||
      null,

    deleteToken:
      data.delete_token || null,

    createdAt:
      data.created_at || null
  };
}

export async function deleteCloudinaryByToken(
  deleteToken
) {
  if (!deleteToken) {
    return {
      success: false,
      reason: 'No delete token.'
    };
  }

  try {
    const formData =
      new FormData();

    formData.append(
      'token',
      deleteToken
    );

    const response =
      await fetch(
        DELETE_URL,
        {
          method: 'POST',
          body: formData
        }
      );

    const text =
      await response.text();

    let data = {};

    try {
      data = JSON.parse(text);
    } catch (error) {
      data = {};
    }

    if (!response.ok) {
      return {
        success: false,
        reason:
          data?.error?.message ||
          'Delete request failed.'
      };
    }

    return {
      success: true,
      data
    };
  } catch (error) {
    return {
      success: false,
      reason:
        error?.message ||
        'Delete request failed.'
    };
  }
}

export function isCloudinaryFileUrl(
  url
) {
  if (!url) {
    return false;
  }

  return (
    url.includes(
      'res.cloudinary.com/'
    ) &&
    url.includes(
      '/upload/'
    )
  );
}
