import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getCatastroDataByCoordinates, getCatastroDataByRC } from '../services/CatastroService';
import { getBuildingInfoFromOpenData } from '../services/OpenDataService';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function geocodeHttp(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const address = request.query.get('address');

    if (!address) {
        return { status: 400, jsonBody: { error: 'Address parameter is required' } };
    }

    try {
        let lat: number | null = null;
        let lon: number | null = null;
        let displayName = '';
        let rc = '';
        let buildingData: any = {};

        // 1. Nominatim Geocoding
        try {
            const parts = address.split(',').map(p => p.trim());
            let candidates: any[] = [];

            if (parts.length >= 2) {
                const potentialCity = parts[parts.length - 1];
                const potentialStreet = parts.slice(0, parts.length - 1).join(', ');

                context.log(`[Geocode] Trying structured query: street="${potentialStreet}", city="${potentialCity}"`);

                const structuredUrl = `https://nominatim.openstreetmap.org/search?street=${encodeURIComponent(potentialStreet)}&city=${encodeURIComponent(potentialCity)}&format=json&addressdetails=1&limit=5`;
                try {
                    const res = await fetch(structuredUrl, { headers: { 'User-Agent': 'TedificiApp/1.0' } });
                    if (res.ok) {
                        const data = await res.json();
                        if (Array.isArray(data)) candidates = [...candidates, ...data];
                    }
                } catch (e) { context.warn('Structured geocoding failed', e); }
            }

            if (candidates.length === 0) {
                context.log(`[Geocode] Falling back to free-form query: "${address}"`);
                const qUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&addressdetails=1&limit=5`;
                const res = await fetch(qUrl, { headers: { 'User-Agent': 'TedificiApp/1.0' } });
                if (res.ok) {
                    const data = await res.json();
                    if (Array.isArray(data)) candidates = [...candidates, ...data];
                }
            }

            if (candidates.length > 0) {
                const cityMatch = address.match(/barcelona|madrid/i);
                const targetCity = cityMatch ? cityMatch[0].toLowerCase() : null;

                let bestMatch = candidates[0];

                if (targetCity) {
                    context.log(`[Geocode] Target City detected: ${targetCity}`);

                    const exactCityMatch = candidates.find(c => {
                        const addr = c.address || {};
                        const startCity = (addr.city || addr.town || addr.village || addr.municipality || '').toLowerCase();
                        context.log(`[Geocode] Candidate: ${c.display_name} -> City field: ${startCity}`);
                        return startCity === targetCity;
                    });

                    if (exactCityMatch) {
                        context.log(`[Geocode] Found exact city match: ${exactCityMatch.display_name}`);
                        bestMatch = exactCityMatch;
                    } else {
                        context.warn(`[Geocode] No exact city match found in ${candidates.length} candidates.`);
                    }
                }

                lat = parseFloat(bestMatch.lat);
                lon = parseFloat(bestMatch.lon);
                displayName = bestMatch.display_name;
            }
        } catch (e) {
            context.warn('Nominatim failed:', e);
        }

        // 2. AI Fallback
        if (!lat || !lon) {
            context.log('Nominatim failed to find address, trying AI fallback...');
            const apiKey = process.env.GOOGLE_API_KEY;
            if (apiKey) {
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
                const prompt = `Actua com un expert en geolocalització. L'usuari busca la següent adreça a Espanya, que pot ser imprecisa: "${address}".
                   Retorna un objecte JSON amb les coordenades (lat, lon) més probables i l'adreça normalitzada.
                   Format: { "lat": 41.38, "lon": 2.16, "address": "Adreça corregida" }
                   Si no trobes res, retorna null.`;

                try {
                    const result = await model.generateContent(prompt);
                    const text = result.response.text();
                    const jsonStr = text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
                    const aiData = JSON.parse(jsonStr);

                    if (aiData && aiData.lat) {
                        lat = aiData.lat;
                        lon = aiData.lon;
                        displayName = aiData.address;
                    }
                } catch (e) {
                    context.error('AI Geocoding fallback failed:', e);
                }
            }
        }

        if (!lat || !lon) {
            return { status: 404, jsonBody: { error: 'Address not found' } };
        }

        // 3. Catastro Lookup
        const catastroData = await getCatastroDataByCoordinates(lat, lon);
        if (catastroData?.rc) {
            rc = catastroData.rc;
        }

        // 3b. AI Fallback for RC
        if (!rc) {
            context.log('RC not found by coordinates, asking AI...');
            const apiKey = process.env.GOOGLE_API_KEY;
            if (apiKey) {
                const genAI = new GoogleGenerativeAI(apiKey);
                const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
                const prompt = `L'usuari busca la Referència Cadastral de l'adreça: "${address}".
                     La cerca per coordenades ha fallat.
                     Si us plau, cerca o dedueix la Referència Cadastral (20 caràcters) per aquesta adreça exacta.
                     Retorna un JSON: { "rc": "00000000000000000000" } o { "rc": null } si no n'estàs segur.`;

                try {
                    const result = await model.generateContent(prompt);
                    const text = result.response.text();
                    const jsonStr = text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
                    const aiData = JSON.parse(jsonStr);
                    if (aiData && aiData.rc) {
                        rc = aiData.rc;
                        context.log('AI found RC:', rc);
                    }
                } catch (e: any) {
                    context.error('AI RC fallback failed:', e.message || String(e));
                }
            }
        }

        // 4. Open Data Lookup
        if (rc) {
            const basicData = await getCatastroDataByRC(rc);
            if (basicData) {
                buildingData = {
                    ...buildingData,
                    year_construction: basicData.year,
                    surface: basicData.surface,
                    usage: basicData.usage
                };
            }

            try {
                // @ts-ignore
                const openData = await getBuildingInfoFromOpenData(rc, displayName);
                if (openData) {
                    buildingData = { ...buildingData, ...openData };
                }
            } catch (e) {
                context.error("OpenData lookup failed", e);
            }
        }

        return {
            status: 200,
            jsonBody: {
                lat,
                lon,
                display_name: displayName,
                rc: rc || null,
                ...buildingData
            }
        };

    } catch (error) {
        context.error('Geocoding error:', error);
        return { status: 500, jsonBody: { error: 'Internal server error' } };
    }
}

app.http('geocode', {
    methods: ['GET', 'POST'],
    authLevel: 'anonymous',
    handler: geocodeHttp
});
