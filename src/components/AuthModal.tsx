import React, { useState } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { User, Lock, UserPlus, LogIn, Eye, EyeOff, X, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onCustomLogin: (user: { uid: string; displayName: string; username: string; email: string }) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onCustomLogin,
}) => {
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [displayName, setDisplayName] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  // Convert username to a clean internal email format
  const sanitizeUsernameToEmail = (rawUser: string): string => {
    const clean = rawUser.trim().toLowerCase().replace(/[^a-z0-9._-]/g, '');
    if (!clean) return '';
    return `${clean}@expensetracker.app`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanUser = username.trim();
    if (!cleanUser) {
      setError('Please enter a username.');
      return;
    }

    if (cleanUser.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    const email = sanitizeUsernameToEmail(cleanUser);
    const nameToUse = displayName.trim() || cleanUser;
    setLoading(true);

    try {
      const userDocRef = doc(db, 'users', cleanUser.toLowerCase());

      if (isSignUp) {
        // Step 1: Check if username exists in Firestore
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          setError(`Username "${cleanUser}" is already taken. Please sign in.`);
          setLoading(false);
          return;
        }

        // Step 2: Register via Firebase Auth
        let uidToUse = `usr_${cleanUser.toLowerCase()}`;
        try {
          const userCred = await createUserWithEmailAndPassword(auth, email, password);
          await updateProfile(userCred.user, { displayName: nameToUse });
          uidToUse = userCred.user.uid;
        } catch (firebaseErr: any) {
          console.warn('Firebase Auth create error (using Firestore user backup):', firebaseErr);
          if (firebaseErr.code === 'auth/email-already-in-use') {
            setError(`Username "${cleanUser}" is already registered. Please sign in instead.`);
            setLoading(false);
            return;
          }
        }

        // Step 3: Always write user metadata to Firestore users collection
        await setDoc(userDocRef, {
          username: cleanUser,
          displayName: nameToUse,
          password: password,
          uid: uidToUse,
          email: email,
          createdAt: new Date().toISOString(),
        });

        onCustomLogin({
          uid: uidToUse,
          displayName: nameToUse,
          username: cleanUser,
          email,
        });
        onClose();
      } else {
        // Sign In Attempt
        let loggedInUser: { uid: string; displayName: string; username: string; email: string } | null = null;

        // Try Firebase Auth first
        try {
          const userCred = await signInWithEmailAndPassword(auth, email, password);
          loggedInUser = {
            uid: userCred.user.uid,
            displayName: userCred.user.displayName || nameToUse,
            username: cleanUser,
            email,
          };
        } catch (firebaseErr: any) {
          console.warn('Firebase Auth sign-in failed, checking Firestore account:', firebaseErr);
        }

        // If Firebase Auth succeeded
        if (loggedInUser) {
          // Update / sync Firestore user record
          await setDoc(
            userDocRef,
            {
              username: cleanUser,
              displayName: loggedInUser.displayName,
              uid: loggedInUser.uid,
              email: email,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          );

          onCustomLogin(loggedInUser);
          onClose();
          return;
        }

        // Fallback: Check Firestore users collection
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          const userData = docSnap.data();
          if (userData.password === password || !userData.password) {
            onCustomLogin({
              uid: userData.uid || `usr_${cleanUser.toLowerCase()}`,
              displayName: userData.displayName || cleanUser,
              username: cleanUser,
              email: userData.email || email,
            });
            onClose();
            return;
          } else {
            setError('Incorrect password for this username.');
            setLoading(false);
            return;
          }
        }

        setError('Username not found. Please register an account first.');
      }
    } catch (err: any) {
      console.error('Registration/Auth handler error:', err);
      setError('Failed to process authentication. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden">
        {/* Background Ambient Glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon & Title */}
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-600/30">
            ₹
          </div>
          <div>
            <h3 className="text-xl font-bold tracking-tight">
              {currentUser ? 'Switch Account' : isSignUp ? 'Create New Account' : 'Account Login'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isSignUp ? 'Sign up to manage your personal expense ledger' : 'Access your personal expense ledger'}
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(false);
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
              !isSignUp
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsSignUp(true);
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition ${
              isSignUp
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-white shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Register Account
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs text-rose-600 dark:text-rose-300 font-medium leading-relaxed">
            {error}
          </div>
        )}

        {/* Login / Register Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Optional Display Name for Sign Up */}
          {isSignUp && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Your Full Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Kalai"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
          )}

          {/* Username Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                placeholder="e.g. Kalai22"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/30 transition text-sm disabled:opacity-50"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : isSignUp ? (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Account</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center text-xs text-slate-500">
          <span className="flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Cloud Secured Account</span>
          </span>
        </div>
      </div>
    </div>
  );
};
