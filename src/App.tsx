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
import { onAuthStateChanged, signOut, deleteUser, User as FirebaseUser } from 'firebase/auth';
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
import { useHourlySync } from './utils/useHourlySync';
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

export default function App() {
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

  // Real-time Firestore snapshot listener
  useEffect(() => {
    setIsLoading(true);
    // Own scoped collection: SMS parsing/refresh here never touches expense_tracker's ledger
    const q = query(collection(db, 'apk_transactions'), orderBy('date', 'desc'));

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
            status: data.status || 'confirmed',
            userId: data.userId || undefined,
            createdAt: data.createdAt ? data.createdAt.toString() : new Date().toISOString(),
          };
        });

        setRawTransactions(list);
        setIsConnected(true);
        setIsLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'apk_transactions');
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
    source?: any;
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
      source: data.source || 'manual',
      // Manual add/edit through the modal counts as user-reviewed
      status: 'confirmed',
      userId: effectiveUser.uid,
    };

    try {
      if (data.id) {
        // Update existing document
        const docRef = doc(db, 'apk_transactions', data.id);
        await updateDoc(docRef, payload);
      } else {
        // Create new document
        await addDoc(collection(db, 'apk_transactions'), {
          ...payload,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'apk_transactions');
      // Rethrow so the modal knows the save failed and shows an error instead of closing silently
      throw err;
    }
  };

  // Handle Delete Transaction
  const handleDeleteTransaction = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'apk_transactions', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `apk_transactions/${id}`);
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
      source?: any;
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
        source: item.source || 'manual',
        // SMS-parsed entries stay pending in this app's own staging area until
        // the user explicitly imports them from expense_tracker's "Import SMS" screen
        status: item.source === 'sms' ? 'pending' : 'confirmed',
        note: item.note || null,
        userId: effectiveUser.uid,
        createdAt: serverTimestamp(),
      };
      await addDoc(collection(db, 'apk_transactions'), payload);
      imported++;
    }
    return imported;
  };

  // Automated Hourly Background Sync for SMS
  const {
    lastSyncTime,
    lastSyncSummary,
    isParsing,
    triggerManualHourlySync,
  } = useHourlySync({
    enabled: Boolean(effectiveUser),
    currentUser: effectiveUser,
    existingTransactions: transactions,
    onAddTransactions: handleImportBulkTransactions,
  });

  const [parsingNotification, setParsingNotification] = useState<{ type: 'info' | 'success' | 'warning'; text: string } | null>(null);

  // Handle Manual Ledger Refresh Click
  const handleRefreshLedger = async () => {
    if (isParsing) {
      setParsingNotification({
        type: 'info',
        text: 'SMS background parsing is already running. Please wait for it to complete.',
      });
      setTimeout(() => setParsingNotification(null), 4000);
      return;
    }

    setParsingNotification({
      type: 'info',
      text: 'Checking for new bank SMS messages in background...',
    });

    const result = await triggerManualHourlySync();
    if (result.status === 'already_running') {
      setParsingNotification({
        type: 'warning',
        text: 'SMS parsing is already running in the background.',
      });
    } else {
      setParsingNotification({
        type: 'success',
        text: result.message || 'Ledger refreshed and SMS sync completed!',
      });
    }

    setTimeout(() => setParsingNotification(null), 4500);
  };

  // Handle Interactive Excel Sheet Rows Sync & Save to Firestore
  const handleSaveExcelRowsToLedger = async (rows: ExcelRow[]): Promise<number> => {
    if (!effectiveUser) {
      setIsAuthModalOpen(true);
      return 0;
    }

    let count = 0;
    try {
      for (const row of rows) {
        const payload: any = {
          type: row.type || 'DEBIT',
          amount: Number(row.amount) || 0,
          title: row.title || 'Excel Entry',
          category: row.category || 'Other',
          date: row.date.length === 10 ? `${row.date}T12:00:00.000Z` : row.date,
          note: row.note || null,
          source: 'EXCEL',
          status: 'confirmed',
          userId: effectiveUser.uid,
        };

        if (row.id && !row.id.startsWith('temp-')) {
          // Update existing document
          const docRef = doc(db, 'apk_transactions', row.id);
          await updateDoc(docRef, payload);
        } else {
          // Create new document
          await addDoc(collection(db, 'apk_transactions'), {
            ...payload,
            createdAt: serverTimestamp(),
          });
        }
        count++;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'apk_transactions');
      throw err;
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

  // Permanently delete the current account: its transactions, profile doc, and Auth user
  const handleDeleteAccount = async (): Promise<{ success: boolean; message: string }> => {
    if (!effectiveUser) {
      return { success: false, message: 'No account is signed in.' };
    }

    try {
      await Promise.all(transactions.map((t) => deleteDoc(doc(db, 'apk_transactions', t.id))));
      await deleteDoc(doc(db, 'users', usernameTag.toLowerCase()));

      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
      }

      setCustomUser(null);
      try {
        localStorage.removeItem(CUSTOM_USER_STORAGE_KEY);
      } catch (e) {
        console.error('Failed to clear session:', e);
      }

      return { success: true, message: 'Account and all associated data were deleted successfully.' };
    } catch (err: any) {
      if (err?.code === 'auth/requires-recent-login') {
        return {
          success: false,
          message: 'For security, please log out and log back in, then try deleting your account again.',
        };
      }
      handleFirestoreError(err, OperationType.DELETE, 'account');
      return { success: false, message: err?.message || 'Failed to delete account.' };
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 antialiased transition-colors duration-200 selection:bg-indigo-500 selection:text-white dark:bg-slate-950 dark:text-slate-100">
      {/* Top Navigation Bar */}
      <Navbar
        isFirestoreConnected={isConnected}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        onOpenExcelModal={() => setIsExcelModalOpen(true)}
        currentUser={effectiveUser}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenDrawer={() => setIsUserDrawerOpen(true)}
        isNativeApk={isNativeApk}
        onOpenSmsModal={() => setIsSmsModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="py-4">
        {/* Global Parsing Notification Banner */}
        {parsingNotification && (
          <div className="max-w-7xl mx-auto px-4 mb-3">
            <div
              className={`p-3 rounded-2xl text-xs font-semibold flex items-center justify-between border shadow-sm animate-in fade-in duration-200 ${
                parsingNotification.type === 'info'
                  ? 'bg-indigo-900 text-indigo-100 border-indigo-700'
                  : parsingNotification.type === 'success'
                  ? 'bg-emerald-900 text-emerald-100 border-emerald-700'
                  : 'bg-amber-900 text-amber-100 border-amber-700'
              }`}
            >
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                <span>{parsingNotification.text}</span>
              </div>
              <button
                onClick={() => setParsingNotification(null)}
                className="text-xs opacity-70 hover:opacity-100 px-2 py-0.5"
              >
                ✕
              </button>
            </div>
          </div>
        )}

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
              onRefresh={handleRefreshLedger}
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
              onRefresh={handleRefreshLedger}
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
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        onDeleteAccount={handleDeleteAccount}
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
