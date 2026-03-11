'use client';

import { Landmark, Database } from 'lucide-react';
import { OpenDataResult } from '@/lib/types';

interface UrbanismCardProps {
    openData: OpenDataResult[];
}

export default function UrbanismCard({ openData }: UrbanismCardProps) {
    // Filter out sources that are handled by InvestmentCard to avoid duplication
    const investmentPatterns = ['Atlas de Renda', 'Preus de Lloguer', 'ICAEN'];
    const filteredData = (openData || []).filter(
        source => !investmentPatterns.some(p => source.source.includes(p))
    );

    if (!filteredData || filteredData.length === 0) {
        return (
            <div className="card-glass animate-slideUp" style={{ animationDelay: '0.2s' }}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-emerald-500/20 rounded-xl">
                        <Landmark className="text-emerald-400" size={22} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Urbanisme i Dades Obertes</h3>
                        <p className="text-sm text-slate-400">Fonts: Open Data BCN/Madrid, INE</p>
                    </div>
                </div>
                <p className="text-slate-400 text-sm">No s&apos;han trobat dades obertes addicionals per a aquesta ubicació.</p>
            </div>
        );
    }

    return (
        <div className="card-glass animate-slideUp" style={{ animationDelay: '0.2s' }}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-emerald-500/20 rounded-xl">
                    <Landmark className="text-emerald-400" size={22} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Urbanisme i Dades Obertes</h3>
                    <p className="text-sm text-slate-400">Fonts públiques complementàries</p>
                </div>
            </div>

            {/* Data sources */}
            <div className="space-y-4">
                {filteredData.map((source, idx) => (
                    <div key={idx} className="p-4 rounded-xl bg-slate-800/50 border border-white/5">
                        <div className="flex items-center gap-2 mb-3">
                            <Database size={14} className="text-emerald-400" />
                            <h4 className="text-sm font-semibold text-emerald-300">{source.source}</h4>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">{source.description}</p>

                        {source.data.length > 0 && (
                            <div className="space-y-2">
                                {source.data.slice(0, 5).map((item, i) => (
                                    <div key={i} className="p-2 rounded-lg bg-slate-900/50 text-xs">
                                        {Object.entries(item)
                                            .filter(([, v]) => v !== null && v !== undefined && v !== '')
                                            .slice(0, 6)
                                            .map(([key, value]) => (
                                                <div key={key} className="flex justify-between py-0.5">
                                                    <span className="text-slate-500 capitalize">{key.replace(/_/g, ' ')}</span>
                                                    <span className="text-slate-300 text-right ml-4 max-w-[50%] sm:max-w-[60%] truncate">
                                                        {String(value)}
                                                    </span>
                                                </div>
                                            ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
