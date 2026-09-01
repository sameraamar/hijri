import { useTranslation } from 'react-i18next';

const VIDEO_IDS: Record<string, string> = {
  en: 'V5Z9aWyo75g',
  ar: 'NYtJvV2tizg',
  tr: 'hBuK7z1QrR8',
  fr: 'ut_rkYxiTnc',
  id: 'QHfcV-iG8lg',
  ur: '68a07Zvh538'
};

export default function YouTubeWalkthrough({ autoPlay = false }: { autoPlay?: boolean }) {
  const { t, i18n } = useTranslation();
  const language = (i18n.resolvedLanguage ?? i18n.language ?? 'en').split('-')[0];
  const videoId = VIDEO_IDS[language] ?? VIDEO_IDS.en;
  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1'
  });

  if (autoPlay) params.set('autoplay', '1');

  return (
    <div className="aspect-video overflow-hidden rounded-xl border border-slate-200 bg-black shadow-sm dark:border-slate-700">
      <iframe
        key={videoId}
        src={`https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`}
        title={t('home.walkthroughTitle')}
        className="h-full w-full"
        loading={autoPlay ? 'eager' : 'lazy'}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />
    </div>
  );
}
