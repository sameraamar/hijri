import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export default function InstallAppButton() {
  const { t } = useTranslation();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [installed, setInstalled] = useState(() => (typeof window === 'undefined' ? false : isStandalone()));

  const canShowIosHint = useMemo(
    () => typeof window !== 'undefined' && isIos() && !installed,
    [installed]
  );

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setShowIosHint(false);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  if (installed || (!installPrompt && !canShowIosHint)) return null;

  const onClick = async () => {
    if (installPrompt) {
      const prompt = installPrompt;
      setInstallPrompt(null);
      await prompt.prompt();
      await prompt.userChoice.catch(() => null);
      return;
    }
    setShowIosHint((value) => !value);
  };

  return (
    <span className="relative inline-flex flex-col items-center">
      <button
        type="button"
        onClick={onClick}
        className="py-1 hover:text-slate-700 dark:text-slate-200 dark:hover:text-slate-200"
      >
        {t('app.install.label')}
      </button>
      {showIosHint ? (
        <span className="absolute bottom-full mb-2 w-56 rounded-md border border-slate-200 bg-white p-2 text-center text-[11px] leading-relaxed text-slate-600 shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {t('app.install.iosHint')}
        </span>
      ) : null}
    </span>
  );
}