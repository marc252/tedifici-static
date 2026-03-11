"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.opendataHttp = void 0;
const functions_1 = require("@azure/functions");
// Helper: normalize strings for fuzzy municipality matching
const normalizeStr = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const findINEMatch = (data, municipality) => {
    if (!Array.isArray(data) || data.length === 0)
        return null;
    const target = normalizeStr(municipality);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.find((item) => {
        const n = normalizeStr(item.Nombre || '');
        return n === target || n.includes(target) || target.includes(n);
    });
};
// ============================================================
// INE - Dades Demogràfiques (Població oficial)
// ============================================================
const ineData = {
    name: 'INE - Dades Demogràfiques',
    description: 'Població oficial per província (INE)',
    fetch: ({ province, municipality }) => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f;
        try {
            const searchTerm = province || municipality;
            if (!searchTerm)
                return [];
            const url = `https://servicios.ine.es/wstempus/jsCache/ES/DATOS_TABLA/2852?nult=1`;
            const response = yield fetch(url, { signal: AbortSignal.timeout(10000) });
            if (!response.ok)
                return [];
            const data = yield response.json();
            if (!Array.isArray(data) || data.length === 0)
                return [];
            const target = normalizeStr(searchTerm);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const match = data.find((item) => {
                const n = normalizeStr(item.Nombre || '');
                return n.startsWith(target + '.') && n.includes('total') && n.includes('habitantes');
            });
            if (!match)
                return [];
            const label = ((_b = (_a = match.Nombre) === null || _a === void 0 ? void 0 : _a.split('.')[0]) === null || _b === void 0 ? void 0 : _b.trim()) || searchTerm;
            return [{
                    provincia: label,
                    poblacio: ((_d = (_c = match.Data) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.Valor) ? Math.round(Number(match.Data[0].Valor)).toLocaleString('es-ES') : 'No disponible',
                    any: ((_f = (_e = match.Data) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.Anyo) || '',
                }];
        }
        catch (_g) {
            return [];
        }
    }),
};
// ============================================================
// INE - Atlas de Renda (Op. 353) - Renda per persona i per llar
// ============================================================
const INE_RENTA_TABLE_IDS = {
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
const ineRentaAtlas = {
    name: 'INE - Atlas de Renda',
    description: 'Renda neta mitjana per persona i per llar (INE Op. 353)',
    fetch: ({ province, municipality, neighborhood }) => __awaiter(void 0, void 0, void 0, function* () {
        var _h;
        try {
            if (!province && !municipality)
                return [];
            const provinceName = normalizeStr(province || '');
            const municipalityName = normalizeStr(municipality || '');
            const tableId = (_h = Object.entries(INE_RENTA_TABLE_IDS).find(([key]) => provinceName.includes(key) || key.includes(provinceName))) === null || _h === void 0 ? void 0 : _h[1];
            if (tableId) {
                return yield fetchDetailedRenta(tableId, municipalityName, neighborhood || '');
            }
            return yield fetchProvinceRenta(provinceName || municipalityName);
        }
        catch (e) {
            return [];
        }
    }),
};
function fetchDetailedRenta(tableId, municipality, neighborhood) {
    var _a, _b, _c, _d, _e;
    return __awaiter(this, void 0, void 0, function* () {
        const url = `https://servicios.ine.es/wstempus/jsCache/ES/DATOS_TABLA/${tableId}?nult=1`;
        const response = yield fetch(url, { signal: AbortSignal.timeout(20000) });
        if (!response.ok)
            return [];
        const data = yield response.json();
        if (!Array.isArray(data) || data.length === 0)
            return [];
        const target = municipality.toLowerCase();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const findMatch = (nameFilter, indicator) => {
            return data.find((item) => {
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
                const distFilter = (n) => n.includes(`${target} distrito ${districtNum}.`) || n.includes(`${target} distrito ${districtNum} `);
                matchPersona = findMatch(distFilter, 'renta neta media por persona');
                matchLlar = findMatch(distFilter, 'renta neta media por hogar');
                if (matchPersona || matchLlar)
                    matchLevel = `districte ${districtNum}`;
            }
        }
        if (!matchPersona && !matchLlar) {
            const muniFilter = (n) => n.startsWith(target + '.') && !n.includes('distrito') && !n.includes('seccion');
            matchPersona = findMatch(muniFilter, 'renta neta media por persona');
            matchLlar = findMatch(muniFilter, 'renta neta media por hogar');
            matchLevel = 'municipi';
        }
        if (!matchPersona && !matchLlar) {
            const broadFilter = (n) => n.includes(target) && !n.includes('distrito') && !n.includes('seccion');
            matchPersona = findMatch(broadFilter, 'renta neta media por persona');
            matchLlar = findMatch(broadFilter, 'renta neta media por hogar');
        }
        if (!matchPersona && !matchLlar)
            return [];
        const label = ((_c = (_b = (_a = (matchPersona || matchLlar)) === null || _a === void 0 ? void 0 : _a.Nombre) === null || _b === void 0 ? void 0 : _b.split('.')[0]) === null || _c === void 0 ? void 0 : _c.trim()) || municipality;
        const result = {
            municipi: label,
            nivell: matchLevel,
        };
        if ((_d = matchPersona === null || matchPersona === void 0 ? void 0 : matchPersona.Data) === null || _d === void 0 ? void 0 : _d[0]) {
            const val = matchPersona.Data[0].Valor;
            result['renda_persona'] = val ? `${Number(val).toLocaleString('es-ES')} EUR` : 'No disponible';
            result['any_persona'] = matchPersona.Data[0].Anyo || '';
        }
        if ((_e = matchLlar === null || matchLlar === void 0 ? void 0 : matchLlar.Data) === null || _e === void 0 ? void 0 : _e[0]) {
            const val = matchLlar.Data[0].Valor;
            result['renda_llar'] = val ? `${Number(val).toLocaleString('es-ES')} EUR` : 'No disponible';
            result['any_llar'] = matchLlar.Data[0].Anyo || '';
        }
        return [result];
    });
}
function fetchProvinceRenta(province) {
    var _a, _b, _c, _d, _e;
    return __awaiter(this, void 0, void 0, function* () {
        const url = `https://servicios.ine.es/wstempus/jsCache/ES/DATOS_TABLA/53689?nult=1`;
        const response = yield fetch(url, { signal: AbortSignal.timeout(15000) });
        if (!response.ok)
            return [];
        const data = yield response.json();
        if (!Array.isArray(data) || data.length === 0)
            return [];
        const target = province;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const matchPersona = data.find((item) => {
            const n = normalizeStr(item.Nombre || '');
            return n.includes(target) && n.includes('renta neta media por persona');
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const matchLlar = data.find((item) => {
            const n = normalizeStr(item.Nombre || '');
            return n.includes(target) && n.includes('renta neta media por hogar');
        });
        if (!matchPersona && !matchLlar)
            return [];
        const label = ((_c = (_b = (_a = (matchPersona || matchLlar)) === null || _a === void 0 ? void 0 : _a.Nombre) === null || _b === void 0 ? void 0 : _b.split('.')[0]) === null || _c === void 0 ? void 0 : _c.trim()) || province;
        const result = {
            municipi: label,
            nivell: 'província',
        };
        if ((_d = matchPersona === null || matchPersona === void 0 ? void 0 : matchPersona.Data) === null || _d === void 0 ? void 0 : _d[0]) {
            result['renda_persona'] = `${Number(matchPersona.Data[0].Valor).toLocaleString('es-ES')} EUR`;
            result['any_persona'] = matchPersona.Data[0].Anyo || '';
        }
        if ((_e = matchLlar === null || matchLlar === void 0 ? void 0 : matchLlar.Data) === null || _e === void 0 ? void 0 : _e[0]) {
            result['renda_llar'] = `${Number(matchLlar.Data[0].Valor).toLocaleString('es-ES')} EUR`;
            result['any_llar'] = matchLlar.Data[0].Anyo || '';
        }
        return [result];
    });
}
function getBarcelonaDistrictNumber(neighborhood) {
    const n = normalizeStr(neighborhood);
    const mapping = {
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
        if (n.includes(key) || key.includes(n))
            return val;
    }
    return null;
}
// ============================================================
// INE - Índex de Preus de Lloguer (Op. 432)
// ============================================================
const ineRentalIndex = {
    name: 'INE - Índex de Preus de Lloguer',
    description: 'Índex de preus de lloguer d\'habitatge (INE Op. 432)',
    fetch: ({ municipality }) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (!municipality)
                return [];
            const url = `https://servicios.ine.es/wstempus/jsCache/ES/DATOS_TABLA/59060?nult=2`;
            const response = yield fetch(url, { signal: AbortSignal.timeout(15000) });
            if (!response.ok)
                return [];
            const data = yield response.json();
            if (!Array.isArray(data) || data.length === 0)
                return [];
            const target = normalizeStr(municipality);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const match = data.find((item) => {
                const n = normalizeStr(item.Nombre || '');
                return n.startsWith(target + '.') && n.includes('indice') && n.includes('total');
            });
            if (!(match === null || match === void 0 ? void 0 : match.Data) || match.Data.length === 0)
                return [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sorted = [...match.Data].sort((a, b) => (b.Anyo || 0) - (a.Anyo || 0));
            const latest = sorted[0];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const previous = sorted.find((d) => d.Anyo === latest.Anyo - 1);
            const result = {
                municipi: match.Nombre,
                index_lloguer: latest.Valor ? Number(latest.Valor).toFixed(1) : 'No disponible',
                any: latest.Anyo || '',
            };
            if ((previous === null || previous === void 0 ? void 0 : previous.Valor) && (latest === null || latest === void 0 ? void 0 : latest.Valor)) {
                const variation = ((Number(latest.Valor) - Number(previous.Valor)) / Number(previous.Valor) * 100);
                result['variacio_anual'] = `${variation >= 0 ? '+' : ''}${variation.toFixed(1)}%`;
            }
            return [result];
        }
        catch (e) {
            return [];
        }
    }),
};
// ============================================================
// ICAEN - Certificats Energètics (Catalunya only)
// ============================================================
const icaenEnergyCerts = {
    name: 'ICAEN - Certificats Energètics',
    description: 'Certificació energètica d\'edificis (Catalunya)',
    fetch: ({ rc, province }) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            if (!rc)
                return [];
            const catalanProvinces = ['barcelona', 'girona', 'lleida', 'tarragona'];
            const provinceLower = normalizeStr(province || '');
            if (!catalanProvinces.some(p => provinceLower.includes(p)))
                return [];
            const url = `https://analisi.transparenciacatalunya.cat/resource/j6ii-t3w2.json?$where=referencia_cadastral='${rc}'&$limit=5`;
            const response = yield fetch(url, { signal: AbortSignal.timeout(5000), headers: { 'Accept': 'application/json' } });
            if (!response.ok)
                return [];
            const data = yield response.json();
            if (!Array.isArray(data) || data.length === 0)
                return [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return data.map((cert) => ({
                qualificacio_energetica: cert.qualificacio_energetica || cert.qualificacio_d_emissions || cert.qualificacio || '-',
                emissions_co2: cert.emissions_co2
                    ? `${Number(cert.emissions_co2).toFixed(1)} kg CO\u2082/m\u00B2 any`
                    : (cert.emissions ? `${Number(cert.emissions).toFixed(1)} kg CO\u2082/m\u00B2 any` : '-'),
                consum_energia: cert.consum_energia_primaria
                    ? `${Number(cert.consum_energia_primaria).toFixed(1)} kWh/m\u00B2 any`
                    : (cert.consum ? `${Number(cert.consum).toFixed(1)} kWh/m\u00B2 any` : '-'),
                any_certificat: cert.any_certificacio || cert.data_certificat || '-',
            }));
        }
        catch (e) {
            return [];
        }
    }),
};
// ============================================================
// Open Data BCN - Renda Familiar
// ============================================================
const incomeData = {
    name: 'Open Data BCN (Renda)',
    description: 'Renda neta mitjana per llar (2023)',
    fetch: ({ neighborhood }) => __awaiter(void 0, void 0, void 0, function* () {
        var _j, _k;
        try {
            if (!neighborhood)
                return [];
            const resourceId = '2fa04f5b-764b-4eea-80ca-35d21b149523';
            const url = `https://opendata-ajuntament.barcelona.cat/data/api/3/action/datastore_search?resource_id=${resourceId}&limit=100&q=${encodeURIComponent(neighborhood)}`;
            const response = yield fetch(url, { signal: AbortSignal.timeout(5000) });
            if (response.ok) {
                const data = yield response.json();
                if (((_k = (_j = data === null || data === void 0 ? void 0 : data.result) === null || _j === void 0 ? void 0 : _j.records) === null || _k === void 0 ? void 0 : _k.length) > 0) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const relevant = data.result.records.filter((r) => {
                        var _a;
                        return r.Nom_Barri && (r.Nom_Barri.toLowerCase().includes(neighborhood.toLowerCase()) ||
                            neighborhood.toLowerCase().includes((_a = r.Nom_Barri) === null || _a === void 0 ? void 0 : _a.toLowerCase()));
                    });
                    if (relevant.length === 0)
                        return [];
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const total = relevant.reduce((sum, r) => sum + (parseFloat(r.Import_Euros) || 0), 0);
                    const average = Math.round(total / relevant.length);
                    return [{
                            barri: relevant[0].Nom_Barri,
                            renda: average.toLocaleString('es-ES') + ' \u20AC',
                            any: relevant[0].Any || '2023'
                        }];
                }
            }
            return [];
        }
        catch (_l) {
            return [];
        }
    }),
};
// ============================================================
// Barcelona Open Data (CKAN API) - Cultura
// ============================================================
const barcelonaOpenData = {
    name: 'Open Data BCN (Cultura)',
    description: 'Biblioteques i Museus de Barcelona',
    fetch: ({ lat, lng, streetName }) => __awaiter(void 0, void 0, void 0, function* () {
        var _m, _o, _p;
        try {
            const resourceId = 'd4803f9b-5f01-48d5-aeef-4ebbd76c5fd7';
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const mapRecord = (record) => (Object.assign({ name: record.name, address: `${record.addresses_road_name || ''} ${record.addresses_start_street_number || ''}, ${record.addresses_district_name || ''}` }, record));
            const sql = `SELECT * FROM "${resourceId}" WHERE "geo_epgs_4326_lat" IS NOT NULL ORDER BY (POWER("geo_epgs_4326_lat"::float - ${lat}, 2) + POWER("geo_epgs_4326_lon"::float - ${lng}, 2)) ASC LIMIT 3`;
            const sqlUrl = `https://opendata-ajuntament.barcelona.cat/data/api/3/action/datastore_search_sql?sql=${encodeURIComponent(sql)}`;
            const sqlResponse = yield fetch(sqlUrl, { signal: AbortSignal.timeout(5000) });
            if (sqlResponse.ok) {
                const data = yield sqlResponse.json();
                if (((_o = (_m = data === null || data === void 0 ? void 0 : data.result) === null || _m === void 0 ? void 0 : _m.records) === null || _o === void 0 ? void 0 : _o.length) > 0) {
                    return data.result.records.map(mapRecord);
                }
            }
            const query = streetName ? streetName : `${lat},${lng}`;
            const url = `https://opendata-ajuntament.barcelona.cat/data/api/3/action/datastore_search?resource_id=${resourceId}&limit=5&q=${encodeURIComponent(query)}`;
            const response = yield fetch(url, { signal: AbortSignal.timeout(5000) });
            if (response.ok) {
                const data = yield response.json();
                if ((_p = data === null || data === void 0 ? void 0 : data.result) === null || _p === void 0 ? void 0 : _p.records) {
                    return data.result.records.map(mapRecord);
                }
            }
            return [];
        }
        catch (_q) {
            return [];
        }
    }),
};
// ============================================================
// Madrid Open Data
// ============================================================
const madridOpenData = {
    name: 'Datos Abiertos Madrid',
    description: 'Cat\u00e0leg de b\u00e9ns protegits de Madrid',
    fetch: ({ lat, lng }) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const url = `https://datos.madrid.es/egob/catalogo/tipo/dataset/300075-0-bienes-protegidos.json?latitud=${lat}&longitud=${lng}&radio=100`;
            const response = yield fetch(url, { signal: AbortSignal.timeout(5000) });
            if (!response.ok)
                return [];
            const data = yield response.json();
            return (data === null || data === void 0 ? void 0 : data['@graph']) || [];
        }
        catch (_r) {
            return [];
        }
    }),
};
// ============================================================
// Handler
// ============================================================
function opendataHttp(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
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
        const sources = [ineData, ineRentaAtlas, ineRentalIndex];
        const municipalityLower = municipality.toLowerCase();
        if (municipalityLower.includes('barcelona')) {
            sources.push(incomeData);
            sources.push(barcelonaOpenData);
        }
        else if (municipalityLower.includes('madrid')) {
            sources.push(madridOpenData);
        }
        const catalanProvinces = ['barcelona', 'girona', 'lleida', 'tarragona'];
        const provinceLower = normalizeStr(province);
        if (catalanProvinces.some(p => provinceLower.includes(p))) {
            sources.push(icaenEnergyCerts);
        }
        const results = yield Promise.allSettled(sources.map((source) => __awaiter(this, void 0, void 0, function* () {
            try {
                const data = yield source.fetch({ lat, lng, municipality, streetName, streetNumber, neighborhood, rc, province });
                return { source: source.name, description: source.description, data };
            }
            catch (e) {
                return null;
            }
        })));
        const openDataResults = results
            .filter((r) => r.status === 'fulfilled' && r.value !== null && r.value.data && r.value.data.length > 0)
            // @ts-ignore
            .map((r) => r.value);
        return { status: 200, jsonBody: { openData: openDataResults } };
    });
}
exports.opendataHttp = opendataHttp;
functions_1.app.http('opendata', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: opendataHttp
});
//# sourceMappingURL=opendata.js.map