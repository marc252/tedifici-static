'use client';

import dynamic from 'next/dynamic';
import { BuildingData } from '@/lib/types';
import TechCard from './cards/TechCard';
import UrbanismCard from './cards/UrbanismCard';
import InvestmentCard from './cards/InvestmentCard';
import GeminiCard from './cards/GeminiCard';
import PdfExport from './PdfExport';
import { Loader2, AlertTriangle } from 'lucide-react';

// Dynamic import for MapView to avoid SSR issues with Leaflet
const MapView = dynamic(() => import('./MapView'), {
    ssr: false,
    loading: () => (
        <div className="card-glass h-[250px] sm:h-[320px] md:h-[400px] flex items-center justify-center">
            <Loader2 className="animate-spin text-cyan-400" size={32} />
        </div>
    ),
});

interface DashboardProps {
    data: BuildingData;
}

function LoadingCard({ label, delay }: { label: string; delay: string }) {
    return (
        <div className="card-glass animate-pulse" style={{ animationDelay: delay }}>
            <div className="flex items-center gap-3">
                <Loader2 className="animate-spin text-blue-400" size={20} />
                <span className="text-sm text-slate-400">{label}</span>
            </div>
        </div>
    );
}

export default function Dashboard({ data }: DashboardProps) {
    const hasAnyData = data.geocode || data.catastro || data.searchResults || data.geminiReport || data.openData.length > 0;
    const isAnyLoading = Object.values(data.loading).some(Boolean);

    if (!hasAnyData && !isAnyLoading) {
        return null;
    }

    return (
        <div className="w-full max-w-7xl mx-auto mt-10 px-4">
            {/* Errors */}
            {data.errors.length > 0 && (
                <div className="mb-6 space-y-2">
                    {data.errors.map((error, idx) => (
                        <div key={idx} className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 animate-slideUp">
                            <AlertTriangle size={20} className="shrink-0" />
                            <p>{error}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Map View */}
            {data.geocode && (
                <div className="mb-6 animate-slideUp">
                    <MapView
                        lat={data.geocode.lat}
                        lng={data.geocode.lng}
                        address={data.geocode.formattedAddress}
                        buildingGeometry={data.buildingGeometry}
                    />
                </div>
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-slideUp" style={{ animationDelay: '0.1s' }}>

                {/* 1. Dades Tècniques (Cadastre) + Façana */}
                {data.loading.catastro ? (
                    <LoadingCard label="Consultant Sede Electrònica del Catastro..." delay="0s" />
                ) : data.catastro ? (
                    <TechCard
                        catastro={data.catastro}
                        imageUrl={data.geocode ? `https://maps.googleapis.com/maps/api/streetview?size=640x400&location=${data.geocode.lat},${data.geocode.lng}&fov=80&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}` : undefined}
                    />
                ) : null}

                {/* 2. An&agrave;lisi d'Inversi&oacute; (Renda + Lloguer + Energia) */}
                {data.loading.openData ? (
                    <LoadingCard label="Consultant INE, ICAEN & Open Data..." delay="0.1s" />
                ) : (
                    <InvestmentCard openData={data.openData} />
                )}

                {/* 3. Urbanisme i Dades Obertes */}
                {!data.loading.openData && (
                    <UrbanismCard openData={data.openData} />
                )}

                {/* 4. An&agrave;lisi IA (Gemini) */}
                {data.loading.gemini ? (
                    <LoadingCard label="Generant anàlisi immobiliari amb IA..." delay="0.2s" />
                ) : data.geminiReport ? (
                    <GeminiCard report={data.geminiReport} />
                ) : null}
            </div>

            {/* Loading status (Timeline) */}
            {isAnyLoading && (
                <div className="mt-8 p-4 rounded-xl bg-slate-800/50 border border-white/5 animate-fadeIn">
                    <div className="flex items-center gap-3 mb-3">
                        <Loader2 className="animate-spin text-blue-400" size={18} />
                        <span className="text-sm font-medium text-slate-300">Processant consulta...</span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                            { key: 'geocode' as const, label: 'Geocodificació' },
                            { key: 'catastro' as const, label: 'Catastro' },
                            { key: 'openData' as const, label: 'Dades Obertes' },
                            { key: 'gemini' as const, label: 'Gemini IA' },
                        ].map((step) => {
                            const isActive = data.loading[step.key];
                            const isDone =
                                step.key === 'geocode' ? !!data.geocode :
                                    step.key === 'catastro' ? !!data.catastro :
                                        step.key === 'openData' ? data.openData.length > 0 :
                                            !!data.geminiReport;

                            return (
                                <div
                                    key={step.key}
                                    className={`text-center p-2 rounded-lg text-xs font-medium transition-all duration-300 ${isActive
                                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                        : isDone
                                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                            : 'bg-slate-800/50 text-slate-600 border border-white/5'
                                        }`}
                                >
                                    {step.label}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="mt-8 flex justify-center pb-10">
                <PdfExport data={data} />
            </div>
        </div>
    );
}
