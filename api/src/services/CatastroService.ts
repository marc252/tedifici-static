export interface CatastroData {
    rc: string;
    address: string;
    year?: number;
    surface?: number;
    usage?: string;
    image_url?: string;
    display_name?: string;
}

/**
 * Fetches the facade image URL for a given Cadastral Reference (RC).
 * Uses the OVC "FotoFachada" endpoint.
 */
export async function getFacadeImage(rc: string): Promise<string | null> {
    if (!rc) return null;
    // URL pattern for the facade image from OVC
    return `http://ovc.catastro.meh.es/OVCServWeb/OVCWcfLibres/OVCFotoFachada.svc/RecuperarFotoFachadaGet?ReferenciaCatastral=${rc}`;
}

/**
 * Fetches building details (Year, Surface, Usage) from OVC using RC.
 */
export async function getCatastroDataByRC(rc: string): Promise<CatastroData | null> {
    try {
        const url = `http://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejero.asmx/Consulta_DNPRC?Provincia=&Municipio=&RC=${rc}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Catastro API failed');
        const xmlText = await response.text();

        const usoMatch = xmlText.match(/<luso>(.*?)<\/luso>/);
        const surfaceMatch = xmlText.match(/<sfc>(.*?)<\/sfc>/);
        const yearMatch = xmlText.match(/<ant>(.*?)<\/ant>/);

        // Also try to capture address just in case
        const tvMatch = xmlText.match(/<tv>(.*?)<\/tv>/); // Tipo Via
        const nvMatch = xmlText.match(/<nv>(.*?)<\/nv>/); // Nombre Via
        const pnpMatch = xmlText.match(/<pnp>(.*?)<\/pnp>/); // Numero

        return {
            rc,
            address: (tvMatch && nvMatch && pnpMatch) ? `${tvMatch[1]} ${nvMatch[1]}, ${pnpMatch[1]}` : '',
            year: yearMatch ? parseInt(yearMatch[1]) : undefined,
            surface: surfaceMatch ? parseInt(surfaceMatch[1]) : undefined,
            usage: usoMatch ? usoMatch[1] : undefined
        };
    } catch (error) {
        console.error('[Catastro] Error fetching by RC:', error);
        return null;
    }
}

export async function getCatastroDataByCoordinates(lat: number, lon: number): Promise<CatastroData | null> {
    try {
        const url = `http://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx/Consulta_RCCOOR?SRS=EPSG:4326&Coordenada_X=${lon}&Coordenada_Y=${lat}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Catastro API failed');
        const xmlText = await response.text();

        const pc1Match = xmlText.match(/<pc1>(.*?)<\/pc1>/);
        const pc2Match = xmlText.match(/<pc2>(.*?)<\/pc2>/);

        if (pc1Match && pc2Match) {
            const rc = `${pc1Match[1]}${pc2Match[1]}`;
            // We successfully found the RC
            return { rc, address: '' };
        }
        return null;
    } catch (error) {
        console.error('[Catastro] Error fetching by coordinates:', error);
        return null;
    }
}

export async function getCatastroDataByAddress(address: string): Promise<CatastroData | null> {
    // Placeholder for future implementation of splitting address and querying OVC
    return null;
}
