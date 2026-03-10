'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import BuildingDetails, { BuildingData } from './BuildingDetails';

// Dynamically import Map with no SSR
const Map = dynamic(() => import('./Map'), {
    ssr: false,
    loading: () => <div className="h-64 w-full bg-gray-100 animate-pulse rounded-xl flex items-center justify-center text-gray-400">Carregant mapa...</div>
});

export default function SearchAddress() {
    const [address, setAddress] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<{
        lat: string;
        lon: string;
        display_name: string;
        rc: string | null;
    } | null>(null);
    const [buildingData, setBuildingData] = useState<BuildingData | null>(null);
    const [aiInsight, setAiInsight] = useState<string | null>(null); // State for AI text
    const [loadingAi, setLoadingAi] = useState(false); // State for AI loading

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setLoadingAi(false);
        setError(null);
        setResult(null);
        setBuildingData(null);
        setAiInsight(null);

        try {
            // 1. Geocode
            const geoRes = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
            const geoData = await geoRes.json();

            if (!geoRes.ok) {
                throw new Error(geoData.error || 'Geocoding failed');
            }

            // 2. Get Catastro Data & Building Details
            // The geocode endpoint now returns everything (lat, lon, rc, building details, image)

            // Map the API response to our UI state
            setResult({
                lat: geoData.lat,
                lon: geoData.lon,
                display_name: geoData.display_name,
                rc: geoData.rc,
            });

            if (geoData.rc) {
                // Construct BuildingData from the geocode response
                // valid fields from API: year_construction, surface, usage, image_url, source
                const buildingDetails: BuildingData = {
                    rc: geoData.rc,
                    year: geoData.year_construction || geoData.year || '-',
                    surface: geoData.surface ? geoData.surface.toString() : '-',
                    uso: geoData.usage || geoData.uso || '-',
                    image_url: geoData.image_url,
                    source: geoData.source
                };

                setBuildingData(buildingDetails);

                // 4. Trigger AI Insight
                fetchAiInsight({
                    address: geoData.display_name,
                    rc: geoData.rc,
                    year: buildingDetails.year,
                    surface: buildingDetails.surface,
                    usage: buildingDetails.uso
                });
            }

        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const fetchAiInsight = async (data: any) => {
        setLoadingAi(true);
        try {
            const response = await fetch('/api/gemini', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                const result = await response.json();
                setAiInsight(result.text);
            } else {
                console.warn("AI Insight failed", await response.json());
            }
        } catch (e) {
            console.error("AI fetch error", e);
        } finally {
            setLoadingAi(false);
        }
    };


    return (
        <div className="w-full max-w-5xl mx-auto p-4">
            <form onSubmit={handleSearch} className="flex gap-2 mb-8 max-w-2xl mx-auto">
                <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Introdueix una adreça (ex: Gran Via, Barcelona)"
                    className="flex-1 p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
                />
                <button
                    type="submit"
                    disabled={loading || !address}
                    className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
                >
                    {loading ? 'Cercant...' : 'Cercar'}
                </button>
            </form>

            {error && (
                <div className="p-4 mb-4 text-red-700 bg-red-100 rounded-lg max-w-2xl mx-auto">
                    {error}
                </div>
            )}

            {result && (
                <div className="flex flex-col gap-6">

                    {/* Top Row: Info + Map */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                        {/* Basic Info Card */}
                        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 text-gray-800 flex flex-col justify-center">
                            <h2 className="text-xl font-bold mb-4">Ubicació Trobada</h2>

                            <div className="space-y-3">
                                <div>
                                    <span className="font-semibold text-gray-500 text-sm uppercase">Adreça</span>
                                    <p className="text-lg leading-relaxed line-clamp-3">{result.display_name}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="font-semibold text-gray-500 text-sm uppercase">Latitud</span>
                                        <p className="font-mono text-sm">{parseFloat(result.lat).toFixed(5)}</p>
                                    </div>
                                    <div>
                                        <span className="font-semibold text-gray-500 text-sm uppercase">Longitud</span>
                                        <p className="font-mono text-sm">{parseFloat(result.lon).toFixed(5)}</p>
                                    </div>
                                </div>

                                <div className="pt-4 mt-4 border-t border-gray-100">
                                    <span className="font-semibold text-gray-500 text-sm uppercase">Referència Cadastral</span>
                                    {result.rc ? (
                                        <p className="text-2xl font-bold text-blue-600 tracking-wide font-mono mt-1 select-all">
                                            {result.rc}
                                        </p>
                                    ) : (
                                        <p className="text-gray-400 italic mt-1">No s'ha trobat la referència cadastral.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Map */}
                        <div className="rounded-xl overflow-hidden shadow-md border border-gray-100 h-full min-h-[300px]">
                            <Map
                                lat={parseFloat(result.lat)}
                                lon={parseFloat(result.lon)}
                                displayName={result.display_name}
                            />
                        </div>

                    </div>

                    {/* Building Details */}
                    {buildingData && (
                        <div className="mt-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
                            <h3 className="text-lg font-semibold text-gray-700 mb-3 px-2">Dades de l'Edifici</h3>
                            <BuildingDetails data={buildingData} />
                        </div>
                    )}

                    {/* AI Insight Section */}
                    {(loadingAi || aiInsight) && (
                        <div className="mt-4 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-1000">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5" /><path d="M8.5 8.5v.01" /><path d="M16 16v.01" /><path d="M12 12v.01" /></svg>
                                </div>
                                <h3 className="text-lg font-bold text-gray-800">Intel·ligència Artificial</h3>
                            </div>

                            {loadingAi ? (
                                <div className="space-y-2 animate-pulse">
                                    <div className="h-4 bg-blue-200 rounded w-3/4"></div>
                                    <div className="h-4 bg-blue-200 rounded w-full"></div>
                                    <div className="h-4 bg-blue-200 rounded w-5/6"></div>
                                </div>
                            ) : (
                                <div className="prose prose-blue max-w-none text-gray-700">
                                    <p className="whitespace-pre-wrap leading-relaxed">{aiInsight}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
