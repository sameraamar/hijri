import { useTranslation } from 'react-i18next';
import {
  AltitudeDiagram,
  ElongationDiagram,
  MoonAgeDiagram,
  MoonsetLagDiagram,
} from '../components/KeyConceptsDiagrams';
import { likelihoodStyle, type VisibilityStatusKey } from '../components/likelihood';
import { usePageMeta } from '../hooks/usePageMeta';

type SignalLevel = Exclude<VisibilityStatusKey, 'unknown'>;

export default function MethodsPage() {
  const { t, i18n } = useTranslation();
  usePageMeta('seo.methods.title', 'seo.methods.description');

  const tocImplemented = [
    { id: 'civil', label: t('methods.civil.title') },
    { id: 'estimate', label: t('methods.estimate.title') },
    { id: 'mabims', label: t('methods.mabims.title') },
    { id: 'yallop', label: t('methods.yallop.title') },
    { id: 'odeh', label: t('methods.odeh.title') },
  ];

  const tocOther = [
    { id: 'ummalqura', label: t('methods.ummalqura.title') },
    { id: 'schaefer', label: t('methods.schaefer.title') },
    { id: 'sultan', label: t('methods.sultan.title') },
    { id: 'danjon', label: t('methods.danjon.title') },
    { id: 'babylonian', label: t('methods.babylonian.title') },
  ];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('methods.methodsHeading')}</h1>
        </div>
      </div>

      <div className="space-y-4">
        {/* ── Table of Contents ── */}
        <nav className="card p-4 text-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500 mb-2">{t('methods.toc')}</div>
          <div className="space-y-1">
            <div className="mt-1">
              <a href="#key-concepts" className="font-medium text-blue-600 hover:underline">{t('methods.keyConcepts.title')}</a>
            </div>
            <div className="font-medium text-slate-700 dark:text-slate-200 mt-2">{t('methods.implementedSection')}</div>
            <ul className="list-disc ps-5 space-y-0.5">
              {tocImplemented.map((item) => (
                <li key={item.id}><a href={`#${item.id}`} className="text-blue-600 hover:underline">{item.label}</a></li>
              ))}
            </ul>
            <div className="font-medium text-slate-700 dark:text-slate-200 mt-2">{t('methods.otherSection')}</div>
            <ul className="list-disc ps-5 space-y-0.5">
              {tocOther.map((item) => (
                <li key={item.id}><a href={`#${item.id}`} className="text-blue-600 hover:underline">{item.label}</a></li>
              ))}
            </ul>
            <div className="mt-2">
              <a href="#references" className="font-medium text-blue-600 hover:underline">{t('about.furtherReadingTitle')}</a>
            </div>
          </div>
        </nav>

        {/* ── Key Astronomical Concepts ── */}
        <section id="key-concepts" className="card scroll-mt-24">
          <div className="card-header">
            <div className="card-title">{t('methods.keyConcepts.title')}</div>
          </div>
          <div className="space-y-4 p-4 text-sm text-slate-700 dark:text-slate-200">
            <div>{t('methods.keyConcepts.intro')}</div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Moon Altitude */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2">{t('methods.keyConcepts.altitudeTitle')}</div>
                <AltitudeDiagram className="w-full max-w-[260px] mx-auto rounded" />
                <div className="mt-2 text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">{t('methods.keyConcepts.altitude')}</div>
                <a href={t('methods.keyConcepts.altitudeWiki')} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[11px] text-blue-600 hover:underline">
                  {t('methods.keyConcepts.wikiLink')} →
                </a>
              </div>

              {/* Elongation */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2">{t('methods.keyConcepts.elongationTitle')}</div>
                <ElongationDiagram className="w-full max-w-[260px] mx-auto rounded" />
                <div className="mt-2 text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">{t('methods.keyConcepts.elongation')}</div>
                <a href={t('methods.keyConcepts.elongationWiki')} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[11px] text-blue-600 hover:underline">
                  {t('methods.keyConcepts.wikiLink')} →
                </a>
              </div>

              {/* Moon Age */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2">{t('methods.keyConcepts.moonAgeTitle')}</div>
                <MoonAgeDiagram className="w-full max-w-[260px] mx-auto rounded" />
                <div className="mt-2 text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">{t('methods.keyConcepts.moonAge')}</div>
                <a href={t('methods.keyConcepts.moonAgeWiki')} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[11px] text-blue-600 hover:underline">
                  {t('methods.keyConcepts.wikiLink')} →
                </a>
              </div>

              {/* Moonset Lag */}
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-2">{t('methods.keyConcepts.lagTitle')}</div>
                <MoonsetLagDiagram className="w-full max-w-[260px] mx-auto rounded" />
                <div className="mt-2 text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">{t('methods.keyConcepts.lag')}</div>
                <a href={t('methods.keyConcepts.lagWiki')} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[11px] text-blue-600 hover:underline">
                  {t('methods.keyConcepts.wikiLink')} →
                </a>
              </div>
            </div>

            {/* ── Glossary of other terms ── */}
            <div className="mt-2">
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-3">{t('methods.keyConcepts.glossaryTitle')}</div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {([
                  { titleKey: 'conjunctionTitle', descKey: 'conjunction', wikiKey: 'conjunctionWiki' },
                  { titleKey: 'danjonTitle', descKey: 'danjon', wikiKey: 'danjonWiki' },
                  { titleKey: 'arcvTitle', descKey: 'arcv', wikiKey: 'arcvWiki' },
                  { titleKey: 'crescentWidthTitle', descKey: 'crescentWidth', wikiKey: undefined },
                  { titleKey: 'illuminationTitle', descKey: 'illumination', wikiKey: 'illuminationWiki' },
                  { titleKey: 'waxingWaningTitle', descKey: 'waxingWaning', wikiKey: 'waxingWaningWiki' },
                ] as const).map((item) => (
                  <div key={item.titleKey} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-3">
                    <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 mb-1">{t(`methods.keyConcepts.${item.titleKey}`)}</div>
                    <div className="text-[12px] leading-relaxed text-slate-600 dark:text-slate-300">{t(`methods.keyConcepts.${item.descKey}`)}</div>
                    {item.wikiKey ? (
                      <a href={t(`methods.keyConcepts.${item.wikiKey}`)} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[11px] text-blue-600 hover:underline">
                        {t('methods.keyConcepts.wikiLink')} →
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">{t('methods.implementedSection')}</h2>

        {/* ── Tabular / Civil ── */}
        <section id="civil" className="card scroll-mt-24">
          <div className="card-header">
            <div className="card-title">{t('methods.civil.title')}</div>
          </div>
          <div className="space-y-3 p-4 text-sm text-slate-700 dark:text-slate-200">
            <div>{t('methods.civil.summary')}</div>

            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t('methods.characteristics')}</div>
              <ul className="mt-2 list-disc space-y-1 ps-5">
                <li>{t('methods.civil.ch1')}</li>
                <li>{t('methods.civil.ch2')}</li>
                <li>{t('methods.civil.ch3')}</li>
              </ul>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t('methods.pros')}</div>
                <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-slate-700 dark:text-slate-200">
                  <li>{t('methods.civil.pro1')}</li>
                  <li>{t('methods.civil.pro2')}</li>
                </ul>
              </div>
              <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3">
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t('methods.cons')}</div>
                <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-slate-700 dark:text-slate-200">
                  <li>{t('methods.civil.con1')}</li>
                  <li>{t('methods.civil.con2')}</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-slate-100 dark:border-slate-700 pt-3 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
              <span>{t('methods.references')}:</span>
              <a href="https://en.wikipedia.org/wiki/Tabular_Islamic_calendar" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Wikipedia: Tabular Islamic calendar</a>
              <span>•</span>
              <span>Reingold &amp; Dershowitz, <em>Calendrical Calculations</em></span>
              <span>•</span>
              <span>{t('methods.civil.impl')}</span>
            </div>
          </div>
        </section>



        {/* ── Geometric / Estimate ── */}
        <section id="estimate" className="card scroll-mt-24">
          <div className="card-header">
            <div className="card-title">{t('methods.estimate.title')}</div>
          </div>
          <div className="space-y-4 p-4 text-sm text-slate-700 dark:text-slate-200">
            <div>{t('methods.estimate.summary')}</div>

            {/* Input variables — moved to top */}
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t('methods.estimate.inputsTitle')}</div>
              <ul className="mt-2 list-disc space-y-1 ps-5 text-slate-600 dark:text-slate-300">
                <li>{t('methods.estimate.input1')}</li>
                <li>{t('methods.estimate.input2')}</li>
                <li>{t('methods.estimate.input3')}</li>
                <li>{t('methods.estimate.input4')}</li>
              </ul>
            </div>

            {/* How it works — step by step */}
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t('methods.estimate.howItWorksTitle')}</div>
              <div className="mt-2 space-y-3">
                {([1, 2, 3, 4, 5] as const).map((n) => (
                  <div key={n}>
                    <div className="font-medium text-slate-800 dark:text-slate-100">
                      {t(`methods.estimate.step${n}title`)}
                    </div>
                    <div className="mt-0.5 ps-3 text-slate-600 dark:text-slate-300">
                      {n === 3 ? (
                        <>
                          <div>{t(`methods.estimate.step${n}`)}</div>
                          <div className="mt-1 text-center font-mono text-slate-800 dark:text-slate-100">
                            {i18n.language === 'ar' ? 'المؤشر' : 'Score'} = 0.35 × s<sub>h</sub> + 0.35 × s<sub>Δ</sub> + 0.20 × s<sub>A</sub> + 0.10 × s<sub>L</sub>
                          </div>
                        </>
                      ) : (
                        t(`methods.estimate.step${n}`)
                      )}
                    </div>
                    {n === 2 && (
                      <div className="mt-2 overflow-x-auto ps-3">
                        <table className="min-w-full text-xs border border-slate-200 dark:border-slate-700 rounded">
                          <thead>
                            <tr className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200">
                              <th className="px-2 py-1 text-start font-semibold">{t('methods.estimate.step2colVar')}</th>
                              <th className="px-2 py-1 text-center font-semibold">{t('methods.estimate.step2colMin')}</th>
                              <th className="px-2 py-1 text-center font-semibold">{t('methods.estimate.step2colMax')}</th>
                              <th className="px-2 py-1 text-start font-semibold">{t('methods.estimate.step2colFormula')}</th>
                              <th className="px-2 py-1 text-center font-semibold">{t('methods.estimate.step2colWeight')}</th>
                              <th className="px-2 py-1 text-start font-semibold">{t('methods.estimate.step2colDesc')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {([
                              { v: 'h', desc: 'step2hDesc', min: '0°', max: '10°', low: '0', high: '10', w: '35%' },
                              { v: 'Δ', desc: 'step2elongDesc', min: '6°', max: '15°', low: '6', high: '15', w: '35%' },
                              { v: 'A', desc: 'step2ageDesc', min: '12 h', max: '24 h', low: '12', high: '24', w: '20%' },
                              { v: 'L', desc: 'step2lagDesc', min: '0 min', max: '60 min', low: '0', high: '60', w: '10%' },
                            ] as const).map((r) => (
                              <tr key={r.v} className="hover:bg-slate-50 dark:hover:bg-slate-800 dark:bg-slate-800 align-top">
                                <td className="px-2 py-1 font-mono font-bold text-indigo-700">{r.v}</td>
                                <td className="px-2 py-1 text-center font-mono">{r.min}</td>
                                <td className="px-2 py-1 text-center font-mono">{r.max}</td>
                                <td className="px-2 py-1 font-mono text-slate-800 dark:text-slate-100 whitespace-nowrap">s<sub>{r.v}</sub> = ({r.v} − {r.low}) / ({r.high} − {r.low})</td>
                                <td className="px-2 py-1 text-center font-semibold">{r.w}</td>
                                <td className="px-2 py-1 text-slate-500 dark:text-slate-400 dark:text-slate-500">{t(`methods.estimate.${r.desc}`)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    {n === 4 && (
                      <ul className="mt-1 list-disc space-y-1 ps-8 text-slate-600 dark:text-slate-300">
                        <li>{t('methods.estimate.step4a')}</li>
                        <li>{t('methods.estimate.step4b')}</li>
                        <li>{t('methods.estimate.step4c')}</li>
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Exclusivity rule */}
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t('methods.estimate.exclusivityTitle')}</div>
              <div className="mt-1 ps-3 text-slate-600 dark:text-slate-300">{t('methods.estimate.exclusivity')}</div>
            </div>

            {/* Worked examples */}
            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t('methods.estimate.examplesTitle')}</div>
              {([1, 2] as const).map((ex) => (
                <div key={ex} className="mt-3 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3">
                  <div className="text-xs font-semibold text-slate-800 dark:text-slate-100 mb-2">{t(`methods.estimate.ex${ex}title`)}</div>
                  <table className="text-xs font-mono w-full">
                    <tbody>
                      {/* Raw values */}
                      <tr><td colSpan={5} className="pb-1 text-slate-500 dark:text-slate-400 dark:text-slate-500 font-sans font-semibold">{t('methods.estimate.exRawValues')}</td></tr>
                      {(['h', 'Δ', 'A', 'L'] as const).map((v) => (
                        <tr key={v} className="text-slate-700 dark:text-slate-200">
                          <td className="pe-2 py-0.5 font-bold text-indigo-700">{v}</td>
                          <td className="px-1 py-0.5">=</td>
                          <td className="px-2 py-0.5">{t(`methods.estimate.ex${ex}${v}`)}</td>
                        </tr>
                      ))}
                      {/* Normalized scores */}
                      <tr><td colSpan={5} className="pt-2 pb-1 text-slate-500 dark:text-slate-400 dark:text-slate-500 font-sans font-semibold">{t('methods.estimate.exNormalized')}</td></tr>
                      {(['h', 'Δ', 'A', 'L'] as const).map((v) => (
                        <tr key={v} className="text-emerald-700">
                          <td className="pe-2 py-0.5">s<sub>{v}</sub></td>
                          <td className="px-1 py-0.5">=</td>
                          <td className="px-2 py-0.5">{t(`methods.estimate.ex${ex}s${v}`)}</td>
                        </tr>
                      ))}
                      {/* Final score */}
                      <tr><td colSpan={5} className="pt-2 pb-1 text-slate-500 dark:text-slate-400 dark:text-slate-500 font-sans font-semibold">{t('methods.estimate.exFinalScore')}</td></tr>
                      <tr className="text-slate-800 dark:text-slate-100 font-semibold">
                        <td className="pe-2 py-0.5">{i18n.language === 'ar' ? 'المؤشر' : 'Score'}</td>
                        <td className="px-1 py-0.5">=</td>
                        <td className="px-2 py-0.5">{t(`methods.estimate.ex${ex}score`)}</td>
                      </tr>
                      <tr className="text-slate-800 dark:text-slate-100 font-semibold">
                        <td className="pe-2 py-0.5">{i18n.language === 'ar' ? 'التصنيف' : 'Label'}</td>
                        <td className="px-1 py-0.5">=</td>
                        <td className="px-2 py-0.5">{t(`methods.estimate.ex${ex}label`)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            <div className="text-xs italic text-slate-500 dark:text-slate-400 dark:text-slate-500">{t('methods.estimate.impl')}</div>

            <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-600 dark:text-slate-300">
              {t('methods.estimate.note')}
            </div>

            <div className="flex flex-wrap gap-3 border-t border-slate-100 dark:border-slate-700 pt-3 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
              <span>{t('methods.references')}:</span>
              <a href="https://en.wikipedia.org/wiki/New_moon" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Wikipedia: New moon</a>
              <span>•</span>
              <a href="https://www.researchgate.net/publication/225099773_New_Criterion_for_Lunar_Crescent_Visibility" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Odeh (2004)</a>
              <span>•</span>
              <a href="https://astronomycenter.net/pdf/yallop_1997.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Yallop (1997)</a>
              <span>•</span>
              <a href="https://astronomycenter.net/pdf/schaefer_1996.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Schaefer (1996)</a>
              <span>•</span>
              <a href="https://adsabs.harvard.edu/full/1988QJRAS..29..511S" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Schaefer (1988)</a>
              <span>•</span>
              <a href="https://github.com/cosinekitty/astronomy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">astronomy-engine</a>
            </div>
          </div>
        </section>

        {/* ── MABIMS ── */}
        <section id="mabims" className="card scroll-mt-24">
          <div className="card-header">
            <div className="card-title">{t('methods.mabims.title')}</div>
          </div>
          <div className="space-y-3 p-4 text-sm text-slate-700 dark:text-slate-200">
            <div>{t('methods.mabims.summary')}</div>

            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t('methods.characteristics')}</div>
              <ul className="mt-2 list-disc space-y-1 ps-5">
                <li>{t('methods.mabims.ch1')}</li>
                <li>{t('methods.mabims.ch2')}</li>
                <li>{t('methods.mabims.ch3')}</li>
                <li>{t('methods.mabims.ch4')}</li>
              </ul>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t('methods.pros')}</div>
                <ul className="mt-2 list-disc space-y-1 ps-5">
                  <li>{t('methods.mabims.pro1')}</li>
                  <li>{t('methods.mabims.pro2')}</li>
                </ul>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t('methods.cons')}</div>
                <ul className="mt-2 list-disc space-y-1 ps-5">
                  <li>{t('methods.mabims.con1')}</li>
                  <li>{t('methods.mabims.con2')}</li>
                </ul>
              </div>
            </div>

            <div className="rounded-md border border-slate-200 bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
              {t('methods.mabims.note')}
            </div>

            <div className="flex flex-wrap gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400 dark:text-slate-500">
              <span>{t('methods.references')}:</span>
              <a
                href="https://en.wikipedia.org/wiki/Lunar_calendar#Islamic_calendar"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline dark:text-blue-300"
              >
                Wikipedia: Islamic calendar
              </a>
              <span>•</span>
              <a
                href="https://moonsighting.com/criteria.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline dark:text-blue-300"
              >
                moonsighting.com — criteria
              </a>
            </div>
          </div>
        </section>

        {/* ── Yallop ── */}
        <section id="yallop" className="card scroll-mt-24">
          <div className="card-header">
            <div className="card-title">{t('methods.yallop.title')}</div>
          </div>
          <div className="space-y-3 p-4 text-sm text-slate-700 dark:text-slate-200">
            <div>{t('methods.yallop.summary')}</div>

            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t('methods.characteristics')}</div>
              <ul className="mt-2 list-disc space-y-1 ps-5">
                <li>{t('methods.yallop.ch1')}</li>
                <li>{t('methods.yallop.ch2')}</li>
                <li>{t('methods.yallop.ch3')}</li>
              </ul>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t('methods.yallop.zonesTitle')}</div>
              <div className="mt-2 space-y-2">
                {(
                  [
                    { level: 'high', textKey: 'methods.yallop.zoneA' },
                    { level: 'high', textKey: 'methods.yallop.zoneB' },
                    { level: 'medium', textKey: 'methods.yallop.zoneC' },
                    { level: 'medium', textKey: 'methods.yallop.zoneD' },
                    { level: 'veryLow', textKey: 'methods.yallop.zoneE' },
                    { level: 'noChance', textKey: 'methods.yallop.zoneF' }
                  ] as { level: SignalLevel; textKey: string }[]
                ).map((item, idx) => {
                  const style = likelihoodStyle(item.level);
                  return (
                    <div key={idx} className="flex flex-wrap items-start gap-2 text-sm">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${style.badgeClass}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${style.dotClass}`} />
                        {t(`probability.${item.level}`)}
                      </span>
                      <span>{t(item.textKey)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-600 dark:text-slate-300">
              {t('methods.yallop.note')}
            </div>

            <div className="flex flex-wrap gap-3 border-t border-slate-100 dark:border-slate-700 pt-3 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
              <span>{t('methods.references')}:</span>
              <a href="https://astronomycenter.net/pdf/yallop_1997.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Yallop (1997)</a>
              <span>•</span>
              <a href="https://en.wikipedia.org/wiki/New_moon" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Wikipedia: New moon</a>
              <span>•</span>
              <a href="https://github.com/cosinekitty/astronomy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">astronomy-engine</a>
            </div>
          </div>
        </section>

        {/* ── Odeh ── */}
        <section id="odeh" className="card scroll-mt-24">
          <div className="card-header">
            <div className="card-title">{t('methods.odeh.title')}</div>
          </div>
          <div className="space-y-3 p-4 text-sm text-slate-700 dark:text-slate-200">
            <div>{t('methods.odeh.summary')}</div>

            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t('methods.characteristics')}</div>
              <ul className="mt-2 list-disc space-y-1 ps-5">
                <li>{t('methods.odeh.ch1')}</li>
                <li>{t('methods.odeh.ch2')}</li>
                <li>{t('methods.odeh.ch3')}</li>
              </ul>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t('methods.odeh.zonesTitle')}</div>
              <div className="mt-2 space-y-2">
                {(
                  [
                    { level: 'high', textKey: 'methods.odeh.zoneA' },
                    { level: 'high', textKey: 'methods.odeh.zoneB' },
                    { level: 'medium', textKey: 'methods.odeh.zoneC' },
                    { level: 'noChance', textKey: 'methods.odeh.zoneD' }
                  ] as { level: SignalLevel; textKey: string }[]
                ).map((item, idx) => {
                  const style = likelihoodStyle(item.level);
                  return (
                    <div key={idx} className="flex flex-wrap items-start gap-2 text-sm">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${style.badgeClass}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${style.dotClass}`} />
                        {t(`probability.${item.level}`)}
                      </span>
                      <span>{t(item.textKey)}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-xs text-slate-600 dark:text-slate-300">
              {t('methods.odeh.note')}
            </div>

            <div className="flex flex-wrap gap-3 border-t border-slate-100 dark:border-slate-700 pt-3 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
              <span>{t('methods.references')}:</span>
              <a href="https://www.icoproject.org/pdf/2004Odeh.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Odeh (2004)</a>
              <span>•</span>
              <a href="https://github.com/cosinekitty/astronomy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">astronomy-engine</a>
            </div>
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">{t('methods.otherSection')}</h2>

        {/* ── Umm al-Qura ── */}
        <section id="ummalqura" className="card scroll-mt-24 opacity-80">
          <div className="card-header">
            <div className="card-title flex items-center gap-2">
              {t('methods.ummalqura.title')}
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 ring-1 ring-slate-200 dark:ring-slate-700">{t('methods.notImplemented')}</span>
            </div>
          </div>
          <div className="space-y-3 p-4 text-sm text-slate-700 dark:text-slate-200">
            <div>{t('methods.ummalqura.summary')}</div>
            <div className="flex flex-wrap gap-3 border-t border-slate-100 dark:border-slate-700 pt-3 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
              <span>{t('methods.references')}:</span>
              <a href="https://en.wikipedia.org/wiki/Umm_al-Qura_calendar" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Wikipedia: Umm al-Qura calendar</a>
            </div>
          </div>
        </section>

        {/* ── Schaefer ── */}
        <section id="schaefer" className="card scroll-mt-24 opacity-80">
          <div className="card-header">
            <div className="card-title flex items-center gap-2">
              {t('methods.schaefer.title')}
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 ring-1 ring-slate-200 dark:ring-slate-700">{t('methods.notImplemented')}</span>
            </div>
          </div>
          <div className="space-y-3 p-4 text-sm text-slate-700 dark:text-slate-200">
            <div>{t('methods.schaefer.summary')}</div>
            <div className="flex flex-wrap gap-3 border-t border-slate-100 dark:border-slate-700 pt-3 text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500">
              <span>{t('methods.references')}:</span>
              <a href="https://astronomycenter.net/pdf/schaefer_1996.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Schaefer (1996)</a>
              <span>•</span>
              <a href="https://adsabs.harvard.edu/full/1988QJRAS..29..511S" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Schaefer (1988)</a>
            </div>
          </div>
        </section>

        {/* ── Sultan / SAAO ── */}
        <section id="sultan" className="card scroll-mt-24 opacity-80">
          <div className="card-header">
            <div className="card-title flex items-center gap-2">
              {t('methods.sultan.title')}
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 ring-1 ring-slate-200 dark:ring-slate-700">{t('methods.notImplemented')}</span>
            </div>
          </div>
          <div className="space-y-3 p-4 text-sm text-slate-700 dark:text-slate-200">
            <div>{t('methods.sultan.summary')}</div>
          </div>
        </section>

        {/* ── Danjon Limit ── */}
        <section id="danjon" className="card scroll-mt-24 opacity-80">
          <div className="card-header">
            <div className="card-title flex items-center gap-2">
              {t('methods.danjon.title')}
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 ring-1 ring-slate-200 dark:ring-slate-700">{t('methods.notImplemented')}</span>
            </div>
          </div>
          <div className="space-y-3 p-4 text-sm text-slate-700 dark:text-slate-200">
            <div>{t('methods.danjon.summary')}</div>
          </div>
        </section>

        {/* ── Babylonian / Lag ── */}
        <section id="babylonian" className="card scroll-mt-24 opacity-80">
          <div className="card-header">
            <div className="card-title flex items-center gap-2">
              {t('methods.babylonian.title')}
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 dark:text-slate-500 ring-1 ring-slate-200 dark:ring-slate-700">{t('methods.notImplemented')}</span>
            </div>
          </div>
          <div className="space-y-3 p-4 text-sm text-slate-700 dark:text-slate-200">
            <div>{t('methods.babylonian.summary')}</div>
          </div>
        </section>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <h2 id="references" className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100 scroll-mt-24">{t('about.furtherReadingTitle')}</h2>
        <section className="card">
          <div className="p-4">
            <ul className="space-y-3 text-sm">
              <li className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Wikipedia</li>
              <li>
                <a href="https://en.wikipedia.org/wiki/Islamic_calendar" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Islamic calendar</a>
              </li>
              <li>
                <a href="https://en.wikipedia.org/wiki/Tabular_Islamic_calendar" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Tabular Islamic calendar</a>
              </li>
              <li>
                <a href="https://en.wikipedia.org/wiki/Umm_al-Qura_calendar" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Umm al-Qura calendar</a>
              </li>
              <li>
                <a href="https://en.wikipedia.org/wiki/New_moon" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">New moon</a>
              </li>
              <li>
                <a href="https://en.wikipedia.org/wiki/Lunar_phase" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Lunar phase</a>
              </li>

              <li className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{t('about.ourResearch')}</li>
              <li>
                <a href="https://github.com/sameraamar/hijri/blob/main/docs/calculation-methods.md" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{t('about.ourResearchLink')}</a>
                <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500"> — {t('about.ourResearchDesc')}</span>
              </li>

              <li className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Academic &amp; Scientific</li>
              <li>
                <a href="https://www.researchgate.net/publication/354067468_Predicting_the_First_Visibility_of_the_Lunar_Crescent" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Segura, W. (2021). <em>Predicting the First Visibility of the Lunar Crescent.</em></a>
              </li>
              <li>
                <a href="https://www.researchgate.net/publication/323945073_Calendrical_Calculations_The_Ultimate_Edition" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Reingold, E. M. &amp; Dershowitz, N. (2018). <em>Calendrical Calculations: The Ultimate Edition.</em></a>
                <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500"> — Cambridge University Press</span>
              </li>
              <li>
                <a href="https://www.researchgate.net/publication/225099773_New_Criterion_for_Lunar_Crescent_Visibility" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Odeh, M. (2004). <em>New Criterion for Lunar Crescent Visibility.</em></a>
                <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500"> — Experimental Astronomy, Vol. 18, pp. 39–64</span>
              </li>
              <li>
                <a href="https://astronomycenter.net/pdf/yallop_1997.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Yallop, B. D. (1997). <em>A Method for Predicting the First Sighting of the New Crescent Moon.</em></a>
                <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500"> — NAO Technical Note No. 69, HM Nautical Almanac Office</span>
              </li>
              <li>
                <a href="https://astronomycenter.net/pdf/schaefer_1996.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Schaefer, B. E. (1996). <em>Lunar Crescent Visibility.</em></a>
                <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500"> — Quarterly Journal of the Royal Astronomical Society, Vol. 37, pp. 759–768</span>
              </li>
              <li>
                <a href="https://www.cs.tau.ac.il/~nachumd/papers/CalendricalCalculationsII.pdf" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Reingold, E. M., Dershowitz, N. &amp; Clamen, S. M. (1993). <em>Calendrical Calculations, II: Three Historical Calendars.</em></a>
                <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500"> — Software—Practice and Experience, Vol. 23(4), pp. 383–404</span>
              </li>
              <li>
                <a href="https://adsabs.harvard.edu/full/1988QJRAS..29..511S" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Schaefer, B. E. (1988). <em>Visibility of the Lunar Crescent.</em></a>
                <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500"> — Quarterly Journal of the Royal Astronomical Society, Vol. 29, pp. 511–523</span>
              </li>

              <li className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Software</li>
              <li>
                <a href="https://github.com/cosinekitty/astronomy" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">astronomy-engine</a>
                <span className="text-slate-500 dark:text-slate-400 dark:text-slate-500"> — npm package for sun/moon ephemeris calculations</span>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
