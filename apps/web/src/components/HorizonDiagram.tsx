import { useEffect, useState } from 'react';

/**
 * Compact "horizon diagram" showing the Sun and Moon at local sunset.
 *
 * Layout: a half-dome (semicircle) representing the visible sky from West
 * (left endpoint of the diameter, where the Sun is setting) to East (right
 * endpoint). The Moon sits on the dome at an angular position derived from
 * its synodic phase (0 = new, 0.5 = full, 1 = next new):
 *
 *   - phase 0      → at the Sun (conjunction, west horizon)
 *   - phase 0.25   → zenith                     (first quarter)
 *   - phase 0.5    → east horizon               (full moon, just rising)
 *   - phase 0.75   → nadir, below the horizon   (last quarter — under-dome)
 *
 * The dashed arc connecting the Sun and Moon visualises the angular
 * separation: it bulges UP across the sky when waxing, and DOWN under the
 * horizon when waning, so the visible angle naturally reads acute for
 * crescents and obtuse near full moon.
 *
 * Click (or hover) the diagram to expand it into a modal at a larger size,
 * with the Gregorian / Hijri dates above when the caller passes them.
 */

interface HorizonDiagramProps {
  /** Moon altitude in degrees above the horizon at sunset (can be negative). */
  moonAltitudeDeg: number;
  /** Arc of Vision (ARCV) or elongation in degrees – shown as label. */
  arcDeg?: number;
  /** Lag time in minutes (moonset − sunset). */
  lagMinutes?: number;
  /** Synodic phase fraction 0..1 (0 = new, 0.5 = full). */
  phase?: number;
  /** Optional Gregorian date label, only shown in the expanded modal. */
  gregorianDateStr?: string;
  /** Optional Hijri date label, only shown in the expanded modal. */
  hijriDateStr?: string;
  /** When false, the click-to-expand wrapper is omitted (used inside the modal). */
  interactive?: boolean;
  width?: number;
  height?: number;
  className?: string;
}

export default function HorizonDiagram({
  moonAltitudeDeg,
  arcDeg,
  lagMinutes,
  phase,
  gregorianDateStr,
  hijriDateStr,
  interactive = true,
  width = 160,
  height = 100,
  className,
}: HorizonDiagramProps) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [expanded]);

  // Resolve a phase fraction 0..1. Prefer the synodic phase passed in;
  // otherwise estimate from the geocentric elongation, defaulting to waxing.
  const resolvedPhase = (() => {
    if (typeof phase === 'number' && Number.isFinite(phase)) {
      return ((phase % 1) + 1) % 1;
    }
    if (typeof arcDeg === 'number' && Number.isFinite(arcDeg)) {
      return Math.min(0.5, Math.max(0, arcDeg / 360));
    }
    return 0;
  })();

  const isWaxingHalf = resolvedPhase <= 0.5;

  function renderSvg(w: number, h: number) {
    const padTop = h < 140 ? 16 : 22;
    const padBottom = h < 140 ? 16 : 22;
    const padHoriz = 14;
    const horizonY = h * 0.55;
    const cx = w / 2;

    const rx = Math.max(8, (w - padHoriz * 2) / 2);
    const ryUp = Math.max(8, horizonY - padTop);
    const ryDown = Math.max(8, h - horizonY - padBottom);

    const sunX = cx - rx;
    const sunY = horizonY;

    // Angle on the dome (math convention): π = sun position, 0 = east horizon,
    // -π/2 = nadir, etc.
    const moonAngleRad = Math.PI - 2 * Math.PI * resolvedPhase;
    const cosA = Math.cos(moonAngleRad);
    const sinA = Math.sin(moonAngleRad);
    const moonX = cx + rx * cosA;
    const moonY = sinA >= 0
      ? horizonY - ryUp * sinA
      : horizonY - ryDown * sinA;

    const moonAboveHorizon = moonY <= horizonY + 0.5;
    const sunR = Math.max(5, Math.round(w / 23));
    const moonR = Math.max(4, Math.round(w / 32));
    const moonFill = moonAboveHorizon ? '#fbbf24' : '#94a3b8';

    // Sun→Moon arc on the dome, matching the half (sky for waxing, ground for
    // waning) so the arc and moon position are consistent. This is the *only*
    // dome path drawn — there are no separate "guide" arcs that could
    // contradict the elongation arc visually.
    const ry = isWaxingHalf ? ryUp : ryDown;
    const sweep = isWaxingHalf ? 0 : 1; // 0 = arc bulges up, 1 = arc bulges down
    const arcPath = `M ${sunX} ${sunY} A ${rx} ${ry} 0 0 ${sweep} ${moonX} ${moonY}`;

    const fontBase = h < 140 ? 11 : 14;

    return (
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className={className}
        aria-label={`Horizon diagram: moon at ${moonAltitudeDeg.toFixed(1)}°`}
      >
        <defs>
          <linearGradient id="hd-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e3a5f" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
        </defs>
        <rect x={0} y={0} width={w} height={horizonY} fill="url(#hd-sky)" rx={4} />
        <rect x={0} y={horizonY} width={w} height={h - horizonY} fill="#1e293b" rx={0} />

        {/* Horizon line + W / E orientation labels — placed at the FAR edges
            of the box at horizon height (vertical centre), pointing outward
            away from the diagram, so they never overlap the Sun or Moon. */}
        <line x1={0} y1={horizonY} x2={w} y2={horizonY} stroke="#64748b" strokeWidth={1} strokeDasharray="4 2" />
        <text x={2} y={horizonY - 4} fill="#94a3b8" fontSize={fontBase - 1} fontFamily="system-ui" fontWeight="600">
          ← W
        </text>
        <text x={w - 2} y={horizonY - 4} textAnchor="end" fill="#94a3b8" fontSize={fontBase - 1} fontFamily="system-ui" fontWeight="600">
          E →
        </text>

        {/* The Sun→Moon arc — the only dome path in the diagram, so it can't
            visually contradict any "guide" arc going the other way. */}
        <path d={arcPath} fill="none" stroke="#cbd5e1" strokeWidth={1} strokeDasharray="3 2" opacity={0.85} />

        {/* Sun */}
        <circle cx={sunX} cy={sunY} r={sunR} fill="#f97316" opacity={0.85} />
        <text x={sunX} y={sunY + sunR + fontBase + 1} textAnchor="middle" fill="#f97316" fontSize={fontBase} fontFamily="system-ui">☉</text>

        {/* Moon */}
        <circle cx={moonX} cy={moonY} r={moonR} fill={moonFill} opacity={moonAboveHorizon ? 1 : 0.55} />
        <text
          x={moonX}
          y={moonAboveHorizon ? moonY - moonR - 4 : moonY + moonR + fontBase}
          textAnchor="middle"
          fill="#e2e8f0"
          fontSize={fontBase + 1}
          fontFamily="system-ui"
        >
          ☽
        </text>

        {/* Moon altitude label */}
        {(() => {
          const text = `alt ${moonAltitudeDeg.toFixed(1)}°`;
          const approxW = text.length * (fontBase * 0.55) + 4;
          const labelX = Math.min(moonX + moonR + 4 + approxW, w - 4);
          const labelY = moonAboveHorizon
            ? (moonAltitudeDeg > 12 ? moonY + moonR + fontBase + 2 : moonY + 4)
            : moonY - moonR - 4;
          return (
            <text x={labelX} y={labelY} textAnchor="end" fill="#fbbf24" fontSize={fontBase} fontFamily="system-ui" fontWeight="600">
              <title>Moon altitude above horizon at sunset</title>
              {text}
            </text>
          );
        })()}

        {/* Elongation label, anchored on whichever half of the dome the arc traces. */}
        {typeof arcDeg === 'number' && (() => {
          const midAngle = (Math.PI + moonAngleRad) / 2;
          const labelOffset = 6;
          const apexX = cx + (rx + labelOffset) * Math.cos(midAngle);
          const apexYRaw = horizonY - (ry + labelOffset) * Math.sin(midAngle);
          const labelX = Math.min(w - 4, Math.max(20, apexX));
          const labelY = isWaxingHalf
            ? Math.max(13, apexYRaw)
            : Math.min(h - padBottom - 2, apexYRaw);
          return (
            <text x={labelX} y={labelY} textAnchor="middle" fill="#f1f5f9" fontSize={fontBase} fontFamily="system-ui" fontWeight="bold">
              <title>Sun–Moon elongation (0° at conjunction, ~180° at full moon)</title>
              Δ {arcDeg.toFixed(1)}°
            </text>
          );
        })()}

        {/* Lag label at bottom */}
        {typeof lagMinutes === 'number' && (
          <text x={w / 2} y={h - 4} textAnchor="middle" fill="#cbd5e1" fontSize={fontBase} fontFamily="system-ui">
            lag {Math.round(lagMinutes)} min
          </text>
        )}
      </svg>
    );
  }

  const inlineSvg = renderSvg(width, height);

  return (
    <>
      {interactive ? (
        <button
          type="button"
          onClick={(e) => {
            // Stop propagation so callers that wrap the diagram in a clickable
            // row (e.g. DetailsPage's expandable day card) don't toggle when
            // the user is just trying to enlarge the diagram.
            e.stopPropagation();
            setExpanded(true);
          }}
          className="cursor-zoom-in border-0 bg-transparent p-0 leading-none hover:opacity-95"
          aria-label="Expand horizon diagram"
          title="Click to enlarge"
        >
          {inlineSvg}
        </button>
      ) : (
        inlineSvg
      )}

      {expanded && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          onClick={() => setExpanded(false)}
        >
          <div
            className="max-w-full rounded-lg bg-slate-900 p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {(gregorianDateStr || hijriDateStr) && (
              <div className="mb-3 text-center text-slate-100">
                {hijriDateStr && <div className="text-lg font-semibold">{hijriDateStr}</div>}
                {gregorianDateStr && <div className="text-sm text-slate-300">{gregorianDateStr}</div>}
              </div>
            )}
            <div className="flex justify-center">
              {renderSvg(440, 300)}
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="mt-3 w-full rounded-md bg-slate-700 px-3 py-1.5 text-sm font-medium text-slate-100 hover:bg-slate-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
