'use client';

import { useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';

interface MapViewProps {
    lat: number;
    lng: number;
    address: string;
    buildingGeometry?: number[][][] | null;
}

export default function MapView({ lat, lng, address, buildingGeometry }: MapViewProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined' || !mapRef.current) return;

        // Dynamic import of Leaflet
        const initMap = async () => {
            const L = (await import('leaflet')).default;
            // @ts-ignore
            await import('leaflet/dist/leaflet.css');

            // Fix default marker icon paths
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
                iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
                shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            });

            // If map already exists, remove it
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
            }

            const map = L.map(mapRef.current!, {
                center: [lat, lng],
                zoom: 17,
                zoomControl: true,
            });

            // Base layer - OpenStreetMap
            const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap',
                maxZoom: 19,
            });

            // Catastro WMS layer
            const catastroLayer = L.tileLayer.wms(
                'https://ovc.catastro.meh.es/cartografia/INSPIRE/spadgcwms.aspx',
                {
                    layers: 'CP.CadastralParcel',
                    format: 'image/png',
                    transparent: true,
                    opacity: 0.5,
                    attribution: '&copy; Catastro',
                }
            );

            // Satellite layer (ESRI)
            const satelliteLayer = L.tileLayer(
                'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
                {
                    attribution: '&copy; ESRI',
                    maxZoom: 19,
                }
            );

            osmLayer.addTo(map);
            catastroLayer.addTo(map);

            // Layer control
            L.control.layers(
                {
                    'Mapa': osmLayer,
                    'Satèl·lit': satelliteLayer,
                },
                {
                    'Parcel·les Cadastrals': catastroLayer,
                }
            ).addTo(map);

            // Marker
            L.marker([lat, lng])
                .addTo(map)
                .bindPopup(`<b>${address}</b><br/>Lat: ${lat.toFixed(6)}<br/>Lng: ${lng.toFixed(6)}`)
                .openPopup();

            // Building polygon overlay from WFS INSPIRE
            if (buildingGeometry && buildingGeometry.length > 0) {
                const polygonCoords: L.LatLngExpression[][] = buildingGeometry.map(ring =>
                    ring.map(coord => [coord[1], coord[0]] as L.LatLngExpression)
                );

                const buildingPolygon = L.polygon(polygonCoords, {
                    color: '#3b82f6',
                    weight: 2,
                    fillColor: '#60a5fa',
                    fillOpacity: 0.2,
                    dashArray: '6, 4',
                });

                buildingPolygon.addTo(map);
                buildingPolygon.bindTooltip('Empremta de l\'edifici', { direction: 'center', className: 'leaflet-tooltip' });
            }

            mapInstanceRef.current = map;
        };

        initMap();

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [lat, lng, address, buildingGeometry]);

    return (
        <div className="card-glass animate-slideUp overflow-hidden" style={{ animationDelay: '0.05s' }}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-cyan-500/20 rounded-xl">
                    <MapPin className="text-cyan-400" size={22} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">Ubicació</h3>
                    <p className="text-sm text-slate-400">
                        {lat.toFixed(6)}, {lng.toFixed(6)}
                    </p>
                </div>
            </div>

            {/* Map */}
            <div
                ref={mapRef}
                className="w-full h-[220px] sm:h-[280px] md:h-[350px] rounded-xl overflow-hidden border border-white/10"
                style={{ zIndex: 0 }}
            />
        </div>
    );
}
