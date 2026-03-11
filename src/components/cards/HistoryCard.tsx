'use client';

import { BookOpen, ExternalLink, Search } from 'lucide-react';
import { SearchResult } from '@/lib/types';

interface HistoryCardProps {
    searchResults: SearchResult;
}

export default function HistoryCard({ searchResults }: HistoryCardProps) {
    if (!searchResults.results || searchResults.results.length === 0) {
        return (
            <div className="card-glass animate-slideUp" style={{ animationDelay: '0.1s' }}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-amber-500/20 rounded-xl">
                        <BookOpen className="text-amber-400" size={22} />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Història i Patrimoni</h3>
                        <p className="text-sm text-slate-400">Font: Cerca web (Tavily)</p>
                    </div>
                </div>
                <p className="text-slate-400 text-sm">No s&apos;ha trobat informació històrica rellevant per a aquest edifici.</p>
            </div>
        );
    }

    return (
        <div className="card-glass animate-slideUp" style={{ animationDelay: '0.1s' }}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-amber-500/20 rounded-xl">
                    <BookOpen className="text-amber-400" size={22} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Història i Patrimoni</h3>
                    <p className="text-sm text-slate-400">Font: Cerca web intel·ligent</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 rounded-lg">
                    <Search size={12} className="text-amber-400" />
                    <span className="text-xs text-amber-400 font-medium">{searchResults.results.length} resultats</span>
                </div>
            </div>

            {/* Results */}
            <div className="space-y-3">
                {searchResults.results.map((result, idx) => (
                    <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-800/50 border border-white/5 hover:border-amber-500/30 transition-all duration-300"
                    >
                        <div className="flex items-start justify-between gap-2">
                            <h4 className="text-sm font-semibold text-slate-200 line-clamp-1">{result.title}</h4>
                            <a
                                href={result.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="shrink-0 text-amber-400 hover:text-amber-300 transition-colors"
                            >
                                <ExternalLink size={14} />
                            </a>
                        </div>
                        <p className="text-xs text-slate-400 mt-1.5 line-clamp-3">{result.content}</p>
                        <p className="text-xs text-slate-600 mt-1 truncate">{result.url}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
