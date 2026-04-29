/**
 * Client-side iCal (RFC 5545) export of Hijri holidays.
 *
 * No server. Generates a VCALENDAR string from the holiday list and triggers
 * a Blob download. Each holiday becomes a single all-day VEVENT.
 */

import type { GregorianDate } from './dateMath';
import { pad2 } from './dateMath';

export type IcalHoliday = {
  /** Stable id used for the VEVENT UID. */
  id: string;
  /** Display name for the SUMMARY field. */
  name: string;
  /** All-day Gregorian date for the event. */
  gregorian: GregorianDate;
  /** Optional explanatory text appended to DESCRIPTION. */
  description?: string;
};

const PRODID = '-//hijri-calendar//github.com/sameraamar/hijri//EN';

function escapeIcsText(s: string): string {
  // RFC 5545 §3.3.11: escape \\, \, ;, , and CRLF.
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

function fmtDate(d: GregorianDate): string {
  return `${d.year}${pad2(d.month)}${pad2(d.day)}`;
}

function dtstamp(): string {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = pad2(now.getUTCMonth() + 1);
  const dd = pad2(now.getUTCDate());
  const hh = pad2(now.getUTCHours());
  const mi = pad2(now.getUTCMinutes());
  const ss = pad2(now.getUTCSeconds());
  return `${yyyy}${mm}${dd}T${hh}${mi}${ss}Z`;
}

/**
 * Build the .ics calendar text. Pure function; no DOM access.
 */
export function buildIcal(holidays: IcalHoliday[], calendarName: string): string {
  const stamp = dtstamp();
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:${PRODID}`,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`
  ];

  for (const h of holidays) {
    const start = h.gregorian;
    const endDate = new Date(Date.UTC(start.year, start.month - 1, start.day, 0, 0, 0));
    endDate.setUTCDate(endDate.getUTCDate() + 1);
    const end: GregorianDate = {
      year: endDate.getUTCFullYear(),
      month: endDate.getUTCMonth() + 1,
      day: endDate.getUTCDate()
    };

    lines.push(
      'BEGIN:VEVENT',
      `UID:${h.id}-${fmtDate(start)}@hijri.local`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${fmtDate(start)}`,
      `DTEND;VALUE=DATE:${fmtDate(end)}`,
      `SUMMARY:${escapeIcsText(h.name)}`,
      `DESCRIPTION:${escapeIcsText(h.description ?? '')}`,
      'TRANSP:TRANSPARENT',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  // RFC 5545 requires CRLF line endings.
  return lines.join('\r\n') + '\r\n';
}

/** Trigger a Blob download in the browser. */
export function downloadIcal(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Revoke after a tick to give the browser time to begin the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
