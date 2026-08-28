export const RELEASES = [
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