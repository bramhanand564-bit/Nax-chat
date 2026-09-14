import React, { useState } from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';

import {
  auth,
  db
} from '../firebaseConfig';

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  deleteUser
} from 'firebase/auth';

import {
  collection,
  query,
  where,
  getDocs,
  doc,
  setDoc
} from 'firebase/firestore';

import { useTheme } from '../context/ThemeContext';

import {
  Ionicons
} from '@expo/vector-icons';

export default function AuthScreen() {
  const { isDark } = useTheme();

  const [email, setEmail] =
    useState('');

  const [password, setPassword] =
    useState('');

  const [username, setUsername] =
    useState('');

  const [usernameStatus, setUsernameStatus] =
    useState('');

  const [isLogin, setIsLogin] =
    useState(true);

  const [loading, setLoading] =
    useState(false);

  const [checkingUsername, setCheckingUsername] =
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

  const inputBg =
    isDark
      ? '#1E1E1E'
      : '#FFFFFF';

  const normalizeUsername = (value) => {
    return value
      .replace(/^@/, '')
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '');
  };

  const validateUsername = (value) => {
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

    if (!/^[a-z0-9_]+$/.test(clean)) {
      return 'Use only letters, numbers and _.';
    }

    return '';
  };

  const checkUsername = async () => {
    const clean =
      normalizeUsername(username);

    const validation =
      validateUsername(username);

    if (validation) {
      setUsernameStatus(
        validation
      );
      return false;
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

  const handleAuth = async () => {
    if (!email.trim() || !password) {
      Alert.alert(
        'Error',
        'Please enter email and password.'
      );

      return;
    }

    if (!isLogin) {
      const validation =
        validateUsername(username);

      if (validation) {
        Alert.alert(
          'Username',
          validation
        );

        return;
      }
    }

    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

        return;
      }

      const cleanUsername =
        normalizeUsername(username);

      const available =
        await checkUsername();

      if (!available) {
        return;
      }

      const credential =
        await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

      const user =
        credential.user;

      try {
        await setDoc(
          doc(
            db,
            'users',
            user.uid
          ),
          {
            uid: user.uid,
            email: user.email || '',
            username:
              `@${cleanUsername}`,
            usernameLower:
              cleanUsername,
            online: true,
            createdAt:
              new Date()
          },
          {
            merge: true
          }
        );
      } catch (profileError) {
        try {
          await deleteUser(user);
        } catch (deleteError) {
          console.log(
            'Cleanup error:',
            deleteError
          );
        }

        throw profileError;
      }

      Alert.alert(
        'Welcome to Nax! 🎉',
        `Your username is @${cleanUsername}`
      );
    } catch (error) {
      console.log(
        'Authentication error:',
        error
      );

      let message =
        error?.message ||
        'Something went wrong.';

      if (
        error?.code ===
        'auth/email-already-in-use'
      ) {
        message =
          'This email is already registered.';
      }

      if (
        error?.code ===
        'auth/invalid-email'
      ) {
        message =
          'Please enter a valid email address.';
      }

      if (
        error?.code ===
        'auth/weak-password'
      ) {
        message =
          'Password should be at least 6 characters.';
      }

      if (
        error?.code ===
        'auth/invalid-credential'
      ) {
        message =
          'Invalid email or password.';
      }

      Alert.alert(
        'Oops!',
        message
      );
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setUsername('');
    setUsernameStatus('');
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: bg
        }
      ]}
    >
      <Text
        style={[
          styles.title,
          {
            color: textMain
          }
        ]}
      >
        Nax Chat
      </Text>

      <Text
        style={[
          styles.subtitle,
          {
            color: textSub
          }
        ]}
      >
        {isLogin
          ? 'Welcome back! Sign in to continue.'
          : 'Create your Nax identity and get started.'}
      </Text>

      {!isLogin && (
        <>
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor:
                  inputBg
              }
            ]}
          >
            <Ionicons
              name="at-outline"
              size={20}
              color={textSub}
              style={styles.icon}
            />

            <TextInput
              style={[
                styles.input,
                {
                  color: textMain
                }
              ]}
              placeholder="Choose username"
              placeholderTextColor={
                textSub
              }
              value={username}
              onChangeText={(value) => {
                const clean =
                  normalizeUsername(
                    value
                  );

                setUsername(clean);
                setUsernameStatus('');
              }}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
            />
          </View>

          <View
            style={
              styles.usernameRow
            }
          >
            <Text
              style={[
                styles.usernameHint,
                {
                  color: textSub
                }
              ]}
            >
              3–20 characters:
              letters, numbers, _
            </Text>

            <TouchableOpacity
              onPress={
                checkUsername
              }
              disabled={
                checkingUsername
              }
              style={
                styles.checkButton
              }
            >
              {checkingUsername ? (
                <ActivityIndicator
                  size="small"
                  color="#007AFF"
                />
              ) : (
                <Text
                  style={
                    styles.checkText
                  }
                >
                  Check
                </Text>
              )}
            </TouchableOpacity>
          </View>

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
        </>
      )}

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor:
              inputBg
          }
        ]}
      >
        <Ionicons
          name="mail-outline"
          size={20}
          color={textSub}
          style={styles.icon}
        />

        <TextInput
          style={[
            styles.input,
            {
              color: textMain
            }
          ]}
          placeholder="Email address"
          placeholderTextColor={
            textSub
          }
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
        />
      </View>

      <View
        style={[
          styles.inputContainer,
          {
            backgroundColor:
              inputBg
          }
        ]}
      >
        <Ionicons
          name="lock-closed-outline"
          size={20}
          color={textSub}
          style={styles.icon}
        />

        <TextInput
          style={[
            styles.input,
            {
              color: textMain
            }
          ]}
          placeholder="Password"
          placeholderTextColor={
            textSub
          }
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />
      </View>

      <TouchableOpacity
        style={styles.mainBtn}
        onPress={handleAuth}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator
            color="#FFF"
          />
        ) : (
          <Text
            style={
              styles.mainBtnText
            }
          >
            {isLogin
              ? 'Login'
              : 'Create Account'}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.googleBtn}
        onPress={() =>
          Alert.alert(
            'Coming Soon',
            'Google Login requires backend key setup. Please use Email for now.'
          )
        }
      >
        <Ionicons
          name="logo-google"
          size={20}
          color={textMain}
        />

        <Text
          style={[
            styles.googleBtnText,
            {
              color: textMain
            }
          ]}
        >
          Continue with Google
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={switchMode}
        style={styles.switchBtn}
      >
        <Text
          style={[
            styles.switchText,
            {
              color: textSub
            }
          ]}
        >
          {isLogin
            ? "Don't have an account? "
            : 'Already have an account? '}

          <Text
            style={{
              color: '#007AFF',
              fontWeight: 'bold'
            }}
          >
            {isLogin
              ? 'Sign Up'
              : 'Login'}
          </Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 25
  },

  title: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center'
  },

  subtitle: {
    fontSize: 16,
    marginBottom: 32,
    textAlign: 'center'
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 15,
    height: 55,
    borderWidth: 1,
    borderColor:
      'rgba(150,150,150,0.1)'
  },

  icon: {
    marginRight: 10
  },

  input: {
    flex: 1,
    fontSize: 16
  },

  usernameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent:
      'space-between',
    marginTop: -7,
    marginBottom: 10
  },

  usernameHint: {
    fontSize: 12,
    flex: 1
  },

  checkButton: {
    paddingHorizontal: 12,
    paddingVertical: 6
  },

  checkText: {
    color: '#007AFF',
    fontWeight: 'bold',
    fontSize: 14
  },

  usernameStatus: {
    fontSize: 13,
    marginTop: -3,
    marginBottom: 10,
    fontWeight: '600'
  },

  mainBtn: {
    backgroundColor: '#007AFF',
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    elevation: 3,
    shadowColor: '#007AFF',
    shadowOffset: {
      width: 0,
      height: 4
    },
    shadowOpacity: 0.3,
    shadowRadius: 5
  },

  mainBtnText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold'
  },

  googleBtn: {
    flexDirection: 'row',
    height: 55,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    borderWidth: 1,
    borderColor:
      'rgba(150,150,150,0.3)'
  },

  googleBtnText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10
  },

  switchBtn: {
    marginTop: 30,
    alignItems: 'center'
  },

  switchText: {
    fontSize: 14
  }
});
