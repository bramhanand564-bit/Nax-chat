// utils/googleDriveBackup.js
import { GoogleSignin } from '@react-native-google-signin/google-signin';

// 1. Google से Access Token लेना
export const getGoogleDriveToken = async () => {
  try {
    const tokens = await GoogleSignin.getTokens();
    return tokens.accessToken;
  } catch (error) {
    console.error("Token Error:", error);
    throw new Error("Google Drive Token नहीं मिला। कृपया दोबारा लॉगिन करें।");
  }
};

// 2. Drive में बैकअप फाइल अपलोड करना (App Data Folder)
export const uploadBackupToDrive = async (backupData, includeMedia = false) => {
  try {
    const accessToken = await getGoogleDriveToken();
    
    // अगर includeMedia True है, तो यहाँ मीडिया फाइल्स अपलोड करने का लॉजिक आएगा 
    // (Cloudinary URL से डाउनलोड करके Drive में डालना)

    const fileContent = JSON.stringify(backupData);
    const metadata = {
      name: 'nax_chat_backup.json',
      parents: ['appDataFolder'], // यह फोल्डर यूज़र को Drive में नहीं दिखेगा, सिर्फ ऐप एक्सेस कर सकती है
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([fileContent], { type: 'application/json' }));

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: form,
    });

    const result = await response.json();
    console.log("Backup Successful! Drive File ID:", result.id);
    return result;

  } catch (error) {
    console.error("Backup Failed:", error);
    throw error;
  }
};
