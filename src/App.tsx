import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { Capacitor } from '@capacitor/core';
import { db, auth } from './firebase';
import { Transaction, PeriodType, TransactionType } from './types';
import { Navbar } from './components/Navbar';
import { WebApp } from './components/WebApp';
import { AndroidApp } from './components/AndroidApp';
import { DualView } from './components/DualView';
import { WelcomeLanding } from './components/WelcomeLanding';
import { TransactionModal } from './components/TransactionModal';
import { ExcelViewerModal } from './components/ExcelViewerModal';
import { InstallModal } from './components/InstallModal';
import { AuthModal } from './components/AuthModal';
import { UserDrawer } from './components/UserDrawer';
import { SmsModal } from './components/SmsModal';
import { ExcelRow } from './utils/excelHelper';

interface CustomUser {
  uid: string;
  displayName: string;
  username?: string;
  email?: string;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return errInfo;
}

const CUSTOM_USER_STORAGE_KEY = 'expensetracker_active_user_session';
const THEME_STORAGE_KEY = 'expensetracker_theme';
type ThemeMode = 'light' | 'dark';

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') {
        return saved;
      }
    } catch {
      // Ignore localStorage access issues and fallback to system preference.
    }

    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  });

  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [customUser, setCustomUser] = useState<CustomUser | null>(() => {
    try {
      const saved = localStorage.getItem(CUSTOM_USER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [rawTransactions, setRawTransactions] = useState<Transaction[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Selected period state (Day, Month, Year)
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('Month');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Modals & Drawers state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState<boolean>(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isUserDrawerOpen, setIsUserDrawerOpen] = useState<boolean>(false);
  const [isSmsModalOpen, setIsSmsModalOpen] = useState<boolean>(false);

  // Platform Detection
  const isNativeApk = useMemo(() => {
    try {
      return Capacitor.isNativePlatform();
    } catch {
      return false;
    }
  }, []);

  // Effective logged in user
  const effectiveUser = useMemo(() => {
    if (fbUser) {
      return {
        uid: fbUser.uid,
        displayName: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
        email: fbUser.email || undefined,
      };
    }
    return customUser;
  }, [fbUser, customUser]);

  // Username Tag for Exports & Viewers
  const usernameTag = useMemo(() => {
    if (!effectiveUser) return 'Guest';
    return (effectiveUser as any).username || effectiveUser.email?.split('@')[0] || effectiveUser.displayName;
  }, [effectiveUser]);

  // Firebase Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFbUser(user);
    });
    return () => unsub();
  }, []);

  // Keep the root element and localStorage in sync with selected theme.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', theme === 'dark');
    root.style.colorScheme = theme;

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Ignore localStorage write issues.
    }
  }, [theme]);

  // Real-time Firestore snapshot listener
  useEffect(() => {
    setIsLoading(true);
    const q = query(collection(db, 'transactions'), orderBy('date', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list: Transaction[] = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            type: data.type || 'DEBIT',
            amount: Number(data.amount) || 0,
            title: data.title || 'Untitled',
            category: data.category || 'Other',
            note: data.note || null,
            date: data.date || new Date().toISOString(),
            source: data.source || 'MANUAL',
            userId: data.userId || undefined,
            createdAt: data.createdAt ? data.createdAt.toString() : new Date().toISOString(),
          };
        });

        setRawTransactions(list);
        setIsConnected(true);
        setIsLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'transactions');
        setIsConnected(false);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filter transactions for active user
  const transactions = useMemo(() => {
    if (!effectiveUser) {
      return [];
    }
    const uid = effectiveUser.uid;
    const nameTag = (effectiveUser as any).username || effectiveUser.displayName;
    const email = effectiveUser.email;

    return rawTransactions.filter((t) => {
      if (!t.userId) return false;
      if (t.userId === uid) return true;
      if (nameTag && (t.userId.toLowerCase() === nameTag.toLowerCase() || t.userId.toLowerCase() === `usr_${nameTag.toLowerCase()}`)) {
        return true;
      }
      if (email && t.userId.toLowerCase() === email.toLowerCase()) return true;
      return false;
    });
  }, [rawTransactions, effectiveUser]);

  // Handle Save / Update Single Transaction
  const handleSaveTransaction = async (data: {
    id?: string;
    type: TransactionType;
    amount: number;
    title: string;
    category: string;
    date: string;
    note?: string;
    source?: 'MANUAL' | 'EXCEL' | 'IMPORT';
  }) => {
    if (!effectiveUser) {
      setIsAuthModalOpen(true);
      return;
    }

    const payload: any = {
      type: data.type,
      amount: data.amount,
      title: data.title,
      category: data.category,
      date: data.date,
      note: data.note || null,
      source: data.source || 'MANUAL',
      userId: effectiveUser.uid,
    };

    try {
      if (data.id) {
        // Update existing document
        const docRef = doc(db, 'transactions', data.id);
        await updateDoc(docRef, payload);
      } else {
        // Create new document
        await addDoc(collection(db, 'transactions'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'transactions');
    }
  };

  // Handle Delete Transaction
  const handleDeleteTransaction = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'transactions', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `transactions/${id}`);
    }
  };

  // Handle Bulk Transaction Import
  const handleImportBulkTransactions = async (
    items: {
      type?: 'DEBIT' | 'CREDIT';
      amount: number;
      title: string;
      category?: string;
      date?: string;
      source?: 'MANUAL' | 'EXCEL' | 'IMPORT';
      note?: string;
    }[]
  ): Promise<number> => {
    if (!effectiveUser) return 0;

    let imported = 0;
    for (const item of items) {
      const payload: any = {
        type: item.type || 'DEBIT',
        amount: Number(item.amount) || 0,
        title: item.title || 'Imported Entry',
        category: item.category || 'Other',
        date: item.date || new Date().toISOString(),
        source: item.source || 'EXCEL',
        note: item.note || null,
        userId: effectiveUser.uid,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'transactions'), payload);
      imported++;
    }
    return imported;
  };

  // Handle Interactive Excel Sheet Rows Sync & Save to Firestore
  const handleSaveExcelRowsToLedger = async (rows: ExcelRow[]): Promise<number> => {
    if (!effectiveUser) {
      setIsAuthModalOpen(true);
      return 0;
    }

    let count = 0;
    for (const row of rows) {
      const payload: any = {
        type: row.type || 'DEBIT',
        amount: Number(row.amount) || 0,
        title: row.title || 'Excel Entry',
        category: row.category || 'Other',
        date: row.date.length === 10 ? `${row.date}T12:00:00.000Z` : row.date,
        note: row.note || null,
        source: 'EXCEL',
        userId: effectiveUser.uid,
      };

      if (row.id && !row.id.startsWith('temp-')) {
        // Update existing document
        const docRef = doc(db, 'transactions', row.id);
        await updateDoc(docRef, payload);
      } else {
        // Create new document
        await addDoc(collection(db, 'transactions'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
      count++;
    }
    return count;
  };

  const handleOpenEdit = (tx: Transaction) => {
    setEditingTransaction(tx);
    setIsAddModalOpen(true);
  };

  const handleCloseAddModal = () => {
    setIsAddModalOpen(false);
    setEditingTransaction(null);
  };

  const handleCustomLogin = (user: CustomUser) => {
    setCustomUser(user);
    try {
      localStorage.setItem(CUSTOM_USER_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Failed to save session:', e);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    }
    setCustomUser(null);
    try {
      localStorage.removeItem(CUSTOM_USER_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear session:', e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 antialiased transition-colors duration-200 selection:bg-indigo-500 selection:text-white dark:bg-slate-950 dark:text-slate-100">
      {/* Top Navigation Bar */}
      <Navbar
        isFirestoreConnected={isConnected}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        onOpenExcelModal={() => setIsExcelModalOpen(true)}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        currentUser={effectiveUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenDrawer={() => setIsUserDrawerOpen(true)}
        isNativeApk={isNativeApk}
        onOpenSmsModal={() => setIsSmsModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="py-4">
        {isLoading ? (
          <div className="max-w-7xl mx-auto p-12 text-center text-slate-500 space-y-3">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-semibold">Connecting to Firestore Live Stream...</p>
          </div>
        ) : effectiveUser ? (
          /* User Dashboard View (Logged In) */
          isNativeApk ? (
            <AndroidApp
              transactions={transactions}
              onOpenAddModal={() => {
                setEditingTransaction(null);
                setIsAddModalOpen(true);
              }}
              onEditTransaction={handleOpenEdit}
              onDeleteTransaction={handleDeleteTransaction}
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              selectedPeriod={selectedPeriod}
              setSelectedPeriod={setSelectedPeriod}
              onOpenSmsModal={() => setIsSmsModalOpen(true)}
            />
          ) : (
            <WebApp
              transactions={transactions}
              onOpenAddModal={() => {
                setEditingTransaction(null);
                setIsAddModalOpen(true);
              }}
              onEditTransaction={handleOpenEdit}
              onDeleteTransaction={handleDeleteTransaction}
              currentDate={currentDate}
              setCurrentDate={setCurrentDate}
              selectedPeriod={selectedPeriod}
              setSelectedPeriod={setSelectedPeriod}
              onOpenExcelModal={() => setIsExcelModalOpen(true)}
            />
          )
        ) : (
          /* Welcome Landing Page (Unauthenticated) */
          <WelcomeLanding
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            onOpenInstallModal={() => setIsInstallModalOpen(true)}
          />
        )}
      </main>

      {/* Right Side Options Drawer */}
      <UserDrawer
        isOpen={isUserDrawerOpen}
        onClose={() => setIsUserDrawerOpen(false)}
        currentUser={effectiveUser}
        transactions={transactions}
        onSignOut={handleSignOut}
        onImportTransactions={handleImportBulkTransactions}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenExcelModal={() => setIsExcelModalOpen(true)}
        onOpenSmsModal={() => setIsSmsModalOpen(true)}
        isNativeApk={isNativeApk}
      />

      {/* Bank SMS Auto-Parser Modal (APK Feature) */}
      <SmsModal
        isOpen={isSmsModalOpen}
        onClose={() => setIsSmsModalOpen(false)}
        onAddTransactions={handleImportBulkTransactions}
      />

      {/* Add / Edit Transaction Modal */}
      <TransactionModal
        isOpen={isAddModalOpen}
        onClose={handleCloseAddModal}
        onSave={handleSaveTransaction}
        editTransaction={editingTransaction}
        defaultDate={currentDate}
      />

      {/* Interactive Excel Sheet View & Editor Modal */}
      <ExcelViewerModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        transactions={transactions}
        onSaveExcelRowsToLedger={handleSaveExcelRowsToLedger}
        usernameTag={usernameTag}
      />

      {/* PWA / Standalone Install Modal */}
      <InstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      {/* Account Login / Register Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={effectiveUser}
        onCustomLogin={handleCustomLogin}
      />
    </div>
  );
}
