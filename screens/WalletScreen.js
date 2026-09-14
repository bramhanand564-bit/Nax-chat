import React, {
  useEffect,
  useState
} from 'react';

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert
} from 'react-native';

import {
  Ionicons
} from '@expo/vector-icons';

import {
  useTheme
} from '../context/ThemeContext';

import {
  auth,
  db
} from '../firebaseConfig';

import {
  signOut,
  updateProfile
} from 'firebase/auth';

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';

export default function WalletScreen() {
  const {
    isDark,
    themeMode,
    changeTheme
  } = useTheme();

  const user = auth.currentUser;

  const [isEditing, setIsEditing] =
    useState(false);

  const [newName, setNewName] =
    useState(
      user?.displayName || ''
    );

  const [username, setUsername] =
    useState('');

  const [newUsername, setNewUsername] =
    useState('');

  const [usernameStatus, setUsernameStatus] =
    useState('');

  const [loading, setLoading] =
    useState(false);

  const [checkingUsername, setCheckingUsername] =
    useState(false);

  const [editingUsername, setEditingUsername] =
    useState(false);

  const bg =
    isDark
      ? '#121212'
      : '#F5F5F7';

  const textMain =
    isDark
      ? '#FFFFFF'
      : '#000000';

  const textSub =
    isDark
      ? '#888888'
      : '#666666';

  const cardBg =
    isDark
      ? '#1E1E1E'
      : '#FFFFFF';

  const borderCol =
    isDark
      ? 'rgba(255,255,255,0.05)'
      : 'rgba(0,0,0,0.05)';

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    if (!user?.uid) {
      return;
    }

    try {
      const userRef =
        doc(
          db,
          'users',
          user.uid
        );

      const snapshot =
        await getDoc(userRef);

      if (snapshot.exists()) {
        const data =
          snapshot.data();

        const savedUsername =
          data.username || '';

        setUsername(
          savedUsername
        );

        setNewUsername(
          savedUsername
            .replace(/^@/, '')
        );

        if (
          data.displayName &&
          !user.displayName
        ) {
          setNewName(
            data.displayName
          );
        }
      }
    } catch (error) {
      console.log(
        'Profile load error:',
        error
      );
    }
  };

  const normalizeUsername = (
    value
  ) => {
    return value
      .replace(/^@/, '')
      .toLowerCase()
      .replace(
        /[^a-z0-9_]/g,
        ''
      );
  };

  const validateUsername = (
    value
  ) => {
    const clean =
      normalizeUsername(value);

    if (!clean) {
      return 'Username is required.';
    }

    if (clean.length < 3) {
      return 'Username must be at least 3 characters.';
    }

    if (clean.length > 20) {
      return 'Username must be 20 characters or less.';
    }

    return '';
  };

  const checkUsername = async () => {
    const clean =
      normalizeUsername(
        newUsername
      );

    const validation =
      validateUsername(
        newUsername
      );

    if (validation) {
      setUsernameStatus(
        validation
      );

      return false;
    }

    const currentUsername =
      normalizeUsername(
        username
      );

    if (
      clean === currentUsername
    ) {
      setUsernameStatus(
        '✓ This is your current username.'
      );

      return true;
    }

    setCheckingUsername(true);
    setUsernameStatus('');

    try {
      const usernameQuery =
        query(
          collection(db, 'users'),
          where(
            'usernameLower',
            '==',
            clean
          )
        );

      const snapshot =
        await getDocs(
          usernameQuery
        );

      if (!snapshot.empty) {
        setUsernameStatus(
          '❌ Username already taken.'
        );

        return false;
      }

      setUsernameStatus(
        '✓ Username is available.'
      );

      return true;
    } catch (error) {
      console.log(
        'Username check error:',
        error
      );

      setUsernameStatus(
        'Could not check username.'
      );

      return false;
    } finally {
      setCheckingUsername(false);
    }
  };

  const saveUsername = async () => {
    if (!user?.uid) {
      return;
    }

    const clean =
      normalizeUsername(
        newUsername
      );

    const validation =
      validateUsername(
        newUsername
      );

    if (validation) {
      Alert.alert(
        'Invalid Username',
        validation
      );

      return;
    }

    const oldUsername =
      normalizeUsername(
        username
      );

    if (clean === oldUsername) {
      setEditingUsername(false);
      setUsernameStatus('');
      return;
    }

    setLoading(true);

    try {
      const available =
        await checkUsername();

      if (!available) {
        return;
      }

      const newUsernameRef =
        doc(
          db,
          'usernames',
          clean
        );

      const oldUsernameRef =
        oldUsername
          ? doc(
              db,
              'usernames',
              oldUsername
            )
          : null;

      const userRef =
        doc(
          db,
          'users',
          user.uid
        );

      await runTransaction(
        db,
        async (transaction) => {
          const newReservation =
            await transaction.get(
              newUsernameRef
            );

          if (
            newReservation.exists()
          ) {
            const reserved =
              newReservation.data();

            if (
              reserved.uid !==
              user.uid
            ) {
              throw new Error(
                'USERNAME_TAKEN'
              );
            }
          }

          transaction.set(
            newUsernameRef,
            {
              uid: user.uid,
              username:
                `@${clean}`,
              createdAt:
                serverTimestamp()
            }
          );

          transaction.set(
            userRef,
            {
              username:
                `@${clean}`,
              usernameLower:
                clean,
              usernameUpdatedAt:
                serverTimestamp()
            },
            {
              merge: true
            }
          );

          if (
            oldUsernameRef &&
            oldUsername !== clean
          ) {
            transaction.delete(
              oldUsernameRef
            );
          }
        }
      );

      setUsername(
        `@${clean}`
      );

      setNewUsername(
        clean
      );

      setUsernameStatus(
        '✓ Username updated.'
      );

      setEditingUsername(false);

      Alert.alert(
        'Username Updated',
        `Your new username is @${clean}`
      );
    } catch (error) {
      console.log(
        'Username update error:',
        error
      );

      if (
        error?.message ===
        'USERNAME_TAKEN'
      ) {
        setUsernameStatus(
          '❌ Username was taken. Try another one.'
        );
      } else {
        Alert.alert(
          'Update Failed',
          error?.message ||
            'Could not update username.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!user) {
      return;
    }

    if (!newName.trim()) {
      Alert.alert(
        'Name',
        'Please enter your name.'
      );

      return;
    }

    setLoading(true);

    try {
      await updateProfile(
        user,
        {
          displayName:
            newName.trim()
        }
      );

      await setDoc(
        doc(
          db,
          'users',
          user.uid
        ),
        {
          displayName:
            newName.trim()
        },
        {
          merge: true
        }
      );

      setIsEditing(false);

      Alert.alert(
        'Saved',
        'Your profile name was updated.'
      );
    } catch (error) {
      console.log(
        'Profile update error:',
        error
      );

      Alert.alert(
        'Error',
        'Could not update your name.'
      );
    } finally {
      setLoading(false);
    }
  };

  const avatarUrl =
    `https://ui-avatars.com/api/?name=` +
    `${encodeURIComponent(
      user?.displayName ||
        'User'
    )}` +
    `&background=007AFF&color=fff&size=120`;

  return (
    <ScrollView
      style={[
        styles.container,
        {
          backgroundColor: bg
        }
      ]}
      contentContainerStyle={{
        paddingBottom: 100
      }}
      showsVerticalScrollIndicator={
        false
      }
    >
      <Text
        style={[
          styles.headerTitle,
          {
            color: textMain
          }
        ]}
      >
        Settings
      </Text>

      <View
        style={[
          styles.profileCard,
          {
            backgroundColor:
              cardBg,
            borderColor:
              borderCol
          }
        ]}
      >
        <View
          style={styles.profileInfo}
        >
          <Image
            source={{
              uri: avatarUrl
            }}
            style={styles.avatar}
          />

          <View
            style={styles.nameWrap}
          >
            {isEditing ? (
              <View
                style={
                  styles.editBox
                }
              >
                <TextInput
                  style={[
                    styles.nameInput,
                    {
                      color:
                        textMain,
                      borderColor:
                        borderCol
                    }
                  ]}
                  value={newName}
                  onChangeText={
                    setNewName
                  }
                  placeholder="Enter Name..."
                  placeholderTextColor={
                    textSub
                  }
                />

                <TouchableOpacity
                  onPress={
                    saveProfile
                  }
                  style={
                    styles.saveBtn
                  }
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator
                      color="#FFF"
                      size="small"
                    />
                  ) : (
                    <Text
                      style={
                        styles.saveBtnText
                      }
                    >
                      Save
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Text
                  style={[
                    styles.userName,
                    {
                      color:
                        textMain
                    }
                  ]}
                  numberOfLines={1}
                >
                  {user?.displayName ||
                    'Set Your Name'}
                </Text>

                <Text
                  style={[
                    styles.userHandle,
                    {
                      color:
                        '#007AFF'
                    }
                  ]}
                  numberOfLines={1}
                >
                  {username ||
                    'No username yet'}
                </Text>

                <Text
                  style={[
                    styles.userStatus,
                    {
                      color:
                        textSub
                    }
                  ]}
                  numberOfLines={1}
                >
                  {user?.email}
                </Text>
              </>
            )}
          </View>
        </View>

        {!isEditing && (
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() =>
              setIsEditing(true)
            }
          >
            <Ionicons
              name="pencil"
              size={20}
              color="#007AFF"
            />
          </TouchableOpacity>
        )}
      </View>

      <Text
        style={[
          styles.sectionTitle,
          {
            color: textSub
          }
        ]}
      >
        NAX IDENTITY
      </Text>

      <View
        style={[
          styles.usernameCard,
          {
            backgroundColor:
              cardBg,
            borderColor:
              borderCol
          }
        ]}
      >
        <View
          style={styles.usernameHeader}
        >
          <View
            style={[
              styles.identityIcon,
              {
                backgroundColor:
                  'rgba(0,122,255,0.12)'
              }
            ]}
          >
            <Ionicons
              name="at"
              size={22}
              color="#007AFF"
            />
          </View>

          <View
            style={styles.identityText}
          >
            <Text
              style={[
                styles.identityTitle,
                {
                  color: textMain
                }
              ]}
            >
              Username
            </Text>

            <Text
              style={[
                styles.identityValue,
                {
                  color:
                    username
                      ? '#007AFF'
                      : textSub
                }
              ]}
            >
              {username ||
                'Create your @username'}
            </Text>
          </View>
        </View>

        {!editingUsername ? (
          <TouchableOpacity
            style={
              styles.changeUsernameBtn
            }
            onPress={() => {
              setNewUsername(
                username.replace(
                  /^@/,
                  ''
                )
              );

              setUsernameStatus('');

              setEditingUsername(
                true
              );
            }}
          >
            <Ionicons
              name="create-outline"
              size={19}
              color="#FFF"
            />

            <Text
              style={
                styles.changeUsernameText
              }
            >
              Change Username
            </Text>
          </TouchableOpacity>
        ) : (
          <View
            style={
              styles.usernameEditor
            }
          >
            <View
              style={[
                styles.usernameInputBox,
                {
                  backgroundColor:
                    isDark
                      ? '#121212'
                      : '#F5F5F7',
                  borderColor:
                    borderCol
                }
              ]}
            >
              <Text
                style={[
                  styles.atText,
                  {
                    color:
                      textSub
                  }
                ]}
              >
                @
              </Text>

              <TextInput
                style={[
                  styles.usernameInput,
                  {
                    color:
                      textMain
                  }
                ]}
                value={newUsername}
                onChangeText={(value) => {
                  const clean =
                    normalizeUsername(
                      value
                    );

                  setNewUsername(
                    clean
                  );

                  setUsernameStatus(
                    ''
                  );
                }}
                placeholder="newusername"
                placeholderTextColor={
                  textSub
                }
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
              />
            </View>

            <Text
              style={[
                styles.usernameHint,
                {
                  color: textSub
                }
              ]}
            >
              3–20 characters:
              letters, numbers and _
            </Text>

            {!!usernameStatus && (
              <Text
                style={[
                  styles.usernameStatus,
                  {
                    color:
                      usernameStatus.startsWith(
                        '✓'
                      )
                        ? '#22C55E'
                        : '#FF4D4F'
                  }
                ]}
              >
                {usernameStatus}
              </Text>
            )}

            <View
              style={
                styles.usernameActions
              }
            >
              <TouchableOpacity
                style={[
                  styles.cancelBtn,
                  {
                    borderColor:
                      borderCol
                  }
                ]}
                onPress={() => {
                  setEditingUsername(
                    false
                  );

                  setUsernameStatus(
                    ''
                  );
                }}
                disabled={loading}
              >
                <Text
                  style={[
                    styles.cancelText,
                    {
                      color:
                        textMain
                    }
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.checkUsernameBtn
                }
                onPress={
                  checkUsername
                }
                disabled={
                  checkingUsername ||
                  loading
                }
              >
                {checkingUsername ? (
                  <ActivityIndicator
                    color="#FFF"
                    size="small"
                  />
                ) : (
                  <Text
                    style={
                      styles.checkUsernameText
                    }
                  >
                    Check
                  </Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  styles.saveUsernameBtn
                }
                onPress={
                  saveUsername
                }
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator
                    color="#FFF"
                    size="small"
                  />
                ) : (
                  <Text
                    style={
                      styles.saveUsernameText
                    }
                  >
                    Save
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      <Text
        style={[
          styles.sectionTitle,
          {
            color: textSub
          }
        ]}
      >
        APPEARANCE
      </Text>

      <View
        style={[
          styles.themeCard,
          {
            backgroundColor:
              cardBg,
            borderColor:
              borderCol
          }
        ]}
      >
        <View
          style={styles.themeRow}
        >
          {[
            'system',
            'light',
            'dark'
          ].map((mode) => (
            <TouchableOpacity
              key={mode}
              style={[
                styles.themeBtn,
                themeMode === mode
                  ? styles.themeBtnActive
                  : {
                      borderColor:
                        isDark
                          ? '#333'
                          : '#ddd'
                    }
              ]}
              onPress={() =>
                changeTheme(mode)
              }
            >
              <Text
                style={{
                  color:
                    themeMode === mode
                      ? '#fff'
                      : isDark
                        ? '#aaa'
                        : '#555',
                  textTransform:
                    'capitalize',
                  fontWeight:
                    themeMode === mode
                      ? 'bold'
                      : 'normal'
                }}
              >
                {mode === 'system'
                  ? 'Auto'
                  : mode}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <Text
        style={[
          styles.sectionTitle,
          {
            color: textSub
          }
        ]}
      >
        ACCOUNT SETTINGS
      </Text>

      <TouchableOpacity
        style={[
          styles.settingItem,
          {
            backgroundColor:
              cardBg,
            borderColor:
              borderCol
          }
        ]}
      >
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor:
                '#34C759'
            }
          ]}
        >
          <Ionicons
            name="notifications"
            size={20}
            color="#FFF"
          />
        </View>

        <Text
          style={[
            styles.settingText,
            {
              color: textMain
            }
          ]}
        >
          Notifications
        </Text>

        <Ionicons
          name="chevron-forward"
          size={20}
          color={textSub}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.settingItem,
          {
            backgroundColor:
              cardBg,
            borderColor:
              borderCol
          }
        ]}
      >
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor:
                '#5856D6'
            }
          ]}
        >
          <Ionicons
            name="lock-closed"
            size={20}
            color="#FFF"
          />
        </View>

        <Text
          style={[
            styles.settingText,
            {
              color: textMain
            }
          ]}
        >
          Privacy & Security
        </Text>

        <Ionicons
          name="chevron-forward"
          size={20}
          color={textSub}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.settingItem,
          {
            backgroundColor:
              cardBg,
            borderColor:
              borderCol,
            borderBottomWidth: 0,
            marginBottom: 40
          }
        ]}
        onPress={() =>
          signOut(auth)
        }
      >
        <View
          style={[
            styles.iconWrap,
            {
              backgroundColor:
                '#FF3B30'
            }
          ]}
        >
          <Ionicons
            name="log-out"
            size={20}
            color="#FFF"
          />
        </View>

        <Text
          style={[
            styles.settingText,
            {
              color: textMain
            }
          ]}
        >
          Log Out
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 40
  },

  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 20
  },

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    padding: 20,
    borderRadius: 15,
    borderWidth: 1,
    marginBottom: 25
  },

  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },

  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ccc'
  },

  nameWrap: {
    marginLeft: 15,
    flex: 1
  },

  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 3
  },

  userHandle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3
  },

  userStatus: {
    fontSize: 12
  },

  editBtn: {
    padding: 8,
    backgroundColor:
      'rgba(0,122,255,0.1)',
    borderRadius: 50
  },

  editBox: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 10
  },

  nameInput: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    marginRight: 10
  },

  saveBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 15,
    height: 40,
    justifyContent: 'center',
    borderRadius: 8
  },

  saveBtnText: {
    color: '#FFF',
    fontWeight: 'bold'
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginLeft: 10,
    marginBottom: 10,
    letterSpacing: 1
  },

  usernameCard: {
    padding: 16,
    borderRadius: 15,
    borderWidth: 1,
    marginBottom: 25
  },

  usernameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15
  },

  identityIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center'
  },

  identityText: {
    marginLeft: 12,
    flex: 1
  },

  identityTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 3
  },

  identityValue: {
    fontSize: 14,
    fontWeight: '600'
  },

  changeUsernameBtn: {
    height: 46,
    borderRadius: 11,
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },

  changeUsernameText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8
  },

  usernameEditor: {
    marginTop: 2
  },

  usernameInputBox: {
    height: 50,
    borderRadius: 11,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14
  },

  atText: {
    fontSize: 18,
    fontWeight: '700'
  },

  usernameInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 4
  },

  usernameHint: {
    fontSize: 12,
    marginTop: 7
  },

  usernameStatus: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 8
  },

  usernameActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 13
  },

  cancelBtn: {
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 9,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },

  cancelText: {
    fontSize: 13,
    fontWeight: '600'
  },

  checkUsernameBtn: {
    height: 42,
    paddingHorizontal: 13,
    marginLeft: 7,
    borderRadius: 9,
    backgroundColor: '#5856D6',
    justifyContent: 'center',
    alignItems: 'center'
  },

  checkUsernameText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700'
  },

  saveUsernameBtn: {
    height: 42,
    paddingHorizontal: 13,
    marginLeft: 7,
    borderRadius: 9,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center'
  },

  saveUsernameText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700'
  },

  themeCard: {
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    marginBottom: 25
  },

  themeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },

  themeBtn: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 5,
    borderWidth: 1,
    borderRadius: 8,
    alignItems: 'center'
  },

  themeBtnActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF'
  },

  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 15,
    borderWidth: 1,
    marginBottom: 15
  },

  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15
  },

  settingText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500'
  }
});
