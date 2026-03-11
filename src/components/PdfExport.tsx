'use client';

import { Download, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { BuildingData } from '@/lib/types';

interface PdfExportProps {
    data: BuildingData;
}

/**
 * Load an image URL as base64 data URI for jsPDF.
 * Routes external images through our server-side proxy to bypass CORS and mixed-content restrictions.
 */
async function loadImageAsBase64(url: string): Promise<string | null> {
    try {
        // Use our server-side proxy for external images
        const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (!response.ok) return null;
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

/**
 * Generate a simple map image using OSM tile server + Canvas.
 * This replaces the dead staticmap.openstreetmap.de service.
 */
async function generateMapImage(lat: number, lng: number, zoom: number = 17): Promise<string | null> {
    try {
        const tileSize = 256;
        const canvasW = 600;
        const canvasH = 300;

        // Calculate tile coordinates from lat/lng
        const n = Math.pow(2, zoom);
        const xtile = ((lng + 180) / 360) * n;
        const ytile = ((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2) * n;

        const centerTileX = Math.floor(xtile);
        const centerTileY = Math.floor(ytile);
        const offsetX = Math.round((xtile - centerTileX) * tileSize);
        const offsetY = Math.round((ytile - centerTileY) * tileSize);

        // Calculate how many tiles we need
        const tilesX = Math.ceil(canvasW / tileSize) + 1;
        const tilesY = Math.ceil(canvasH / tileSize) + 1;
        const startTileX = centerTileX - Math.floor(tilesX / 2);
        const startTileY = centerTileY - Math.floor(tilesY / 2);

        const canvas = document.createElement('canvas');
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        // Load tiles via our proxy
        const tilePromises: Promise<void>[] = [];
        for (let tx = 0; tx < tilesX; tx++) {
            for (let ty = 0; ty < tilesY; ty++) {
                const tileX = startTileX + tx;
                const tileY = startTileY + ty;
                const tileUrl = `https://a.tile.openstreetmap.org/${zoom}/${tileX}/${tileY}.png`;
                const drawX = tx * tileSize - offsetX + Math.floor(canvasW / 2) - (centerTileX - startTileX) * tileSize;
                const drawY = ty * tileSize - offsetY + Math.floor(canvasH / 2) - (centerTileY - startTileY) * tileSize;

                tilePromises.push(
                    loadImageAsBase64(tileUrl).then(base64 => {
                        if (!base64) return;
                        return new Promise<void>((resolve) => {
                            const img = new Image();
                            img.onload = () => {
                                ctx.drawImage(img, drawX, drawY, tileSize, tileSize);
                                resolve();
                            };
                            img.onerror = () => resolve();
                            img.src = base64;
                        });
                    })
                );
            }
        }

        await Promise.all(tilePromises);

        // Draw marker (red dot with white border) at center
        const markerX = canvasW / 2;
        const markerY = canvasH / 2;
        ctx.beginPath();
        ctx.arc(markerX, markerY, 10, 0, 2 * Math.PI);
        ctx.fillStyle = '#DC2626';
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(markerX, markerY, 4, 0, 2 * Math.PI);
        ctx.fillStyle = 'white';
        ctx.fill();

        // Attribution
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.fillRect(canvasW - 180, canvasH - 16, 180, 16);
        ctx.fillStyle = '#333';
        ctx.font = '10px sans-serif';
        ctx.fillText('\u00A9 OpenStreetMap contributors', canvasW - 175, canvasH - 4);

        return canvas.toDataURL('image/png');
    } catch {
        return null;
    }
}

export default function PdfExport({ data }: PdfExportProps) {
    const [generating, setGenerating] = useState(false);

    const generatePdf = async () => {
        setGenerating(true);

        try {
            const { jsPDF } = await import('jspdf');
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const margin = 20;
            const contentWidth = pageWidth - margin * 2;
            let y = 20;

            const checkPageBreak = (neededHeight: number) => {
                if (y + neededHeight > 270) {
                    doc.addPage();
                    y = 20;
                }
            };

            // Helper: draw a section title with colored left bar
            const sectionTitle = (title: string, color: [number, number, number]) => {
                checkPageBreak(15);
                doc.setFillColor(...color);
                doc.rect(margin, y - 1, 3, 8, 'F');
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(...color);
                doc.text(title, margin + 6, y + 5);
                y += 12;
            };

            // Helper: draw a key-value row in a table style
            const tableRow = (label: string, value: string, isAlt: boolean) => {
                checkPageBreak(7);
                if (isAlt) {
                    doc.setFillColor(245, 247, 250);
                    doc.rect(margin, y - 3, contentWidth, 7, 'F');
                }
                doc.setFontSize(9);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(71, 85, 105);
                doc.text(label, margin + 2, y);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(30, 41, 59);
                doc.text(value, margin + 58, y);
                y += 7;
            };

            // ============ HEADER ============
            doc.setFontSize(22);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(30, 58, 138);
            doc.text('INFOBUILDING', margin, y);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(148, 163, 184);
            doc.text('Informe d\'inversió immobiliària', margin + 55, y);
            y += 4;

            // Divider
            doc.setDrawColor(203, 213, 225);
            doc.setLineWidth(0.5);
            doc.line(margin, y, pageWidth - margin, y);
            y += 6;

            // Address & date
            if (data.geocode) {
                doc.setFontSize(13);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(30, 41, 59);
                const addressLines = doc.splitTextToSize(data.geocode.formattedAddress, contentWidth);
                doc.text(addressLines, margin, y);
                y += addressLines.length * 5 + 2;
            }

            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(148, 163, 184);
            const dateStr = new Date().toLocaleDateString('ca-ES', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
            doc.text(`Generat el ${dateStr}`, margin, y);
            if (data.geocode) {
                doc.text(
                    `Coordenades: ${data.geocode.lat.toFixed(6)}, ${data.geocode.lng.toFixed(6)}`,
                    pageWidth - margin, y, { align: 'right' }
                );
            }
            y += 8;

            // ============ IMAGES: FACADE + MAP ============
            // Facade: Catastro OVC photo → Google Street View fallback (both via proxy)
            const facadeUrl = data.catastro?.facadeImage
                || (data.geocode ? `https://maps.googleapis.com/maps/api/streetview?size=640x400&location=${data.geocode.lat},${data.geocode.lng}&fov=80` : null);

            const [facadeData, mapData] = await Promise.allSettled([
                facadeUrl ? loadImageAsBase64(facadeUrl) : Promise.resolve(null),
                data.geocode ? generateMapImage(data.geocode.lat, data.geocode.lng, 17) : Promise.resolve(null),
            ]);

            const facadeImg = facadeData.status === 'fulfilled' ? facadeData.value : null;
            const mapImg = mapData.status === 'fulfilled' ? mapData.value : null;

            if (facadeImg || mapImg) {
                checkPageBreak(50);
                const imgWidth = facadeImg && mapImg ? (contentWidth - 4) / 2 : contentWidth;
                const imgHeight = 42;

                if (facadeImg) {
                    try {
                        doc.addImage(facadeImg, 'JPEG', margin, y, imgWidth, imgHeight);
                        doc.setFontSize(7);
                        doc.setTextColor(148, 163, 184);
                        doc.text('Foto fa\u00e7ana', margin + 1, y + imgHeight + 3);
                    } catch { /* image format not supported, skip */ }
                }

                if (mapImg) {
                    const mapX = facadeImg ? margin + imgWidth + 4 : margin;
                    try {
                        doc.addImage(mapImg, 'PNG', mapX, y, imgWidth, imgHeight);
                        doc.setFontSize(7);
                        doc.setTextColor(148, 163, 184);
                        doc.text('Plànol ubicació', mapX + 1, y + imgHeight + 3);
                    } catch { /* image format not supported, skip */ }
                }

                y += imgHeight + 8;
            }

            // ============ DADES TÈCNIQUES ============
            if (data.catastro) {
                const isMultiUnitPdf = data.catastro.units && data.catastro.units.length > 0;

                sectionTitle(
                    isMultiUnitPdf
                        ? `Dades Tècniques — Parcela amb ${data.catastro.totalUnits || data.catastro.units!.length} immobles`
                        : 'Dades Tècniques — Immoble individual',
                    [30, 64, 175]
                );

                if (isMultiUnitPdf) {
                    // --- MULTI-UNIT: Show parcel summary + unit table ---
                    const units = data.catastro.units!;
                    const years = units.map(u => parseInt(u.anyConstruccio)).filter(y => !isNaN(y) && y > 0);
                    const surfaces = units.map(u => parseInt(u.superficie)).filter(s => !isNaN(s) && s > 0);
                    const usages = [...new Set(units.map(u => u.us).filter(Boolean))];
                    const totalSurface = surfaces.reduce((a, b) => a + b, 0);
                    const minYear = years.length > 0 ? Math.min(...years) : null;
                    const maxYear = years.length > 0 ? Math.max(...years) : null;

                    // Parcel summary rows
                    const summaryData: [string, string][] = [
                        ['Ref. Cadastral Parcela', data.catastro.referenciaCadastral],
                        ['Total immobles', `${data.catastro.totalUnits || units.length}`],
                        ...(usages.length > 0 ? [['Usos', usages.join(', ')] as [string, string]] : []),
                        ...(totalSurface > 0 ? [['Superfície Total Construïda', `${totalSurface.toLocaleString('es-ES')} m\u00B2`] as [string, string]] : []),
                        ...(minYear ? [['Any Construcció', minYear === maxYear ? `${minYear}` : `${minYear} – ${maxYear}`] as [string, string]] : []),
                        ...(data.catastro.municipi ? [['Municipi', data.catastro.municipi] as [string, string]] : []),
                        ...(data.catastro.provincia ? [['Província', data.catastro.provincia] as [string, string]] : []),
                    ];

                    doc.setDrawColor(226, 232, 240);
                    doc.setLineWidth(0.3);
                    doc.rect(margin, y - 3, contentWidth, summaryData.length * 7 + 2);

                    for (let i = 0; i < summaryData.length; i++) {
                        tableRow(summaryData[i][0], summaryData[i][1], i % 2 === 0);
                    }
                    y += 6;

                    // Unit detail table
                    const maxUnitsInPdf = Math.min(units.length, 40);
                    const unitRowH = 5;
                    const headerH = 6;
                    const tableH = headerH + maxUnitsInPdf * unitRowH + 2;

                    checkPageBreak(tableH + 10);

                    // Subtitle
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(30, 64, 175);
                    doc.text(`Detall dels immobles (${maxUnitsInPdf}${maxUnitsInPdf < units.length ? ` de ${units.length}` : ''})`, margin, y);
                    y += 6;

                    // Column widths
                    const colPlanta = 25;
                    const colUs = 40;
                    const colSup = 22;
                    const colAny = 18;
                    const colPorta = 15;
                    const colRC = contentWidth - colPlanta - colUs - colSup - colAny - colPorta;

                    // Table header
                    doc.setFillColor(30, 64, 175);
                    doc.rect(margin, y - 3, contentWidth, headerH, 'F');
                    doc.setFontSize(7);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(255, 255, 255);
                    let colX = margin + 2;
                    doc.text('Planta', colX, y + 1); colX += colPlanta;
                    doc.text('Ús', colX, y + 1); colX += colUs;
                    doc.text('m\u00B2', colX, y + 1); colX += colSup;
                    doc.text('Any', colX, y + 1); colX += colAny;
                    doc.text('Porta', colX, y + 1); colX += colPorta;
                    doc.text('Ref. Cadastral', colX, y + 1);
                    y += headerH;

                    // Table rows
                    for (let i = 0; i < maxUnitsInPdf; i++) {
                        checkPageBreak(unitRowH + 2);
                        const unit = units[i];

                        if (i % 2 === 0) {
                            doc.setFillColor(245, 247, 250);
                            doc.rect(margin, y - 3, contentWidth, unitRowH, 'F');
                        }

                        doc.setFontSize(7);
                        doc.setFont('helvetica', 'normal');
                        doc.setTextColor(51, 65, 85);
                        colX = margin + 2;

                        // Floor - format nicely
                        const floorNum = parseInt(unit.planta, 10);
                        const floorText = isNaN(floorNum) ? unit.planta : (floorNum < 0 ? `Sot. ${Math.abs(floorNum)}` : floorNum === 0 ? 'Baixos' : `Pl. ${floorNum}`);
                        doc.text(floorText, colX, y); colX += colPlanta;
                        doc.text((unit.us || '-').substring(0, 22), colX, y); colX += colUs;
                        doc.text(unit.superficie || '-', colX, y); colX += colSup;
                        doc.text(unit.anyConstruccio || '-', colX, y); colX += colAny;
                        doc.text(unit.porta || '-', colX, y); colX += colPorta;
                        doc.setFontSize(6);
                        doc.setTextColor(100, 116, 139);
                        doc.text(unit.rc || '-', colX, y);

                        y += unitRowH;
                    }

                    // Draw table border
                    doc.setDrawColor(226, 232, 240);
                    doc.setLineWidth(0.3);
                    doc.rect(margin, y - maxUnitsInPdf * unitRowH - headerH - 3, contentWidth, maxUnitsInPdf * unitRowH + headerH + 2);

                    if (units.length > maxUnitsInPdf) {
                        doc.setFontSize(7);
                        doc.setTextColor(148, 163, 184);
                        doc.text(`+ ${units.length - maxUnitsInPdf} immobles addicionals (consultar web Catastro)`, margin, y + 2);
                        y += 4;
                    }

                    y += 6;
                } else {
                    // --- SINGLE-UNIT: Show key-value table ---
                    const techData = [
                        ['Referència Cadastral', data.catastro.referenciaCadastral],
                        ['Any de Construcció', data.catastro.anyConstruccio || 'No disponible'],
                        ['Ús Principal', data.catastro.us || 'No disponible'],
                        ['Superfície Construïda', data.catastro.superficieConstruida ? `${data.catastro.superficieConstruida} m\u00B2` : 'No disponible'],
                        ...(data.catastro.superficieSol ? [['Superfície Sòl', `${data.catastro.superficieSol} m\u00B2`]] : []),
                        ...(data.catastro.tipusImmoble ? [['Tipus d\'Immoble', data.catastro.tipusImmoble]] : []),
                        ...(data.catastro.municipi ? [['Municipi', data.catastro.municipi]] : []),
                        ...(data.catastro.provincia ? [['Província', data.catastro.provincia]] : []),
                    ];

                    // Draw table border
                    doc.setDrawColor(226, 232, 240);
                    doc.setLineWidth(0.3);
                    doc.rect(margin, y - 3, contentWidth, techData.length * 7 + 2);

                    for (let i = 0; i < techData.length; i++) {
                        tableRow(techData[i][0], techData[i][1], i % 2 === 0);
                    }
                    y += 6;
                }
            }

            // ============ ANÀLISI D'INVERSIÓ ============
            const rentaSource = data.openData.find(s => s.source.includes('Atlas de Renda'));
            const rentalSource = data.openData.find(s => s.source.includes('Preus de Lloguer'));
            const energySource = data.openData.find(s => s.source.includes('ICAEN'));

            if (rentaSource || rentalSource || energySource) {
                sectionTitle("Anàlisi d'Inversió", [217, 119, 6]);

                // Draw investment box
                const boxStartY = y;
                doc.setDrawColor(251, 191, 36);
                doc.setFillColor(255, 251, 235);
                doc.setLineWidth(0.3);

                const investData: string[] = [];

                if (rentaSource?.data?.[0]) {
                    const d = rentaSource.data[0];
                    if (d['renda_persona']) investData.push(`Renda neta per persona: ${d['renda_persona']}`);
                    if (d['renda_llar']) investData.push(`Renda neta per llar: ${d['renda_llar']}`);

                    // Calculate max rent
                    const rendaLlar = String(d['renda_llar'] || '')
                        .replace(/EUR|\u20AC/gi, '').trim()
                        .replace(/\./g, '').replace(',', '.');
                    const num = Number(rendaLlar);
                    if (!isNaN(num) && num > 0) {
                        const maxRent = Math.round((num * 0.30) / 12);
                        investData.push(`LLOGUER MÀXIM ASSEQUIBLE (30%): ${maxRent.toLocaleString('es-ES')} \u20AC/mes`);
                    }
                }

                if (rentalSource?.data?.[0]) {
                    const d = rentalSource.data[0];
                    let line = `Índex de lloguer municipal: ${d['index_lloguer'] || '-'}`;
                    if (d['variacio_anual']) line += ` (variació: ${d['variacio_anual']})`;
                    investData.push(line);
                }

                if (energySource?.data?.[0]) {
                    const d = energySource.data[0];
                    if (d['qualificacio_energetica'] && d['qualificacio_energetica'] !== '-') {
                        investData.push(`Qualificació energètica: ${d['qualificacio_energetica']}`);
                    }
                }

                const boxHeight = investData.length * 6 + 4;
                doc.rect(margin, boxStartY - 2, contentWidth, boxHeight, 'FD');

                doc.setFontSize(9);
                doc.setTextColor(146, 64, 14);
                for (const line of investData) {
                    doc.setFont('helvetica', line.startsWith('LLOGUER') ? 'bold' : 'normal');
                    doc.text(line, margin + 3, y);
                    y += 6;
                }
                y += 6;
            }

            // ============ ANÀLISI IA ============
            if (data.geminiReport) {
                sectionTitle("Anàlisi IA Inversió", [126, 34, 206]);

                doc.setFontSize(9);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(51, 65, 85);

                const cleanContent = data.geminiReport.content
                    .replace(/#{1,3} /g, '')
                    .replace(/\*\*/g, '')
                    .replace(/\*/g, '');
                const geminiLines = doc.splitTextToSize(cleanContent, contentWidth);

                for (let i = 0; i < geminiLines.length; i++) {
                    checkPageBreak(5);
                    doc.text(geminiLines[i], margin, y);
                    y += 4.5;
                }
                y += 6;
            }

            // ============ DADES OBERTES ============
            // Filter out investment sources (already shown above)
            const investmentPatterns = ['Atlas de Renda', 'Preus de Lloguer', 'ICAEN'];
            const otherSources = data.openData.filter(
                s => !investmentPatterns.some(p => s.source.includes(p))
            );

            if (otherSources.length > 0) {
                sectionTitle('Dades Obertes i Indicadors', [5, 150, 105]);

                doc.setFontSize(9);
                doc.setTextColor(51, 65, 85);

                for (const source of otherSources) {
                    checkPageBreak(20);
                    doc.setFont('helvetica', 'bold');
                    doc.text(source.source, margin, y);
                    y += 4;
                    doc.setFont('helvetica', 'normal');
                    doc.setFontSize(8);
                    doc.setTextColor(100, 116, 139);
                    doc.text(source.description, margin, y);
                    y += 4;
                    doc.setTextColor(51, 65, 85);

                    if (source.data.length > 0) {
                        for (const item of source.data.slice(0, 3)) {
                            for (const [key, value] of Object.entries(item)) {
                                if (value !== null && value !== undefined && value !== '' && value !== '-'
                                    && !key.startsWith('_') && !key.startsWith('geo_')
                                    && !key.startsWith('addresses_') && !key.startsWith('secondary_')
                                    && !key.startsWith('values_') && !key.startsWith('register_')
                                    && !key.startsWith('institution_') && key !== 'created' && key !== 'modified') {
                                    checkPageBreak(5);
                                    const label = key.replace(/_/g, ' ');
                                    const text = `  ${label}: ${String(value).substring(0, 80)}`;
                                    doc.setFontSize(8);
                                    doc.text(text, margin + 2, y);
                                    y += 4;
                                }
                            }
                            y += 2;
                        }
                    }
                    y += 4;
                    doc.setFontSize(9);
                }
            }

            // ============ FOOTER ============
            const totalPages = doc.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(7);
                doc.setTextColor(148, 163, 184);
                doc.text(
                    `Infobuilding \u2014 P\u00e0gina ${i} de ${totalPages} \u2014 Dades: Catastro, INE, ICAEN, Open Data`,
                    pageWidth / 2,
                    287,
                    { align: 'center' }
                );
            }

            // Save
            const fileName = data.geocode
                ? `Informe_${data.geocode.municipality || 'edifici'}_${new Date().toISOString().slice(0, 10)}.pdf`
                : `Informe_edifici_${new Date().toISOString().slice(0, 10)}.pdf`;

            doc.save(fileName);
        } catch (error) {
            console.error('Error generant PDF:', error);
            alert('Error generant el PDF. Intenta-ho de nou.');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <button
            onClick={generatePdf}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:from-slate-700 disabled:to-slate-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-green-500/25 disabled:opacity-50 text-sm sm:text-base"
        >
            {generating ? (
                <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Generant PDF...</span>
                </>
            ) : (
                <>
                    <Download size={18} />
                    <span>Descarregar Informe PDF</span>
                </>
            )}
        </button>
    );
}
