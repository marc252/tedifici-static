'use client';

import { Building2, Calendar, Maximize2, Tag, Hash, MapPin, Layers, FileText, Layout, Home, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { CatastroData } from '@/lib/types';

interface TechCardProps {
    catastro?: CatastroData | null;
    imageUrl?: string;
}

// Helper to format floor number to human-readable text
function formatFloor(pt: string): string {
    const num = parseInt(pt, 10);
    if (isNaN(num)) return pt;
    if (num < 0) return `Soterrani ${Math.abs(num)}`;
    if (num === 0) return 'Baixos';
    return `Planta ${num}`;
}

export default function TechCard({ catastro, imageUrl }: TechCardProps) {
    const [showAllUnits, setShowAllUnits] = useState(false);

    if (!catastro && !imageUrl) return null;

    const isMultiUnit = catastro?.units && catastro.units.length > 0;

    // For multi-unit parcels, compute aggregate stats from units
    const unitStats = isMultiUnit && catastro?.units ? (() => {
        const units = catastro.units;
        const years = units.map(u => parseInt(u.anyConstruccio)).filter(y => !isNaN(y) && y > 0);
        const surfaces = units.map(u => parseInt(u.superficie)).filter(s => !isNaN(s) && s > 0);
        const usages = [...new Set(units.map(u => u.us).filter(Boolean))];
        const minYear = years.length > 0 ? Math.min(...years) : null;
        const maxYear = years.length > 0 ? Math.max(...years) : null;
        const totalSurface = surfaces.reduce((a, b) => a + b, 0);
        return { minYear, maxYear, totalSurface, usages };
    })() : null;

    // Different data items for single-unit vs multi-unit
    const dataItems = catastro ? (isMultiUnit ? [
        // Multi-unit: show aggregate data, no empty fields
        { icon: Building2, label: 'Immobles', value: `${catastro.totalUnits || catastro.units!.length} unitats`, highlight: false },
        ...(unitStats?.usages && unitStats.usages.length > 0
            ? [{ icon: Layout, label: 'Usos', value: unitStats.usages.join(', '), highlight: false }]
            : []),
        ...(unitStats?.totalSurface
            ? [{ icon: Maximize2, label: 'Sup. Total Construïda', value: `${unitStats.totalSurface.toLocaleString('es-ES')} m²`, highlight: false }]
            : []),
        ...(unitStats?.minYear
            ? [{ icon: Calendar, label: 'Any Construcció', value: unitStats.minYear === unitStats.maxYear ? `${unitStats.minYear}` : `${unitStats.minYear} – ${unitStats.maxYear}`, highlight: false }]
            : []),
        { icon: Hash, label: 'Ref. Cadastral Parcela', value: catastro.referenciaCadastral, highlight: true },
    ] : [
        // Single-unit: show all details
        { icon: Layout, label: 'Ús Principal', value: catastro.us },
        { icon: Maximize2, label: 'Superfície Construïda', value: catastro.superficieConstruida ? `${catastro.superficieConstruida} m²` : '' },
        { icon: Calendar, label: 'Any Construcció', value: catastro.anyConstruccio },
        { icon: Home, label: 'Tipus', value: catastro.tipusImmoble },
        { icon: Hash, label: 'Ref. Cadastral', value: catastro.referenciaCadastral, highlight: true },
    ]) : [];

    return (
        <div className="card-glass animate-slideUp">
            {/* Facade Image: Try Catastro OVC FotoFachada first, Google Street View as fallback */}
            {(catastro?.facadeImage || imageUrl) && (
                <div className="mb-6 rounded-xl overflow-hidden border border-white/10 shadow-lg relative h-48 sm:h-64">
                    <img
                        src={catastro?.facadeImage || imageUrl || ''}
                        alt="Façana de l'edifici"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            // If Catastro image fails, try Google Street View
                            const img = e.target as HTMLImageElement;
                            if (catastro?.facadeImage && imageUrl && img.src !== imageUrl) {
                                img.src = imageUrl;
                            } else {
                                img.style.display = 'none';
                            }
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent pointer-events-none" />
                    <div className="absolute bottom-2 right-2 text-[10px] text-white/50 bg-black/40 px-2 py-0.5 rounded">
                        {catastro?.facadeImage ? 'Sede Electrónica del Catastro' : 'Google Street View'}
                    </div>
                </div>
            )}

            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-blue-500/20 rounded-xl">
                    <FileText className="text-blue-400" size={22} />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-white">Dades Tècniques</h3>
                    {catastro && (
                        <p className="text-xs text-slate-400 mt-0.5">
                            {isMultiUnit
                                ? <span className="inline-flex items-center gap-1"><Building2 size={11} className="text-blue-400" /> Parcela amb {catastro.totalUnits || catastro.units!.length} immobles</span>
                                : <span className="inline-flex items-center gap-1"><Home size={11} className="text-slate-400" /> Immoble individual</span>
                            }
                        </p>
                    )}
                </div>
            </div>

            {/* Technical Data Grid */}
            {catastro && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {dataItems.map((item, i) => (
                        <div key={i} className={`p-3 rounded-lg border ${item.highlight ? 'bg-blue-500/10 border-blue-500/20' : 'bg-slate-800/50 border-white/5'}`}>
                            <div className="flex items-center gap-2 mb-1">
                                <item.icon size={14} className={item.highlight ? 'text-blue-400' : 'text-slate-400'} />
                                <span className="text-xs text-slate-400 uppercase tracking-wider">{item.label}</span>
                            </div>
                            <p className={`font-semibold ${item.highlight ? 'text-blue-100 font-mono text-sm' : 'text-white'}`}>
                                {item.value || '-'}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Fallback msg if only image */}
            {!catastro && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-200 text-sm mb-4">
                    No s'han trobat dades cadastrals per a aquesta adreça exacta, però mostrem la imatge de la ubicació.
                </div>
            )}

            {/* Multi-unit Parcel: Individual property listing */}
            {isMultiUnit && catastro?.units && (
                <div className="mt-6">
                    <button
                        onClick={() => setShowAllUnits(!showAllUnits)}
                        className="w-full flex items-center justify-between text-sm font-semibold text-slate-300 mb-3 border-b border-white/10 pb-2 hover:text-white transition-colors"
                    >
                        <span>
                            Immobles de la Parcela
                            <span className="text-slate-500 font-normal ml-1">({catastro.totalUnits || catastro.units.length})</span>
                        </span>
                        {showAllUnits ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {/* Table header */}
                    <div className="grid grid-cols-12 gap-1 px-2 mb-1 text-[10px] text-slate-500 uppercase tracking-wider">
                        <span className="col-span-3">Planta</span>
                        <span className="col-span-3">Ús</span>
                        <span className="col-span-2 text-right">m²</span>
                        <span className="col-span-2 text-right">Any</span>
                        <span className="col-span-2 text-right">Porta</span>
                    </div>

                    <div className="space-y-1">
                        {(showAllUnits ? catastro.units : catastro.units.slice(0, 8)).map((unit, idx) => (
                            <div key={idx} className={`grid grid-cols-12 gap-1 px-2 py-1.5 rounded text-xs ${
                                idx % 2 === 0 ? 'bg-white/5' : ''
                            }`}>
                                <span className="col-span-3 text-slate-300 font-medium">{formatFloor(unit.planta)}</span>
                                <span className="col-span-3 text-slate-400">{unit.us || '-'}</span>
                                <span className="col-span-2 text-right text-white font-semibold">{unit.superficie || '-'}</span>
                                <span className="col-span-2 text-right text-slate-400">{unit.anyConstruccio || '-'}</span>
                                <span className="col-span-2 text-right text-slate-500">{unit.porta || '-'}</span>
                            </div>
                        ))}
                    </div>

                    {!showAllUnits && catastro.units.length > 8 && (
                        <button
                            onClick={() => setShowAllUnits(true)}
                            className="w-full text-center text-xs text-blue-400 hover:text-blue-300 mt-2 py-1 transition-colors"
                        >
                            Mostrar tots els {catastro.units.length} immobles ↓
                        </button>
                    )}
                </div>
            )}

            {/* Construction Elements (only for single-unit properties) */}
            {!isMultiUnit && catastro?.elements && catastro.elements.length > 0 && (
                <div className="mt-6">
                    <h4 className="text-sm font-semibold text-slate-300 mb-3 border-b border-white/10 pb-2">
                        Elements Constructius
                        <span className="text-slate-500 font-normal ml-1">({catastro.elements.length})</span>
                    </h4>
                    <div className="space-y-2">
                        {catastro.elements.slice(0, 5).map((el, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 rounded bg-white/5 text-sm">
                                <span className="text-slate-300">{el.us || 'Element'}</span>
                                <div className="flex gap-3 text-slate-400 text-xs">
                                    {el.superficieConstruida && <span>{el.superficieConstruida} m²</span>}
                                    {el.antiguitat && <span>{el.antiguitat}</span>}
                                </div>
                            </div>
                        ))}
                        {catastro.elements.length > 5 && (
                            <p className="text-center text-xs text-slate-500 mt-2">+ {catastro.elements.length - 5} elements més al web oficial</p>
                        )}
                    </div>
                </div>
            )}

            {/* Official Link */}
            {catastro?.referenciaCadastral && (
                <a
                    href={`https://www1.sedecatastro.gob.es/Cartografia/mapa.aspx?refcat=${catastro.referenciaCadastral}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 flex items-center justify-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors p-2 rounded-lg hover:bg-blue-500/10"
                >
                    <FileText size={16} />
                    Fitxa oficial del Cadastre →
                </a>
            )}
        </div>
    );
}
