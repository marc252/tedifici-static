import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

interface OpenDataSource {
    name: string;
    description: string;
    fetch: (params: {
        municipality: string;
        rc: string;
        lat: number;
        lng: number;
        streetName?: string;
        streetNumber?: string;
        neighborhood?: string;
        province?: string;
    }) => Promise<Record<string, unknown>[]>;
}

// Helper: normalize strings for fuzzy municipality matching
const normalizeStr = (s: string) =>
    s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const findINEMatch = (data: any[], municipality: string) => {
    if (!Array.isArray(data) || data.length === 0) return null;
    const target = normalizeStr(municipality);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.find((item: any) => {
        const n = normalizeStr(item.Nombre || '');
        return n === target || n.includes(target) || target.includes(n);
    });
};

// ============================================================
// INE - Dades Demogràfiques (Població oficial)
// ============================================================
const ineData: OpenDataSource = {
    name: 'INE - Dades Demogràfiques',
    description: 'Població oficial per província (INE)',
    fetch: async ({ province, municipality }) => {
        try {
            const searchTerm = province || municipality;
            if (!searchTerm) return [];

            const url = `https://servicios.ine.es/wstempus/jsCache/ES/DATOS_TABLA/2852?nult=1`;
            const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
            if (!response.ok) return [];

            const data = await response.json();
            if (!Array.isArray(data) || data.length === 0) return [];

            const target = normalizeStr(searchTerm);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const match = data.find((item: any) => {
                const n = normalizeStr(item.Nombre || '');
                return n.startsWith(target + '.') && n.includes('total') && n.includes('habitantes');
            });

            if (!match) return [];

            const label = match.Nombre?.split('.')[0]?.trim() || searchTerm;
            return [{
                provincia: label,
                poblacio: match.Data?.[0]?.Valor ? Math.round(Number(match.Data[0].Valor)).toLocaleString('es-ES') : 'No disponible',
                any: match.Data?.[0]?.Anyo || '',
            }];
        } catch {
            return [];
        }
    },
};

// ============================================================
// INE - Atlas de Renda (Op. 353) - Renda per persona i per llar
// ============================================================

const INE_RENTA_TABLE_IDS: Record<string, number> = {
    'araba/alava': 30851, 'alava': 30851, 'araba': 30851,
    'albacete': 30656,
    'alicante': 30833, 'alacant': 30833,
    'almeria': 30842,
    'avila': 30869,
    'badajoz': 30878,
    'illes balears': 30887, 'islas baleares': 30887, 'balears': 30887,
    'barcelona': 30896,
    'burgos': 30926,
    'caceres': 30935,
    'cadiz': 30944,
    'castellon': 30962, 'castello': 30962,
    'ciudad real': 30971,
    'cordoba': 30980,
    'a coruna': 30989, 'la coruna': 30989, 'coruna': 30989,
    'cuenca': 30998,
    'girona': 31016, 'gerona': 31016,
    'granada': 31025,
    'guadalajara': 31034,
    'gipuzkoa': 31007, 'guipuzcoa': 31007,
    'huelva': 31043,
    'huesca': 31052,
    'jaen': 31061,
    'leon': 31070,
    'lleida': 31079, 'lerida': 31079,
    'la rioja': 31169, 'rioja': 31169,
    'lugo': 31088,
    'madrid': 31097,
    'malaga': 31106,
    'murcia': 31115,
    'navarra': 31124,
    'ourense': 31133, 'orense': 31133,
    'asturias': 30860,
    'palencia': 31142,
    'las palmas': 31151,
    'pontevedra': 31160,
    'salamanca': 31178,
    'santa cruz de tenerife': 31187, 'tenerife': 31187,
    'cantabria': 30953,
    'segovia': 31196,
    'sevilla': 31205,
    'soria': 31214,
    'tarragona': 31223,
    'teruel': 31232,
    'toledo': 31241,
    'valencia': 31250, 'valencia/valencia': 31250,
    'valladolid': 31259,
    'bizkaia': 30917, 'vizcaya': 30917,
    'zamora': 31268,
    'zaragoza': 31277,
    'ceuta': 31286,
    'melilla': 31295,
};

const ineRentaAtlas: OpenDataSource = {
    name: 'INE - Atlas de Renda',
    description: 'Renda neta mitjana per persona i per llar (INE Op. 353)',
    fetch: async ({ province, municipality, neighborhood }) => {
        try {
            if (!province && !municipality) return [];

            const provinceName = normalizeStr(province || '');
            const municipalityName = normalizeStr(municipality || '');

            const tableId = Object.entries(INE_RENTA_TABLE_IDS).find(
                ([key]) => provinceName.includes(key) || key.includes(provinceName)
            )?.[1];

            if (tableId) {
                return await fetchDetailedRenta(tableId, municipalityName, neighborhood || '');
            }

            return await fetchProvinceRenta(provinceName || municipalityName);
        } catch (e) {
            return [];
        }
    },
};

async function fetchDetailedRenta(tableId: number, municipality: string, neighborhood: string): Promise<Record<string, unknown>[]> {
    const url = `https://servicios.ine.es/wstempus/jsCache/ES/DATOS_TABLA/${tableId}?nult=1`;
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) return [];

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return [];

    const target = municipality.toLowerCase();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const findMatch = (nameFilter: (n: string) => boolean, indicator: string): any => {
        return data.find((item: { Nombre?: string }) => {
            const n = normalizeStr(item.Nombre || '');
            return nameFilter(n) && n.includes(indicator);
        });
    };

    let matchLevel = 'municipi';
    let matchPersona = null;
    let matchLlar = null;

    if (neighborhood && target.includes('barcelona')) {
        const districtNum = getBarcelonaDistrictNumber(neighborhood);
        if (districtNum) {
            const distFilter = (n: string) => n.includes(`${target} distrito ${districtNum}.`) || n.includes(`${target} distrito ${districtNum} `);
            matchPersona = findMatch(distFilter, 'renta neta media por persona');
            matchLlar = findMatch(distFilter, 'renta neta media por hogar');
            if (matchPersona || matchLlar) matchLevel = `districte ${districtNum}`;
        }
    }

    if (!matchPersona && !matchLlar) {
        const muniFilter = (n: string) => n.startsWith(target + '.') && !n.includes('distrito') && !n.includes('seccion');
        matchPersona = findMatch(muniFilter, 'renta neta media por persona');
        matchLlar = findMatch(muniFilter, 'renta neta media por hogar');
        matchLevel = 'municipi';
    }

    if (!matchPersona && !matchLlar) {
        const broadFilter = (n: string) => n.includes(target) && !n.includes('distrito') && !n.includes('seccion');
        matchPersona = findMatch(broadFilter, 'renta neta media por persona');
        matchLlar = findMatch(broadFilter, 'renta neta media por hogar');
    }

    if (!matchPersona && !matchLlar) return [];

    const label = (matchPersona || matchLlar)?.Nombre?.split('.')[0]?.trim() || municipality;
    const result: Record<string, unknown> = {
        municipi: label,
        nivell: matchLevel,
    };

    if (matchPersona?.Data?.[0]) {
        const val = matchPersona.Data[0].Valor;
        result['renda_persona'] = val ? `${Number(val).toLocaleString('es-ES')} EUR` : 'No disponible';
        result['any_persona'] = matchPersona.Data[0].Anyo || '';
    }

    if (matchLlar?.Data?.[0]) {
        const val = matchLlar.Data[0].Valor;
        result['renda_llar'] = val ? `${Number(val).toLocaleString('es-ES')} EUR` : 'No disponible';
        result['any_llar'] = matchLlar.Data[0].Anyo || '';
    }

    return [result];
}

async function fetchProvinceRenta(province: string): Promise<Record<string, unknown>[]> {
    const url = `https://servicios.ine.es/wstempus/jsCache/ES/DATOS_TABLA/53689?nult=1`;
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) return [];

    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return [];

    const target = province;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchPersona = data.find((item: any) => {
        const n = normalizeStr(item.Nombre || '');
        return n.includes(target) && n.includes('renta neta media por persona');
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchLlar = data.find((item: any) => {
        const n = normalizeStr(item.Nombre || '');
        return n.includes(target) && n.includes('renta neta media por hogar');
    });

    if (!matchPersona && !matchLlar) return [];

    const label = (matchPersona || matchLlar)?.Nombre?.split('.')[0]?.trim() || province;
    const result: Record<string, unknown> = {
        municipi: label,
        nivell: 'província',
    };

    if (matchPersona?.Data?.[0]) {
        result['renda_persona'] = `${Number(matchPersona.Data[0].Valor).toLocaleString('es-ES')} EUR`;
        result['any_persona'] = matchPersona.Data[0].Anyo || '';
    }
    if (matchLlar?.Data?.[0]) {
        result['renda_llar'] = `${Number(matchLlar.Data[0].Valor).toLocaleString('es-ES')} EUR`;
        result['any_llar'] = matchLlar.Data[0].Anyo || '';
    }

    return [result];
}

function getBarcelonaDistrictNumber(neighborhood: string): string | null {
    const n = normalizeStr(neighborhood);
    const mapping: Record<string, string> = {
        'ciutat vella': '01', 'el raval': '01', 'gotic': '01', 'barceloneta': '01', 'born': '01', 'sant pere': '01',
        'eixample': '02', 'sagrada familia': '02', 'sant antoni': '02', 'dreta eixample': '02', 'esquerra eixample': '02', 'fort pienc': '02',
        'sants': '03', 'montjuic': '03', 'sants-montjuic': '03', 'poble sec': '03', 'hostafrancs': '03', 'la marina': '03', 'font de la guatlla': '03',
        'les corts': '04', 'pedralbes': '04', 'la maternitat': '04',
        'sarria': '05', 'sant gervasi': '05', 'sarria-sant gervasi': '05', 'putget': '05', 'bonanova': '05', 'tres torres': '05', 'vallvidrera': '05', 'galvany': '05',
        'gracia': '06', 'vila de gracia': '06', 'camp d\'en grassot': '06', 'vallcarca': '06', 'coll': '06', 'salut': '06', 'penitents': '06',
        'horta': '07', 'guinardo': '07', 'horta-guinardo': '07', 'carmel': '07', 'teixonera': '07', 'vall d\'hebron': '07', 'montbau': '07',
        'nou barris': '08', 'torre baro': '08', 'ciutat meridiana': '08', 'roquetes': '08', 'verdun': '08', 'prosperitat': '08', 'trinitat nova': '08', 'canyelles': '08', 'guineueta': '08',
        'sant andreu': '09', 'sagrera': '09', 'congres': '09', 'navas': '09', 'bon pastor': '09', 'trinitat vella': '09', 'baro de viver': '09',
        'sant marti': '10', 'poblenou': '10', 'vila olimpica': '10', 'diagonal mar': '10', 'besos': '10', 'clot': '10', 'verneda': '10', 'provencals': '10', 'el parc': '10',
    };

    for (const [key, val] of Object.entries(mapping)) {
        if (n.includes(key) || key.includes(n)) return val;
    }
    return null;
}

// ============================================================
// INE - Índex de Preus de Lloguer (Op. 432)
// ============================================================
const ineRentalIndex: OpenDataSource = {
    name: 'INE - Índex de Preus de Lloguer',
    description: 'Índex de preus de lloguer d\'habitatge (INE Op. 432)',
    fetch: async ({ municipality }) => {
        try {
            if (!municipality) return [];

            const url = `https://servicios.ine.es/wstempus/jsCache/ES/DATOS_TABLA/59060?nult=2`;
            const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
            if (!response.ok) return [];

            const data = await response.json();
            if (!Array.isArray(data) || data.length === 0) return [];

            const target = normalizeStr(municipality);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const match = data.find((item: any) => {
                const n = normalizeStr(item.Nombre || '');
                return n.startsWith(target + '.') && n.includes('indice') && n.includes('total');
            });

            if (!match?.Data || match.Data.length === 0) return [];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sorted = [...match.Data].sort((a: any, b: any) => (b.Anyo || 0) - (a.Anyo || 0));

            const latest = sorted[0];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const previous = sorted.find((d: any) => d.Anyo === latest.Anyo - 1);

            const result: Record<string, unknown> = {
                municipi: match.Nombre,
                index_lloguer: latest.Valor ? Number(latest.Valor).toFixed(1) : 'No disponible',
                any: latest.Anyo || '',
            };

            if (previous?.Valor && latest?.Valor) {
                const variation = ((Number(latest.Valor) - Number(previous.Valor)) / Number(previous.Valor) * 100);
                result['variacio_anual'] = `${variation >= 0 ? '+' : ''}${variation.toFixed(1)}%`;
            }

            return [result];
        } catch (e) {
            return [];
        }
    },
};

// ============================================================
// ICAEN - Certificats Energètics (Catalunya only)
// ============================================================
const icaenEnergyCerts: OpenDataSource = {
    name: 'ICAEN - Certificats Energètics',
    description: 'Certificació energètica d\'edificis (Catalunya)',
    fetch: async ({ rc, province }) => {
        try {
            if (!rc) return [];

            const catalanProvinces = ['barcelona', 'girona', 'lleida', 'tarragona'];
            const provinceLower = normalizeStr(province || '');
            if (!catalanProvinces.some(p => provinceLower.includes(p))) return [];

            const url = `https://analisi.transparenciacatalunya.cat/resource/j6ii-t3w2.json?$where=referencia_cadastral='${rc}'&$limit=5`;
            const response = await fetch(url, { signal: AbortSignal.timeout(5000), headers: { 'Accept': 'application/json' } });

            if (!response.ok) return [];
            const data = await response.json();
            if (!Array.isArray(data) || data.length === 0) return [];

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return data.map((cert: any) => ({
                qualificacio_energetica: cert.qualificacio_energetica || cert.qualificacio_d_emissions || cert.qualificacio || '-',
                emissions_co2: cert.emissions_co2
                    ? `${Number(cert.emissions_co2).toFixed(1)} kg CO\u2082/m\u00B2 any`
                    : (cert.emissions ? `${Number(cert.emissions).toFixed(1)} kg CO\u2082/m\u00B2 any` : '-'),
                consum_energia: cert.consum_energia_primaria
                    ? `${Number(cert.consum_energia_primaria).toFixed(1)} kWh/m\u00B2 any`
                    : (cert.consum ? `${Number(cert.consum).toFixed(1)} kWh/m\u00B2 any` : '-'),
                any_certificat: cert.any_certificacio || cert.data_certificat || '-',
            }));
        } catch (e) {
            return [];
        }
    },
};

// ============================================================
// Open Data BCN - Renda Familiar
// ============================================================
const incomeData: OpenDataSource = {
    name: 'Open Data BCN (Renda)',
    description: 'Renda neta mitjana per llar (2023)',
    fetch: async ({ neighborhood }) => {
        try {
            if (!neighborhood) return [];

            const resourceId = '2fa04f5b-764b-4eea-80ca-35d21b149523';
            const url = `https://opendata-ajuntament.barcelona.cat/data/api/3/action/datastore_search?resource_id=${resourceId}&limit=100&q=${encodeURIComponent(neighborhood)}`;
            const response = await fetch(url, { signal: AbortSignal.timeout(5000) });

            if (response.ok) {
                const data = await response.json();
                if (data?.result?.records?.length > 0) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const relevant = data.result.records.filter((r: any) =>
                        r.Nom_Barri && (r.Nom_Barri.toLowerCase().includes(neighborhood.toLowerCase()) ||
                            neighborhood.toLowerCase().includes(r.Nom_Barri?.toLowerCase()))
                    );

                    if (relevant.length === 0) return [];

                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const total = relevant.reduce((sum: number, r: any) => sum + (parseFloat(r.Import_Euros) || 0), 0);
                    const average = Math.round(total / relevant.length);

                    return [{
                        barri: relevant[0].Nom_Barri,
                        renda: average.toLocaleString('es-ES') + ' \u20AC',
                        any: relevant[0].Any || '2023'
                    }];
                }
            }
            return [];
        } catch {
            return [];
        }
    },
};

// ============================================================
// Barcelona Open Data (CKAN API) - Cultura
// ============================================================
const barcelonaOpenData: OpenDataSource = {
    name: 'Open Data BCN (Cultura)',
    description: 'Biblioteques i Museus de Barcelona',
    fetch: async ({ lat, lng, streetName }) => {
        try {
            const resourceId = 'd4803f9b-5f01-48d5-aeef-4ebbd76c5fd7';
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mapRecord = (record: any) => ({
                name: record.name,
                address: `${record.addresses_road_name || ''} ${record.addresses_start_street_number || ''}, ${record.addresses_district_name || ''}`,
                ...record
            });

            const sql = `SELECT * FROM "${resourceId}" WHERE "geo_epgs_4326_lat" IS NOT NULL ORDER BY (POWER("geo_epgs_4326_lat"::float - ${lat}, 2) + POWER("geo_epgs_4326_lon"::float - ${lng}, 2)) ASC LIMIT 3`;
            const sqlUrl = `https://opendata-ajuntament.barcelona.cat/data/api/3/action/datastore_search_sql?sql=${encodeURIComponent(sql)}`;

            const sqlResponse = await fetch(sqlUrl, { signal: AbortSignal.timeout(5000) });
            if (sqlResponse.ok) {
                const data = await sqlResponse.json();
                if (data?.result?.records?.length > 0) {
                    return data.result.records.map(mapRecord);
                }
            }

            const query = streetName ? streetName : `${lat},${lng}`;
            const url = `https://opendata-ajuntament.barcelona.cat/data/api/3/action/datastore_search?resource_id=${resourceId}&limit=5&q=${encodeURIComponent(query)}`;
            const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
            if (response.ok) {
                const data = await response.json();
                if (data?.result?.records) {
                    return data.result.records.map(mapRecord);
                }
            }
            return [];
        } catch {
            return [];
        }
    },
};

// ============================================================
// Madrid Open Data
// ============================================================
const madridOpenData: OpenDataSource = {
    name: 'Datos Abiertos Madrid',
    description: 'Cat\u00e0leg de b\u00e9ns protegits de Madrid',
    fetch: async ({ lat, lng }) => {
        try {
            const url = `https://datos.madrid.es/egob/catalogo/tipo/dataset/300075-0-bienes-protegidos.json?latitud=${lat}&longitud=${lng}&radio=100`;
            const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
            if (!response.ok) return [];
            const data = await response.json();
            return data?.['@graph'] || [];
        } catch {
            return [];
        }
    },
};

// ============================================================
// Handler
// ============================================================
export async function opendataHttp(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const lat = parseFloat(request.query.get('lat') || '0');
    const lng = parseFloat(request.query.get('lng') || '0');
    const municipality = request.query.get('municipality') || '';
    const rc = request.query.get('rc') || '';
    const streetName = request.query.get('streetName') || '';
    const streetNumber = request.query.get('streetNumber') || '';
    const neighborhood = request.query.get('neighborhood') || '';
    const province = request.query.get('province') || '';

    if (!lat || !lng) {
        return { status: 400, jsonBody: { error: 'Missing coordinates' } };
    }

    const sources: OpenDataSource[] = [ineData, ineRentaAtlas, ineRentalIndex];
    const municipalityLower = municipality.toLowerCase();

    if (municipalityLower.includes('barcelona')) {
        sources.push(incomeData);
        sources.push(barcelonaOpenData);
    } else if (municipalityLower.includes('madrid')) {
        sources.push(madridOpenData);
    }

    const catalanProvinces = ['barcelona', 'girona', 'lleida', 'tarragona'];
    const provinceLower = normalizeStr(province);
    if (catalanProvinces.some(p => provinceLower.includes(p))) {
        sources.push(icaenEnergyCerts);
    }

    const results = await Promise.allSettled(
        sources.map(async (source) => {
            try {
                const data = await source.fetch({ lat, lng, municipality, streetName, streetNumber, neighborhood, rc, province });
                return { source: source.name, description: source.description, data };
            } catch (e) {
                return null;
            }
        })
    );

    const openDataResults = results
        .filter(
            (r): r is PromiseFulfilledResult<{ source: string; description: string; data: Record<string, unknown>[] }> =>
                r.status === 'fulfilled' && r.value !== null && r.value.data && r.value.data.length > 0
        )
        // @ts-ignore
        .map((r) => r.value);

    return { status: 200, jsonBody: { openData: openDataResults } };
}

app.http('opendata', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: opendataHttp
});
