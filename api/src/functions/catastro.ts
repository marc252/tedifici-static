import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { XMLParser } from 'fast-xml-parser';
import { parseCoordinatesResponse, parseBuildingDetailsResponse, parseUnitListResponse, parseUnitDetailResponse, getCroquisUrl, getFacadeImageUrl } from '../lib/catastro-parser';
import { CatastroUnit } from '../lib/types';

// IMPORTANT: Use HTTP (not HTTPS) for Catastro OVC
const CATASTRO_BASE = 'http://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC';

async function getRCFromCoordinates(lat: number, lng: number) {
    const url = `${CATASTRO_BASE}/OVCCoordenadas.asmx/Consulta_RCCOOR?SRS=EPSG:4326&Coordenada_X=${lng}&Coordenada_Y=${lat}`;

    const response = await fetch(url, { headers: { 'Accept': 'application/xml, text/xml' } });
    if (!response.ok) return { rc: null, address: null, error: `Error connectant al Catastro: HTTP ${response.status}` };

    const xmlText = await response.text();
    return parseCoordinatesResponse(xmlText);
}

async function getBuildingGeometry(rc: string): Promise<number[][][] | null> {
    try {
        const parcelRC = rc.substring(0, 14);
        const url = `http://ovc.catastro.meh.es/INSPIRE/wfsBU.aspx?service=wfs&version=2.0.0&request=getfeature&StoredQuerie_id=GetBuildingByParcel&REFCAT=${parcelRC}&srsname=EPSG::4326`;

        const response = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { 'Accept': 'application/xml, text/xml' } });
        if (!response.ok) return null;

        const xmlText = await response.text();
        const parser = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true });
        const parsed = parser.parse(xmlText);

        const posListStr = findPosList(parsed);
        if (!posListStr) return null;

        const coords = posListStr.trim().split(/\s+/).map(Number);
        const ring: number[][] = [];
        for (let i = 0; i < coords.length - 1; i += 2) {
            ring.push([coords[i + 1], coords[i]]);
        }

        if (ring.length > 0 && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
            ring.push([...ring[0]]);
        }
        return ring.length >= 4 ? [ring] : null;
    } catch (error) {
        return null;
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findPosList(obj: any): string | null {
    if (typeof obj === 'string') return null;
    if (obj === null || obj === undefined) return null;

    if (obj.posList !== undefined) {
        return typeof obj.posList === 'string' ? obj.posList : String(obj.posList);
    }

    if (typeof obj === 'object') {
        for (const key of Object.keys(obj)) {
            const result = findPosList(obj[key]);
            if (result) return result;
        }
    }
    return null;
}

async function getParcelUnits(rc: string, xmlText: string): Promise<{ units: CatastroUnit[]; totalUnits: number }> {
    try {
        const { totalUnits, units: unitList } = parseUnitListResponse(xmlText);

        if (totalUnits <= 1 || unitList.length === 0) return { units: [], totalUnits };

        const pc1 = rc.substring(0, 7);
        const pc2 = rc.substring(7, 14);

        const unitsToFetch = unitList.slice(0, 30);
        const detailResults = await Promise.allSettled(
            unitsToFetch.map(async (unit) => {
                const unitRC = `${pc1}${pc2}${unit.car}`;
                const url = `${CATASTRO_BASE}/OVCCallejero.asmx/Consulta_DNPRC?Provincia=&Municipio=&RC=${encodeURIComponent(unitRC)}`;
                const response = await fetch(url, { headers: { 'Accept': 'application/xml, text/xml' }, signal: AbortSignal.timeout(8000) });
                if (!response.ok) return null;
                const detailXml = await response.text();
                return parseUnitDetailResponse(detailXml, pc1, pc2, unit.car);
            })
        );

        const units = detailResults
            .filter((r): r is PromiseFulfilledResult<CatastroUnit | null> => r.status === 'fulfilled' && r.value !== null)
            .map(r => r.value!);

        units.sort((a, b) => {
            const floorA = parseInt(a.planta) || 0;
            const floorB = parseInt(b.planta) || 0;
            if (floorA !== floorB) return floorA - floorB;
            return (parseInt(a.porta) || 0) - (parseInt(b.porta) || 0);
        });

        return { units, totalUnits };
    } catch (error) {
        return { units: [], totalUnits: 0 };
    }
}

export async function catastroHttp(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const lat = request.query.get('lat');
    const lng = request.query.get('lng');

    if (!lat || !lng) {
        return { status: 400, jsonBody: { error: 'Cal proporcionar coordenades (lat, lng)' } };
    }

    try {
        const rcResult = await getRCFromCoordinates(parseFloat(lat), parseFloat(lng));

        if (!rcResult.rc) {
            return { status: 404, jsonBody: { error: rcResult.error || 'No s\'ha trobat cap referència cadastral per a aquesta ubicació.', catastro: null } };
        }

        const dnprcUrl = `${CATASTRO_BASE}/OVCCallejero.asmx/Consulta_DNPRC?Provincia=&Municipio=&RC=${encodeURIComponent(rcResult.rc)}`;
        const dnprcResponse = await fetch(dnprcUrl, { headers: { 'Accept': 'application/xml, text/xml' } });

        const dnprcXml = dnprcResponse.ok ? await dnprcResponse.text() : '';
        const details = dnprcXml ? parseBuildingDetailsResponse(dnprcXml) : { data: null, error: 'Failed' };

        const [geometryResult, unitsResult] = await Promise.allSettled([
            getBuildingGeometry(rcResult.rc),
            dnprcXml ? getParcelUnits(rcResult.rc, dnprcXml) : Promise.resolve({ units: [], totalUnits: 0 }),
        ]);

        const buildingGeometry = geometryResult.status === 'fulfilled' ? geometryResult.value : null;
        const { units, totalUnits } = unitsResult.status === 'fulfilled' ? unitsResult.value : { units: [], totalUnits: 0 };

        const catastroData = {
            referenciaCadastral: details.data?.referenciaCadastral || rcResult.rc,
            anyConstruccio: details.data?.anyConstruccio || '',
            us: details.data?.us || '',
            superficieConstruida: details.data?.superficieConstruida || '',
            superficieSol: details.data?.superficieSol || '',
            direccio: details.data?.direccio || rcResult.address || '',
            municipi: details.data?.municipi || '',
            provincia: details.data?.provincia || '',
            tipusImmoble: details.data?.tipusImmoble || '',
            croquis: getCroquisUrl(rcResult.rc),
            facadeImage: getFacadeImageUrl(rcResult.rc),
            elements: details.data?.elements || [],
            units: units.length > 0 ? units : undefined,
            totalUnits: totalUnits > 1 ? totalUnits : undefined,
        };

        return { status: 200, jsonBody: { catastro: catastroData, buildingGeometry, error: null } };
    } catch (error) {
        return { status: 500, jsonBody: { error: `Error del Catastro: ${error instanceof Error ? error.message : String(error)}`, catastro: null } };
    }
}

app.http('catastro', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: catastroHttp
});
