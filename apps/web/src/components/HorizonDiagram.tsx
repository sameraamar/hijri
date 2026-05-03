import { useEffect, useState } from 'react';

interface HorizonDiagramProps {
  moonAltitudeDeg: number;
  arcDeg?: number;
  lagMinutes?: number;
  phase?: number;
  gregorianDateStr?: string;
  hijriDateStr?: string;
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
  height = 160,
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

  const resolvedPhase = (() => {
    if (typeof phase === 'number' && Number.isFinite(phase)) {
      return ((phase % 1) + 1) % 1;
    }
    if (typeof arcDeg === 'number' && Number.isFinite(arcDeg)) {
      return Math.min(0.5, Math.max(0, arcDeg / 360));
    }
    return 0;
  })();

  function renderSvg(w: number, h: number) {
    const padTop = h < 140 ? 14 : 20;
    const padBottom = h < 140 ? 14 : 20;
    const padHoriz = 16;
    const horizonY = h * 0.5;
    const cx = w / 2;

    // True circular dome: pick a single radius that fits inside the box on
    // every side so both halves of the ellipse degenerate into a circle.
    const maxRx = (w - padHoriz * 2) / 2;
    const maxRyUp = horizonY - padTop;
    const maxRyDown = h - horizonY - padBottom;
    const r = Math.max(8, Math.min(maxRx, maxRyUp, maxRyDown));
    const rx = r;
    const ryUp = r;
    const ryDown = r;

    const sunX = cx - rx;
    const sunY = horizonY;

    const moonAngleRad = Math.PI - 2 * Math.PI * resolvedPhase;
    const cosA = Math.cos(moonAngleRad);
    const sinA = Math.sin(moonAngleRad);

    const moonX = cx + rx * cosA;
    const moonY = sinA >= 0
      ? horizonY - ryUp * sinA
      : horizonY - ryDown * sinA;

    const moonAboveHorizon = moonY <= horizonY + 0.5;
    const sunR = Math.max(5, Math.round(w / 24));
    const moonR = Math.max(4, Math.round(w / 34));
    const moonFill = '#fbbf24';
    const moonDark = '#1e293b';

    const moonRotDeg = (Math.atan2(sunY - moonY, sunX - moonX) * 180) / Math.PI;
    const cosPh = Math.cos(2 * Math.PI * resolvedPhase);
    const termRx = moonR * Math.abs(cosPh);
    const termSweep = cosPh > 0 ? 0 : 1;
    const litPath = `M 0 ${-moonR} A ${moonR} ${moonR} 0 0 1 0 ${moonR} A ${termRx} ${moonR} 0 0 ${termSweep} 0 ${-moonR} Z`;

    // Arc from the Sun's position to the Moon's, always swept in the same
    // direction (clockwise in screen coords) so it visually grows with
    // elongation. For waxing phases (p ≤ 0.5) it's a single arc along the
    // upper dome; for waning (p > 0.5) it crosses the east horizon and
    // continues along the under-horizon ellipse, so the path can wrap more
    // than half the ellipse just like the moon does over a synodic month.
    const arcPath = resolvedPhase <= 0.5
      ? `M ${sunX} ${sunY} A ${rx} ${ryUp} 0 0 1 ${moonX} ${moonY}`
      : `M ${sunX} ${sunY} A ${rx} ${ryUp} 0 0 1 ${cx + rx} ${horizonY} A ${rx} ${ryDown} 0 0 1 ${moonX} ${moonY}`;

    const fontBase = h < 140 ? 11 : 14;

    return (
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className={className}
        style={{ overflow: 'visible' }}
        aria-label={`Horizon diagram: moon at ${moonAltitudeDeg.toFixed(1)}°`}
      >
        <defs>
          <linearGradient id="hd-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e3a5f" />
            <stop offset="100%" stopColor="#475569" />
          </linearGradient>
        </defs>

        <rect x={0} y={0} width={w} height={horizonY} fill="url(#hd-sky)" rx={4} />
        <rect x={0} y={horizonY} width={w} height={h - horizonY} fill="#1e293b" />

        <line x1={0} y1={horizonY} x2={w} y2={horizonY} stroke="#94a3b8" strokeWidth={1} strokeDasharray="4 2" />
        <text x={4} y={horizonY - 6} fill="#e2e8f0" fontSize={fontBase} fontFamily="system-ui" fontWeight="700">W</text>
        <text x={w - 4} y={horizonY - 6} textAnchor="end" fill="#e2e8f0" fontSize={fontBase} fontFamily="system-ui" fontWeight="700">E</text>

        <path d={arcPath} fill="none" stroke="#f1f5f9" strokeWidth={1.5} strokeDasharray="3 3" opacity={0.85} />

        {/* Sun */}
        <circle cx={sunX} cy={sunY} r={sunR * 1.5} fill="#f97316" opacity={0.2} />
        <circle cx={sunX} cy={sunY} r={sunR} fill="#f97316" />

        {/* Moon — phase-shaped, lit limb facing the Sun */}
        <g transform={`translate(${moonX} ${moonY}) rotate(${moonRotDeg})`}>
          <circle r={moonR} fill={moonDark} />
          <path d={litPath} fill={moonFill} />
          <circle r={moonR} fill="none" stroke="#ffffff" strokeWidth={0.5} opacity={0.3} />
        </g>

        {/* Moon altitude label */}
        <text
          x={moonX > w * 0.7 ? moonX - moonR - 4 : moonX + moonR + 4}
          y={moonY > h * 0.8 ? moonY - 8 : moonY + 4}
          textAnchor={moonX > w * 0.7 ? 'end' : 'start'}
          fill={moonAboveHorizon ? '#fbbf24' : '#94a3b8'}
          fontSize={fontBase}
          fontFamily="system-ui"
          fontWeight="bold"
          stroke="#020617"
          strokeWidth={3}
          paintOrder="stroke"
        >
          <title>Moon altitude above horizon at sunset</title>
          {moonAltitudeDeg.toFixed(1)}°
        </text>

        {/* Elongation label — pinned to the top corner OPPOSITE the moon so
            the two never overlap when the moon is near zenith. */}
        {typeof arcDeg === 'number' && (() => {
          const onRight = moonX < cx;
          return (
            <text
              x={onRight ? w - 6 : 6}
              y={18}
              textAnchor={onRight ? 'end' : 'start'}
              fill="#e2e8f0"
              fontSize={fontBase}
              fontFamily="system-ui"
              fontWeight="bold"
              stroke="#020617"
              strokeWidth={3}
              paintOrder="stroke"
            >
              <title>Sun–Moon elongation (0° at conjunction, ~180° at full moon)</title>
              Δ {arcDeg.toFixed(1)}°
            </text>
          );
        })()}

        {/* Lag label, anchored to the bottom edge so it never collides with
            the moon when it sits below the horizon. */}
        {typeof lagMinutes === 'number' && (
          <text
            x={w / 2}
            y={h - 6}
            textAnchor="middle"
            fill="#e2e8f0"
            fontSize={fontBase}
            fontFamily="system-ui"
            fontWeight="600"
            stroke="#1e293b"
            strokeWidth={3}
            paintOrder="stroke"
          >
            lag {(() => {
              const totalMin = Math.round(lagMinutes);
              const sign = totalMin < 0 ? '-' : '';
              const abs = Math.abs(totalMin);
              const h = Math.floor(abs / 60);
              const m = abs % 60;
              return h > 0 ? `${sign}${h}h ${m}m` : `${sign}${m}m`;
            })()}
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
            e.stopPropagation();
            setExpanded(true);
          }}
          className="cursor-zoom-in border-0 bg-transparent p-0 leading-none transition-transform hover:scale-[1.02]"
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setExpanded(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-950 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {(gregorianDateStr || hijriDateStr) && (
              <div className="mb-6 text-center">
                {hijriDateStr && <div className="mb-1 text-2xl font-bold text-white">{hijriDateStr}</div>}
                {gregorianDateStr && <div className="font-medium text-slate-400">{gregorianDateStr}</div>}
              </div>
            )}

            <div className="flex justify-center rounded-lg border border-slate-800/50 bg-slate-900/50 p-4">
              {renderSvg(420, 420)}
            </div>

            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="mt-6 w-full rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
