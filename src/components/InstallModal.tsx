import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X, Sparkles, ShieldCheck, RefreshCw, CircleCheck, CircleAlert, LoaderCircle, Settings } from 'lucide-react';

interface InstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type BuildState = 'idle' | 'loading' | 'success' | 'failed' | 'in_progress' | 'unknown';

interface ApkBuildStatus {
  state: BuildState;
  message: string;
  lastRunHtmlUrl?: string;
  lastRunAt?: string;
  releasePublishedAt?: string;
  runNumber?: number;
}

export const InstallModal: React.FC<InstallModalProps> = ({ isOpen, onClose }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(false);
  const [apkStatus, setApkStatus] = useState<string>('');
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Helper to ensure valid repo slug and avoid placeholders like expesne_app_git_repo_id
  const sanitizeRepoSlug = (input?: any): string => {
    if (!input || typeof input !== 'string') return 'kalaikutty/remix_expense_tracker';
    let trimmed = input.trim();
    // Strip protocol and domain if user pasted full URL
    trimmed = trimmed.replace(/^https?:\/\/(www\.)?github\.com\//i, '');
    trimmed = trimmed.replace(/^github\.com\//i, '');
    trimmed = trimmed.replace(/\.git$/i, '');
    trimmed = trimmed.replace(/^\/+|\/+$/g, '');
    trimmed = trimmed.split('?')[0].split('#')[0];

    // Filter out dummy template placeholders
    if (
      trimmed === '' ||
      trimmed.includes('placeholder') ||
      trimmed.includes('git_repo_id_placeholder') ||
      trimmed.includes('expense_app_down_url_id') ||
      trimmed.includes('${') ||
      trimmed.includes('<')
    ) {
      return 'kalaikutty/remix_expense_tracker';
    }

    if (!trimmed.includes('/')) {
      return `kalaikutty/${trimmed}`;
    }

    return trimmed;
  };

  // Editable Repo state
  const [repoSlug, setRepoSlug] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('expensetracker_github_repo');
      return sanitizeRepoSlug(saved || import.meta.env.VITE_GITHUB_REPO);
    } catch {
      return sanitizeRepoSlug(import.meta.env.VITE_GITHUB_REPO);
    }
  });

  const [buildStatus, setBuildStatus] = useState<ApkBuildStatus>({
    state: 'idle',
    message: 'Build status not checked yet.',
  });

  const cleanRepo = sanitizeRepoSlug(repoSlug);
  const workflowUrl = `https://github.com/${cleanRepo}/actions/workflows/android-apk.yml`;

  const handleSaveRepoSettings = (newSlug: string) => {
    const validSlug = sanitizeRepoSlug(newSlug);
    setRepoSlug(validSlug);
    try {
      localStorage.setItem('expensetracker_github_repo', validSlug);
    } catch {
      // ignore localStorage errors
    }
    setShowSettings(false);
    fetchApkBuildStatus(validSlug);
  };

  const [resolvedApkUrl, setResolvedApkUrl] = useState<string>('');

  const formatDateTime = (value?: string) => {
    if (!value) return null;
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  const fetchApkBuildStatus = async (overrideRepo?: unknown) => {
    const repoStr = typeof overrideRepo === 'string' ? overrideRepo : undefined;
    const activeRepo = sanitizeRepoSlug(repoStr || repoSlug);
    setBuildStatus({
      state: 'loading',
      message: `Checking latest APK build status for "${activeRepo}"...`,
    });

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
    };

    try {
      let workflowResp = await fetch(
        `https://api.github.com/repos/${activeRepo}/actions/workflows/android-apk.yml/runs?per_page=5`,
        { headers }
      ).catch(() => null);

      if (!workflowResp || !workflowResp.ok) {
        const fallbackRunsResp = await fetch(
          `https://api.github.com/repos/${activeRepo}/actions/runs?per_page=5`,
          { headers }
        ).catch(() => null);
        if (fallbackRunsResp && fallbackRunsResp.ok) {
          workflowResp = fallbackRunsResp;
        }
      }

      let lastRun: any = null;
      let state: BuildState = 'unknown';
      let message = '';
      let runNumber: number | undefined;

      if (!workflowResp || !workflowResp.ok) {
        if (workflowResp?.status === 404) {
          message = `Repository "${activeRepo}" or workflow not found. Verify repository name in Repo Settings.`;
        } else {
          message = `Could not query GitHub Actions API for "${activeRepo}".`;
        }
      } else {
        const workflowData = await workflowResp.json();
        const runs = workflowData.workflow_runs || [];
        lastRun = runs[0];
        const latestSuccessRun = runs.find((r: any) => r.conclusion === 'success');
        runNumber = (latestSuccessRun || lastRun)?.run_number;

        if (!lastRun) {
          message = `No APK build runs recorded yet for "${activeRepo}".`;
        } else if (lastRun.status !== 'completed') {
          state = 'in_progress';
          message = `Build #${lastRun.run_number || ''} is currently ${lastRun.status}. Auto-refreshing...`;
        } else if (lastRun.conclusion === 'success') {
          state = 'success';
          message = `Latest APK build #${lastRun.run_number || ''} succeeded! File is ready in GitHub Actions artifacts.`;
        } else {
          state = 'failed';
          message = `Latest APK build failed (${lastRun.conclusion || 'failed'}). Check GitHub Actions workflow for details.`;
        }
      }

      let releasePublishedAt: string | undefined;
      const releaseResp = await fetch(
        `https://api.github.com/repos/${activeRepo}/releases/tags/apk-latest`,
        { headers }
      ).catch(() => null);

      if (releaseResp && releaseResp.ok) {
        const releaseData = await releaseResp.json();
        releasePublishedAt = releaseData.published_at || releaseData.created_at;
        const assets: any[] = releaseData.assets || [];
        // Look for expense_tracker_b<runNumber>.apk first, or any .apk asset
        const matchingAsset = assets.find((asset: any) =>
          typeof asset.name === 'string' &&
          runNumber &&
          asset.name.includes(`_${runNumber}.apk`)
        ) || assets.find((asset: any) =>
          typeof asset.name === 'string' && asset.name.toLowerCase().endsWith('.apk')
        );

        if (matchingAsset?.browser_download_url) {
          setResolvedApkUrl(matchingAsset.browser_download_url);
        } else if (runNumber) {
          setResolvedApkUrl(`https://github.com/${activeRepo}/releases/download/apk-latest/expense_tracker_b${runNumber}.apk`);
        }
      } else if (runNumber) {
        setResolvedApkUrl(`https://github.com/${activeRepo}/releases/download/apk-latest/expense_tracker_b${runNumber}.apk`);
      }

      setBuildStatus({
        state,
        message,
        lastRunHtmlUrl: lastRun?.html_url || `https://github.com/${activeRepo}/actions/workflows/android-apk.yml`,
        lastRunAt: lastRun?.updated_at || lastRun?.created_at,
        releasePublishedAt,
        runNumber,
      });
    } catch (error) {
      console.error('Failed to fetch APK build status:', error);
      setBuildStatus({
        state: 'unknown',
        message: `Could not connect to GitHub API for "${activeRepo}".`,
      });
    }
  };

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    fetchApkBuildStatus();

    // Auto-poll status every 2 minutes (120,000 ms) as requested
    const interval = setInterval(() => {
      fetchApkBuildStatus();
    }, 120000);

    return () => {
      clearInterval(interval);
    };
  }, [isOpen, cleanRepo]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const choiceResult = await deferredPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('PWA Install error:', err);
      }
    } else {
      alert(
        '📱 How to install on Android Mobile (WebAPK):\n\n' +
        '1. Tap the 3 dots (⋮) menu in Chrome at top-right.\n' +
        '2. Select "Install app" or "Add to Home screen".\n' +
        '3. Chrome will automatically package & install the official Android WebAPK on your phone!'
      );
    }
  };

  const runNumStr = buildStatus.runNumber ? `_b${buildStatus.runNumber}` : '';
  const downloadTargetUrl =
    resolvedApkUrl ||
    `https://github.com/${cleanRepo}/releases/download/apk-latest/expense_tracker${runNumStr}.apk`;

  const downloadFileName =
    downloadTargetUrl.split('/').pop()?.split('?')[0] || `expense_tracker${runNumStr || '-debug'}.apk`;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl max-w-xl w-full p-5 sm:p-6 shadow-2xl border border-slate-200 dark:border-slate-800 relative overflow-hidden flex flex-col max-h-[92vh]">
        {/* Background glow */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center space-x-3 mb-4 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-lg shadow-indigo-600/30">
            ₹
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-xl font-bold tracking-tight">Install Expense Tracker</h3>
              <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                Android APK & PWA
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Native Android Package & Standalone Web App
            </p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Option 1: Standalone PWA Installation Card */}
          <div className="bg-gradient-to-r from-indigo-500/10 via-slate-800/40 to-slate-800/40 border border-indigo-500/30 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-indigo-950 dark:text-indigo-100 flex items-center space-x-2">
                <Smartphone className="w-4 h-4 text-indigo-500" />
                <span>1. Install Standalone Web App (PWA)</span>
              </span>
              <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                Fast WebApp
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
              Installs Expense Tracker as a lightweight, fast standalone Progressive Web App directly to your home screen.
            </p>
            <button
              onClick={handleInstallClick}
              className="w-full flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-indigo-600/20 transition text-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{deferredPrompt ? 'Install Standalone Web App Now' : 'Add Web App to Home Screen'}</span>
            </button>
          </div>

          {/* Option 2: Native Android APK Package Download & GitHub Workflow */}
          <div className="bg-gradient-to-r from-emerald-500/10 via-slate-800/40 to-slate-800/40 border border-emerald-500/30 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm text-emerald-950 dark:text-emerald-100 flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-emerald-500" />
                <span>2. Download Android APK (.apk)</span>
              </span>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center space-x-1 underline cursor-pointer"
                title="Configure GitHub Repository"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Repo Settings</span>
              </button>
            </div>

            {/* Target Repo & Settings line */}
            <div className="mb-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="text-[11px]">
                Repo: <strong className="text-slate-700 dark:text-slate-200 font-mono">{cleanRepo}</strong>
              </span>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center space-x-1 cursor-pointer"
                title="Configure GitHub Repository"
              >
                <Settings className="w-3 h-3" />
                <span>Change Repo</span>
              </button>
            </div>

            {/* Optional Settings Drawer */}
            {showSettings && (
              <div className="mb-3 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl space-y-2 text-xs border border-slate-200 dark:border-slate-700 animate-fadeIn">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    GitHub Repository (owner/repo):
                  </label>
                  <input
                    type="text"
                    value={repoSlug}
                    onChange={(e) => setRepoSlug(e.target.value)}
                    placeholder="e.g. owner/remix_expense_tracker"
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                  />
                </div>
                <button
                  onClick={() => handleSaveRepoSettings(repoSlug)}
                  className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 cursor-pointer"
                >
                  Save Settings
                </button>
              </div>
            )}

            {/* Status Card */}
            <div className="mb-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 p-3 text-xs space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                  {buildStatus.state === 'success' ? (
                    <CircleCheck className="w-4 h-4 text-emerald-500" />
                  ) : buildStatus.state === 'failed' ? (
                    <CircleAlert className="w-4 h-4 text-rose-500" />
                  ) : buildStatus.state === 'loading' || buildStatus.state === 'in_progress' ? (
                    <LoaderCircle className="w-4 h-4 text-indigo-500 animate-spin" />
                  ) : (
                    <CircleAlert className="w-4 h-4 text-amber-500" />
                  )}
                  <span>APK Build Status</span>
                </div>
                <button
                  onClick={() => fetchApkBuildStatus()}
                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">{buildStatus.message}</p>

              {(buildStatus.releasePublishedAt || buildStatus.lastRunAt) && (
                <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                  <p className="text-xs font-bold flex items-center gap-1.5">
                    <CircleCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>
                      ✓ Latest Build APK Release:{' '}
                      {formatDateTime(buildStatus.releasePublishedAt || buildStatus.lastRunAt)}
                    </span>
                  </p>
                  {buildStatus.runNumber && (
                    <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 ml-5.5 mt-0.5 font-medium">
                      Artifact Package: expense_tracker_b{buildStatus.runNumber}.apk
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Download Option */}
            <div className="space-y-2.5">
              <a
                href={downloadTargetUrl}
                download={downloadFileName}
                target="_self"
                rel="noopener noreferrer"
                onClick={() => {
                  setApkStatus(`✓ Download started: ${downloadFileName}`);
                }}
                className="w-full flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-emerald-600/20 transition text-xs cursor-pointer"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>Download APK ({downloadFileName})</span>
              </a>
            </div>

            {apkStatus && (
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{apkStatus}</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="flex items-center space-x-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Verified Android Capacitor Package</span>
          </span>
          <button
            onClick={onClose}
            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

