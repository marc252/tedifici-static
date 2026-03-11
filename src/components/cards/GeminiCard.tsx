'use client';

import { Sparkles, Bot } from 'lucide-react';
import { GeminiReport } from '@/lib/types';

interface GeminiCardProps {
    report: GeminiReport;
}

export default function GeminiCard({ report }: GeminiCardProps) {
    // Simple markdown-like formatting
    const formatContent = (text: string) => {
        return text.split('\n').map((line, idx) => {
            // Handle headers
            if (line.startsWith('## ')) {
                return <h4 key={idx} className="text-base font-bold text-white mt-4 mb-2">{line.replace('## ', '')}</h4>;
            }
            if (line.startsWith('### ')) {
                return <h5 key={idx} className="text-sm font-bold text-purple-300 mt-3 mb-1">{line.replace('### ', '')}</h5>;
            }
            if (line.startsWith('# ')) {
                return <h3 key={idx} className="text-lg font-bold text-white mt-3 mb-2">{line.replace('# ', '')}</h3>;
            }
            // Handle bold text
            if (line.includes('**')) {
                const parts = line.split(/\*\*(.*?)\*\*/g);
                return (
                    <p key={idx} className="text-sm text-slate-300 leading-relaxed">
                        {parts.map((part, i) =>
                            i % 2 === 1 ? <strong key={i} className="text-white font-semibold">{part}</strong> : part
                        )}
                    </p>
                );
            }
            // Handle bullet points
            if (line.startsWith('- ') || line.startsWith('* ')) {
                return (
                    <li key={idx} className="text-sm text-slate-300 ml-4 list-disc leading-relaxed">
                        {line.replace(/^[-*] /, '')}
                    </li>
                );
            }
            // Empty lines
            if (line.trim() === '') {
                return <div key={idx} className="h-2" />;
            }
            // Regular paragraphs
            return <p key={idx} className="text-sm text-slate-300 leading-relaxed">{line}</p>;
        });
    };

    return (
        <div className="card-glass animate-slideUp" style={{ animationDelay: '0.3s' }}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-purple-500/20 rounded-xl">
                    <Sparkles className="text-purple-400" size={22} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Anàlisi IA Inversió</h3>
                    <p className="text-sm text-slate-400">Anàlisi generada per Gemini Flash</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1 bg-purple-500/10 rounded-lg">
                    <Bot size={12} className="text-purple-400" />
                    <span className="text-xs text-purple-400 font-medium">{report.model}</span>
                </div>
            </div>

            {/* Content */}
            <div className="prose-invert max-w-none min-h-[100px]">
                {report.content ? (
                    formatContent(report.content)
                ) : (
                    <div className="flex flex-col items-center justify-center h-24 text-slate-400 gap-2 animate-pulse">
                        <Sparkles size={20} className="text-purple-400" />
                        <span className="text-sm font-medium">Analitzant dades i generant informe...</span>
                    </div>
                )}
            </div>
        </div>
    );
}
