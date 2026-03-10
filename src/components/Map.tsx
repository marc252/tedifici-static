'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect } from 'react';

// Fix for default marker icon in Leaflet with Next.js/Webpack
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Component to fly to new coordinates when they change
function ChangeView({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.flyTo(center, 18, { duration: 1.5 });
    }, [center, map]);
    return null;
}

interface MapProps {
    lat: number;
    lon: number;
    displayName: string;
}

export default function Map({ lat, lon, displayName }: MapProps) {
    const center: [number, number] = [lat, lon];

    return (
        <div className="h-64 w-full rounded-xl overflow-hidden shadow-sm border border-gray-100 z-0 relative">
            <MapContainer
                center={center}
                zoom={16}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={false}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ChangeView center={center} />
                <Marker position={center}>
                    <Popup>
                        {displayName}
                    </Popup>
                </Marker>
            </MapContainer>
        </div>
    );
}
