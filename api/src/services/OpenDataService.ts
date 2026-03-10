import { getFacadeImage } from './CatastroService';

export interface OpenDataResult {
    rc?: string;
    year_construction?: number;
    usage?: string;
    surface?: number;
    source?: string;
    info_url?: string;
    image_url?: string;
}

export async function getBuildingInfoFromOpenData(rc: string, city?: string): Promise<OpenDataResult | null> {
    try {
        console.log(`[OpenData] Querying for RC: ${rc}, City: ${city}`);

        const normalizedCity = city?.toLowerCase().trim() || '';
        let result: OpenDataResult | null = null;

        if (normalizedCity.includes('barcelona') || normalizedCity.includes('bcn')) {
            console.log(`[OpenData] Detected city: Barcelona. Routing to getBarcelonaOpenData`);
            result = await getBarcelonaOpenData(rc);
        } else if (normalizedCity.includes('madrid')) {
            console.log(`[OpenData] Detected city: Madrid. Routing to getMadridOpenData`);
            result = await getMadridOpenData(rc);
        } else {
            console.log(`[OpenData] City '${normalizedCity}' not supported for specific Open Data.`);
        }

        // Always try to get the image from Catastro as a supplement if we have an RC
        if (rc) {
            const imageUrl = await getFacadeImage(rc);
            if (imageUrl) {
                result = result || {};
                result = { ...result, image_url: imageUrl };
            }
        }

        return result;
    } catch (error) {
        console.error('[OpenData] Error fetching data:', error);
        return null;
    }
}

async function getBarcelonaOpenData(rc: string): Promise<OpenDataResult | null> {
    try {
        // Barcelona Open Data (CKAN) placeholder
        // In the future, query the actual API or specific resource ID here.
        console.log('[OpenData] Fetching from Barcelona Open Data...');

        return {
            source: 'Ajuntament de Barcelona (Open Data)',
            info_url: `https://opendata-ajuntament.barcelona.cat/data/es/dataset/est-cadastral-valors-unitaris-residencial`
        };
    } catch (e) {
        console.error('Barcelona Open Data failed', e);
        return null;
    }
}

async function getMadridOpenData(rc: string): Promise<OpenDataResult | null> {
    try {
        console.log('[OpenData] Fetching from Madrid Open Data...');
        return {
            source: 'Ayuntamiento de Madrid (Geoportal)',
            info_url: 'https://geoportal.madrid.es/'
        };
    } catch (e) {
        console.error('Madrid Open Data failed', e);
        return null;
    }
}
