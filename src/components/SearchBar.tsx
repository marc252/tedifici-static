'use client';

import { useState, KeyboardEvent } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface SearchBarProps {
    onSearch: (address: string) => void;
    isLoading: boolean;
}

export default function SearchBar({ onSearch, isLoading }: SearchBarProps) {
    const [address, setAddress] = useState('');

    const handleSearch = () => {
        if (address.trim() && !isLoading) {
            onSearch(address.trim());
        }
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div className="relative group">
                {/* Glow effect */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-500" />

                {/* Search container */}
                <div className="relative flex items-center bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="pl-5 text-slate-400">
                        <Search size={22} />
                    </div>

                    <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Introdueix una adreça..."
                        className="flex-1 bg-transparent text-white placeholder-slate-500 px-3 py-3 text-sm sm:px-4 sm:py-4 sm:text-base md:py-5 md:text-lg outline-none min-w-0"
                        disabled={isLoading}
                    />

                    <button
                        onClick={handleSearch}
                        disabled={isLoading || !address.trim()}
                        className="mr-1.5 sm:mr-2 px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-700 disabled:to-slate-700 text-white font-semibold rounded-xl transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                <span className="hidden sm:inline">Cercant...</span>
                            </>
                        ) : (
                            <>
                                <Search size={18} />
                                <span className="hidden sm:inline">Cercar</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Quick examples */}
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
                {[
                    'Passeig de Gràcia 92, Barcelona',
                    'Gran Vía 32, Madrid',
                    'Carrer Balmes 139, Barcelona',
                ].map((example) => (
                    <button
                        key={example}
                        onClick={() => {
                            setAddress(example);
                            onSearch(example);
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-800/50 hover:bg-slate-700/50 hover:text-slate-300 border border-slate-700/50 rounded-lg transition-all duration-300"
                        disabled={isLoading}
                    >
                        {example}
                    </button>
                ))}
            </div>
        </div>
    );
}
