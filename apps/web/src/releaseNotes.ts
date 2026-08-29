export const RELEASES = [
  {
    version: '1.3.1',
    date: '2026-08-29',
    changeKeys: [
      'releaseNotes.versions.v1_3_1.horizonDiagram',
      'releaseNotes.versions.v1_3_1.dayPopupOrder',
      'releaseNotes.versions.v1_3_1.mobileToday',
      'releaseNotes.versions.v1_3_1.mobileCalendar',
    ],
  },
  {
    version: '1.3.0',
    date: '2026-08-29',
    changeKeys: [
      'releaseNotes.versions.v1_3_0.semantics',
      'releaseNotes.versions.v1_3_0.explain',
      'releaseNotes.versions.v1_3_0.pwa',
      'releaseNotes.versions.v1_3_0.navigation',
      'releaseNotes.versions.v1_3_0.validation',
      'releaseNotes.versions.v1_3_0.performance',
      'releaseNotes.versions.v1_3_0.seo',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-08-28',
    changeKeys: [
      'releaseNotes.versions.v1_2_0.adjust',
      'releaseNotes.versions.v1_2_0.copy',
      'releaseNotes.versions.v1_2_0.pwa',
      'releaseNotes.versions.v1_2_0.countdown',
      'releaseNotes.versions.v1_2_0.faq',
      'releaseNotes.versions.v1_2_0.embed',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-08-27',
    changeKeys: [
      'releaseNotes.versions.v1_1_0.analytics',
      'releaseNotes.versions.v1_1_0.calendarLabels',
      'releaseNotes.versions.v1_1_0.releaseNotesPage',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-08-27',
    changeKeys: [
      'releaseNotes.versions.v1_0_0.pages',
      'releaseNotes.versions.v1_0_0.methods',
      'releaseNotes.versions.v1_0_0.languages',
      'releaseNotes.versions.v1_0_0.visibility',
      'releaseNotes.versions.v1_0_0.calendar',
    ],
  },
] as const;

export const APP_VERSION = RELEASES[0].version;