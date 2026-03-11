'use client';

import { useState, useCallback } from 'react';
import { Building2 } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import Dashboard from '@/components/Dashboard';
import { BuildingData, initialBuildingData } from '@/lib/types';

export default function Home() {
  const [data, setData] = useState<BuildingData>(initialBuildingData);
  const [hasSearched, setHasSearched] = useState(false);

  const updateData = useCallback((updater: (prev: BuildingData) => Partial<BuildingData>) => {
    setData((prev) => ({ ...prev, ...updater(prev) }));
  }, []);

  const handleSearch = useCallback(async (address: string) => {
    // Reset state
    setHasSearched(true);
    setData({
      ...initialBuildingData,
      loading: {
        geocode: true,
        catastro: false,
        search: false,
        gemini: false,
        openData: false,
      },
    });

    // ============ FASE 1: GEOCODING ============
    try {
      const geocodeRes = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`);
      const geocodeData = await geocodeRes.json();

      if (!geocodeRes.ok || geocodeData.error) {
        updateData(() => ({
          loading: { ...initialBuildingData.loading },
          errors: [geocodeData.error || 'Error de geocodificació'],
        }));
        return;
      }

      updateData(() => ({
        geocode: geocodeData,
        loading: {
          geocode: false,
          catastro: true,
          search: true,
          openData: true,
          gemini: false,
        },
      }));

      // ============ FASES 2-5 IN PARALLEL ============
      // Removed History/Search API as per user request
      const [catastroResult, openDataResult] = await Promise.allSettled([
        // FASE 2: CATASTRO (coordinates → RC → details)
        fetch(
          `/api/catastro?lat=${geocodeData.lat}&lng=${geocodeData.lng}`
        ).then((r) => r.json()),

        // FASE 3: OPEN DATA (Includes Urbanism + Income + Rental Index)
        fetch(
          `/api/opendata?lat=${geocodeData.lat}&lng=${geocodeData.lng}&municipality=${encodeURIComponent(geocodeData.municipality)}&streetName=${encodeURIComponent(geocodeData.streetName)}&streetNumber=${encodeURIComponent(geocodeData.streetNumber)}&neighborhood=${encodeURIComponent(geocodeData.neighborhood || '')}&province=${encodeURIComponent(geocodeData.province || '')}&rc=${''}`
        ).then((r) => r.json()),
      ]);

      // Process results
      const newErrors: string[] = [];

      // Catastro
      const catastro = catastroResult.status === 'fulfilled' && !catastroResult.value.error
        ? catastroResult.value.catastro
        : null;

      // Building geometry from WFS INSPIRE
      const buildingGeometry = catastroResult.status === 'fulfilled'
        ? catastroResult.value.buildingGeometry || null
        : null;

      if (catastroResult.status === 'fulfilled' && catastroResult.value.error) {
        newErrors.push(catastroResult.value.error);
      }

      // Open Data
      let openData = openDataResult.status === 'fulfilled' && openDataResult.value && Array.isArray(openDataResult.value.openData)
        ? openDataResult.value.openData
        : [];

      // Re-fetch open data with RC (if available) — enables ICAEN energy certs
      if (catastro?.referenciaCadastral) {
        fetch(
          `/api/opendata?municipality=${encodeURIComponent(geocodeData.municipality)}&rc=${encodeURIComponent(catastro.referenciaCadastral)}&lat=${geocodeData.lat}&lng=${geocodeData.lng}&streetName=${encodeURIComponent(geocodeData.streetName || '')}&streetNumber=${encodeURIComponent(geocodeData.streetNumber)}&neighborhood=${encodeURIComponent(geocodeData.neighborhood || '')}&province=${encodeURIComponent(geocodeData.province || '')}`
        )
          .then((r) => r.json())
          .then((result) => {
            if (result && Array.isArray(result.openData)) {
              updateData(() => ({ openData: result.openData }));
            }
          })
          .catch(() => { });
      }

      updateData(() => ({
        catastro: catastro,
        buildingGeometry: buildingGeometry,
        searchResults: null,
        openData: openData,
        errors: newErrors,
        loading: {
          geocode: false,
          catastro: false,
          search: false,
          openData: false,
          gemini: true,
        },
      }));

      // ============ FASE 7: COPILOT IA ============
      try {
        // Build economic summary from open data for AI context
        const buildOpenDataSummary = (od: typeof openData) => {
          const parts: string[] = [];
          const renta = od.find((s: any) => s.source.includes('Atlas de Renda'));
          if (renta?.data?.[0]) {
            const d = renta.data[0];
            if (d['renda_llar']) parts.push(`Renda mitjana per llar: ${d['renda_llar']}`);
            if (d['renda_persona']) parts.push(`Renda per persona: ${d['renda_persona']}`);
          }
          const lloguer = od.find((s: any) => s.source.includes('Preus de Lloguer'));
          if (lloguer?.data?.[0]) {
            const d = lloguer.data[0];
            if (d['index_lloguer']) parts.push(`Índex lloguer municipal: ${d['index_lloguer']}`);
            if (d['variacio_anual']) parts.push(`Variació anual lloguer: ${d['variacio_anual']}`);
          }
          const energia = od.find((s: any) => s.source.includes('ICAEN'));
          if (energia?.data?.[0]) {
            const d = energia.data[0];
            if (d['qualificacio_energetica']) parts.push(`Qualificació energètica: ${d['qualificacio_energetica']}`);
          }
          return parts.join('\n');
        };

        const geminiRes = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            address: geocodeData.formattedAddress,
            municipality: geocodeData.municipality,
            province: geocodeData.province,
            rc: catastro?.referenciaCadastral || '',
            year: catastro?.anyConstruccio || '',
            usage: catastro?.us || '',
            surface: catastro?.superficieConstruida || '',
            searchContext: '',
            openDataSummary: buildOpenDataSummary(openData),
          }),
        });

        if (!geminiRes.ok) {
          const errData = await geminiRes.json().catch(() => ({}));
          updateData((prev) => ({
            errors: [...prev.errors, errData.error || `Error ${geminiRes.status}: ${geminiRes.statusText}`],
            loading: { ...initialBuildingData.loading },
          }));
          return;
        }

        // Initialize empty report
        updateData(() => ({
          geminiReport: { content: '', model: 'Gemini Flash' },
        }));

        // Force show the card by setting loading false immediately
        updateData(prev => ({
          loading: { ...prev.loading, gemini: false }
        }));

        const reader = geminiRes.body?.getReader();
        if (!reader) throw new Error('No stream reader');

        const decoder = new TextDecoder();
        let accumulatedText = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;

          updateData(prev => ({
            geminiReport: {
              content: accumulatedText,
              model: 'Gemini Flash'
            }
          }));
        }
      } catch {
        updateData((prev) => ({
          errors: [...prev.errors, 'Error connectant amb Gemini'],
          loading: { ...initialBuildingData.loading },
        }));
      }
    } catch (error) {
      updateData(() => ({
        loading: { ...initialBuildingData.loading },
        errors: [`Error general: ${error instanceof Error ? error.message : String(error)}`],
      }));
    }
  }, [updateData]);

  const isAnyLoading = Object.values(data.loading).some(Boolean);

  return (
    <main className="min-h-screen relative">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-slate-950">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/40 via-slate-950 to-indigo-950/40 animate-gradient" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[300px] sm:w-[600px] sm:h-[450px] md:w-[800px] md:h-[600px] bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className={`transition-all duration-700 ${hasSearched ? 'pt-6 pb-4 sm:pt-8 sm:pb-6' : 'pt-16 pb-8 sm:pt-24 sm:pb-12 md:pt-32 md:pb-16'}`}>
          <div className="text-center">
            {/* Logo */}
            <div className={`flex items-center justify-center gap-3 mb-4 transition-all duration-700 ${hasSearched ? 'scale-75' : 'scale-100'}`}>
              <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/25">
                <Building2 className="text-white" size={hasSearched ? 24 : 36} />
              </div>
              <h1 className={`font-black bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent transition-all duration-700 ${hasSearched ? 'text-xl sm:text-2xl' : 'text-3xl sm:text-4xl md:text-5xl'}`}>
                Infobuilding
              </h1>
            </div>

            {/* Subtitle */}
            {!hasSearched && (
              <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto animate-fadeIn mb-2 px-4">
                Localitzador intel·ligent de dades d&apos;edificis a Espanya
              </p>
            )}
            {!hasSearched && (
              <p className="text-slate-600 text-xs sm:text-sm max-w-xl mx-auto animate-fadeIn px-4">
                Catastro · Patrimoni · Urbanisme · Intel·ligència Artificial
              </p>
            )}
          </div>
        </header>

        {/* Search */}
        <section className="px-4 pb-8">
          <SearchBar onSearch={handleSearch} isLoading={isAnyLoading} />
        </section>

        {/* Dashboard */}
        <section className="px-4 pb-16">
          <Dashboard data={data} />
        </section>

        {/* Footer */}
        <footer className="pb-8 text-center">
          <p className="text-xs text-slate-700">
            Infobuilding © {new Date().getFullYear()} — Catastro, INE, Open Data BCN/Madrid, ICAEN, Gemini IA
          </p>
        </footer>
      </div>
    </main>
  );
}
