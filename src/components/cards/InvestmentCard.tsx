'use client';

import { TrendingUp, Home, Banknote, Percent, Leaf } from 'lucide-react';
import { OpenDataResult } from '@/lib/types';

interface InvestmentCardProps {
    openData: OpenDataResult[];
}

/**
 * Parse a formatted EUR value like "32.456 EUR" or "12,345 EUR" to a number.
 */
function parseEurValue(val: unknown): number | null {
    if (!val || val === 'No disponible' || val === '-') return null;
    // Remove EUR, €, spaces, then handle Spanish number format (. = thousands, , = decimal)
    const cleaned = String(val)
        .replace(/EUR|\u20AC/gi, '')
        .trim()
        .replace(/\./g, '')    // remove thousands separators
        .replace(',', '.');    // convert decimal comma to decimal point
    const num = Number(cleaned);
    return isNaN(num) ? null : num;
}

export default function InvestmentCard({ openData }: InvestmentCardProps) {
    // Extract relevant data sources by matching source names
    const rentaSource = openData.find(s => s.source.includes('Atlas de Renda'));
    const rentalSource = openData.find(s => s.source.includes('Preus de Lloguer'));
    const energySource = openData.find(s => s.source.includes('ICAEN'));

    // Parse income values
    const rendaLlar = parseEurValue(rentaSource?.data?.[0]?.['renda_llar']);
    const rendaPersona = parseEurValue(rentaSource?.data?.[0]?.['renda_persona']);

    // Calculate max affordable rent (30% rule)
    const lloguerMax = rendaLlar ? Math.round((rendaLlar * 0.30) / 12) : null;

    // Extract rental index
    const indexLloguer = rentalSource?.data?.[0]?.['index_lloguer'] as any;
    const variacioAnual = rentalSource?.data?.[0]?.['variacio_anual'] as any;

    // Energy rating
    const qualificacio = energySource?.data?.[0]?.['qualificacio_energetica'] as any;
    const emissionsCo2 = energySource?.data?.[0]?.['emissions_co2'] as any;
    const consumEnergia = energySource?.data?.[0]?.['consum_energia'] as any;

    // Don't render if no meaningful investment data
    if (!rendaLlar && !indexLloguer) return null;

    return (
        <div className="card-glass animate-slideUp" style={{ animationDelay: '0.25s' }}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-amber-500/20 rounded-xl">
                    <TrendingUp className="text-amber-400" size={22} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">An&agrave;lisi d&apos;Inversi&oacute;</h3>
                    <p className="text-sm text-slate-400">Indicadors econ&ograve;mics i de rendibilitat</p>
                </div>
            </div>

            {/* Income Section */}
            {!!rendaLlar && (
                <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Banknote size={14} className="text-amber-400" />
                        <span className="text-xs text-slate-400 uppercase tracking-wider">
                            Renda Zona (INE{rentaSource?.data?.[0]?.['nivell'] ? ` — ${String(rentaSource.data[0]['nivell'])}` : ''})
                        </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        {rendaPersona && (
                            <div className="p-3 rounded-lg bg-slate-800/50 border border-white/5">
                                <p className="text-xs text-slate-500">Per persona</p>
                                <p className="text-base sm:text-lg font-bold text-white">{rendaPersona.toLocaleString('es-ES')} &euro;</p>
                            </div>
                        )}
                        <div className="p-3 rounded-lg bg-slate-800/50 border border-white/5">
                            <p className="text-xs text-slate-500">Per llar</p>
                            <p className="text-base sm:text-lg font-bold text-white">{rendaLlar.toLocaleString('es-ES')} &euro;</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Max Affordable Rent (30% rule) */}
            {!!lloguerMax && (
                <div className="mb-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-1">
                        <Home size={14} className="text-amber-400" />
                        <span className="text-xs text-amber-300 uppercase tracking-wider">Lloguer M&agrave;xim Assequible (30%)</span>
                    </div>
                    <p className="text-xl sm:text-2xl font-black text-amber-100">{lloguerMax.toLocaleString('es-ES')} &euro;/mes</p>
                    <p className="text-xs text-amber-400/70 mt-1">
                        Basat en renda mitjana per llar &times; 30% / 12 mesos
                    </p>
                </div>
            )}

            {/* Rental Price Index — with clear explanation */}
            {indexLloguer && (() => {
                const indexNum = parseFloat(String(indexLloguer));
                const varNum = variacioAnual ? parseFloat(String(variacioAnual).replace('%', '').replace('+', '')) : null;
                const diffFromBase = !isNaN(indexNum) ? indexNum - 100 : null;

                return (
                    <div className="mb-4">
                        <div className="flex items-center gap-2 mb-2">
                            <Percent size={14} className="text-amber-400" />
                            <span className="text-xs text-slate-400 uppercase tracking-wider">&Iacute;ndex de Preus de Lloguer (INE)</span>
                        </div>
                        <div className="p-3 rounded-lg bg-slate-800/50 border border-white/5">
                            <div className="flex justify-between items-center mb-2">
                                <div>
                                    <p className="text-base sm:text-lg font-bold text-white">{String(indexLloguer)}</p>
                                </div>
                                {!!variacioAnual && (
                                    <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                                        String(variacioAnual).startsWith('+')
                                            ? 'bg-red-500/20 text-red-300'
                                            : 'bg-green-500/20 text-green-300'
                                    }`}>
                                        {String(variacioAnual)} anual
                                    </div>
                                )}
                            </div>
                            {/* Explanatory text */}
                            <div className="text-xs text-slate-400 space-y-1 border-t border-white/5 pt-2">
                                {diffFromBase !== null && (
                                    <p>
                                        {diffFromBase > 0
                                            ? <>Els lloguers en aquest municipi han pujat un <span className="text-red-300 font-semibold">{diffFromBase.toFixed(1)}%</span> des de l&apos;any base (2015 = 100).</>
                                            : diffFromBase < 0
                                            ? <>Els lloguers en aquest municipi han baixat un <span className="text-green-300 font-semibold">{Math.abs(diffFromBase).toFixed(1)}%</span> des de l&apos;any base (2015 = 100).</>
                                            : <>Els lloguers es mantenen iguals a l&apos;any base (2015 = 100).</>
                                        }
                                    </p>
                                )}
                                {varNum !== null && !isNaN(varNum) && (
                                    <p>
                                        {varNum > 0
                                            ? <>L&apos;&uacute;ltim any els preus han pujat un {Math.abs(varNum).toFixed(1)}% &mdash; <span className="text-red-300">pressi&oacute; alcista</span> pel llogater.</>
                                            : varNum < 0
                                            ? <>L&apos;&uacute;ltim any els preus han baixat un {Math.abs(varNum).toFixed(1)}% &mdash; <span className="text-green-300">mercat m&eacute;s accessible</span>.</>
                                            : <>Preus estables respecte l&apos;any anterior.</>
                                        }
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Energy Rating */}
            {qualificacio && qualificacio !== '-' && (
                <div className="mt-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Leaf size={14} className="text-green-400" />
                        <span className="text-xs text-slate-400 uppercase tracking-wider">Qualificaci&oacute; Energ&egrave;tica</span>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50 border border-white/5">
                        <span className={`text-2xl font-black px-3 py-1 rounded-lg ${
                            qualificacio === 'A' ? 'bg-green-500/20 text-green-300' :
                            qualificacio === 'B' ? 'bg-lime-500/20 text-lime-300' :
                            qualificacio === 'C' ? 'bg-yellow-500/20 text-yellow-300' :
                            qualificacio === 'D' ? 'bg-orange-500/20 text-orange-300' :
                            'bg-red-500/20 text-red-300'
                        }`}>{String(qualificacio)}</span>
                        <div className="text-xs text-slate-400">
                            {!!emissionsCo2 && emissionsCo2 !== '-' && <p>{String(emissionsCo2)}</p>}
                            {!!consumEnergia && consumEnergia !== '-' && <p>{String(consumEnergia)}</p>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
