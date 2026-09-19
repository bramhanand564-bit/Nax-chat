import { GoogleSignin } from '@react-native-google-signin/google-signin';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';

// 1. Google से Access Token लेना (with Explicit Scope Request)
export const getGoogleDriveToken = async () => {
  try {
    // 🔥 STEP 1: Explicitly request Drive scope BEFORE getting the token
    try {
      await GoogleSignin.addScopes({ scopes: [DRIVE_SCOPE] });
    } catch (scopeError) {
      console.log("Scope add notice:", scopeError);
    }

    // 🔥 STEP 2: Get token after ensuring scope is added
    const tokens = await GoogleSignin.getTokens();
    
    if (!tokens || !tokens.accessToken) {
      throw new Error("Access Token is null. Please re-login.");
    }
    
    return tokens.accessToken;
  } catch (error) {
    console.error("Token Error:", error);
    throw new Error(`Token Auth Error: ${error.message}`);
  }
};

// 2. Drive में बैकअप फाइल अपलोड करना (App Data Folder)
export const uploadBackupToDrive = async (backupData, includeMedia = false) => {
  try {
    const accessToken = await getGoogleDriveToken();
    
    const fileContent = JSON.stringify(backupData);
    const metadata = {
      name: 'nax_chat_backup.json',
      parents: ['appDataFolder'], 
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', new Blob([fileContent], { type: 'application/json' }));

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form,
    });

    // 🔥 STEP 3: Check actual HTTP response from Google Drive
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData?.error?.message || response.statusText || 'Unknown Drive API Error';
      throw new Error(`HTTP ${response.status}: ${errorMessage}`);
    }

    const result = await response.json();
    console.log("Backup Successful! Drive File ID:", result.id);
    return result;

  } catch (error) {
    console.error("Backup Upload Failed:", error);
    throw error; // UI को असली एरर भेजेंगे
  }
};

// 3. चेक करना कि Drive में बैकअप है या नहीं
export const checkExistingBackup = async () => {
  try {
    const accessToken = await getGoogleDriveToken();
    const response = await fetch(
      'https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name="nax_chat_backup.json"', 
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    
    if (!response.ok) return null;

    const data = await response.json();
    if (data.files && data.files.length > 0) return data.files[0]; 
    
    return null; 
  } catch (error) {
    console.error("Check Backup Error:", error);
    return null;
  }
};

// 4. बैकअप फाइल को Drive से डाउनलोड (Restore) करना
export const downloadBackupFromDrive = async (fileId) => {
  try {
    const accessToken = await getGoogleDriveToken();
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, 
      {
        method: 'GET',
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`HTTP ${response.status}: ${errorData?.error?.message || 'Download Failed'}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Restore Failed:", error);
    throw error;
  }
};
