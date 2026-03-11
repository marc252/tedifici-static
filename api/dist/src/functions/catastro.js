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
exports.catastroHttp = void 0;
const functions_1 = require("@azure/functions");
const fast_xml_parser_1 = require("fast-xml-parser");
const catastro_parser_1 = require("../lib/catastro-parser");
// IMPORTANT: Use HTTP (not HTTPS) for Catastro OVC
const CATASTRO_BASE = 'http://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC';
function getRCFromCoordinates(lat, lng) {
    return __awaiter(this, void 0, void 0, function* () {
        const url = `${CATASTRO_BASE}/OVCCoordenadas.asmx/Consulta_RCCOOR?SRS=EPSG:4326&Coordenada_X=${lng}&Coordenada_Y=${lat}`;
        const response = yield fetch(url, { headers: { 'Accept': 'application/xml, text/xml' } });
        if (!response.ok)
            return { rc: null, address: null, error: `Error connectant al Catastro: HTTP ${response.status}` };
        const xmlText = yield response.text();
        return (0, catastro_parser_1.parseCoordinatesResponse)(xmlText);
    });
}
function getBuildingGeometry(rc) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const parcelRC = rc.substring(0, 14);
            const url = `http://ovc.catastro.meh.es/INSPIRE/wfsBU.aspx?service=wfs&version=2.0.0&request=getfeature&StoredQuerie_id=GetBuildingByParcel&REFCAT=${parcelRC}&srsname=EPSG::4326`;
            const response = yield fetch(url, { signal: AbortSignal.timeout(8000), headers: { 'Accept': 'application/xml, text/xml' } });
            if (!response.ok)
                return null;
            const xmlText = yield response.text();
            const parser = new fast_xml_parser_1.XMLParser({ ignoreAttributes: false, removeNSPrefix: true });
            const parsed = parser.parse(xmlText);
            const posListStr = findPosList(parsed);
            if (!posListStr)
                return null;
            const coords = posListStr.trim().split(/\s+/).map(Number);
            const ring = [];
            for (let i = 0; i < coords.length - 1; i += 2) {
                ring.push([coords[i + 1], coords[i]]);
            }
            if (ring.length > 0 && (ring[0][0] !== ring[ring.length - 1][0] || ring[0][1] !== ring[ring.length - 1][1])) {
                ring.push([...ring[0]]);
            }
            return ring.length >= 4 ? [ring] : null;
        }
        catch (error) {
            return null;
        }
    });
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function findPosList(obj) {
    if (typeof obj === 'string')
        return null;
    if (obj === null || obj === undefined)
        return null;
    if (obj.posList !== undefined) {
        return typeof obj.posList === 'string' ? obj.posList : String(obj.posList);
    }
    if (typeof obj === 'object') {
        for (const key of Object.keys(obj)) {
            const result = findPosList(obj[key]);
            if (result)
                return result;
        }
    }
    return null;
}
function getParcelUnits(rc, xmlText) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const { totalUnits, units: unitList } = (0, catastro_parser_1.parseUnitListResponse)(xmlText);
            if (totalUnits <= 1 || unitList.length === 0)
                return { units: [], totalUnits };
            const pc1 = rc.substring(0, 7);
            const pc2 = rc.substring(7, 14);
            const unitsToFetch = unitList.slice(0, 30);
            const detailResults = yield Promise.allSettled(unitsToFetch.map((unit) => __awaiter(this, void 0, void 0, function* () {
                const unitRC = `${pc1}${pc2}${unit.car}`;
                const url = `${CATASTRO_BASE}/OVCCallejero.asmx/Consulta_DNPRC?Provincia=&Municipio=&RC=${encodeURIComponent(unitRC)}`;
                const response = yield fetch(url, { headers: { 'Accept': 'application/xml, text/xml' }, signal: AbortSignal.timeout(8000) });
                if (!response.ok)
                    return null;
                const detailXml = yield response.text();
                return (0, catastro_parser_1.parseUnitDetailResponse)(detailXml, pc1, pc2, unit.car);
            })));
            const units = detailResults
                .filter((r) => r.status === 'fulfilled' && r.value !== null)
                .map(r => r.value);
            units.sort((a, b) => {
                const floorA = parseInt(a.planta) || 0;
                const floorB = parseInt(b.planta) || 0;
                if (floorA !== floorB)
                    return floorA - floorB;
                return (parseInt(a.porta) || 0) - (parseInt(b.porta) || 0);
            });
            return { units, totalUnits };
        }
        catch (error) {
            return { units: [], totalUnits: 0 };
        }
    });
}
function catastroHttp(request, context) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    return __awaiter(this, void 0, void 0, function* () {
        const lat = request.query.get('lat');
        const lng = request.query.get('lng');
        if (!lat || !lng) {
            return { status: 400, jsonBody: { error: 'Cal proporcionar coordenades (lat, lng)' } };
        }
        try {
            const rcResult = yield getRCFromCoordinates(parseFloat(lat), parseFloat(lng));
            if (!rcResult.rc) {
                return { status: 404, jsonBody: { error: rcResult.error || 'No s\'ha trobat cap referència cadastral per a aquesta ubicació.', catastro: null } };
            }
            const dnprcUrl = `${CATASTRO_BASE}/OVCCallejero.asmx/Consulta_DNPRC?Provincia=&Municipio=&RC=${encodeURIComponent(rcResult.rc)}`;
            const dnprcResponse = yield fetch(dnprcUrl, { headers: { 'Accept': 'application/xml, text/xml' } });
            const dnprcXml = dnprcResponse.ok ? yield dnprcResponse.text() : '';
            const details = dnprcXml ? (0, catastro_parser_1.parseBuildingDetailsResponse)(dnprcXml) : { data: null, error: 'Failed' };
            const [geometryResult, unitsResult] = yield Promise.allSettled([
                getBuildingGeometry(rcResult.rc),
                dnprcXml ? getParcelUnits(rcResult.rc, dnprcXml) : Promise.resolve({ units: [], totalUnits: 0 }),
            ]);
            const buildingGeometry = geometryResult.status === 'fulfilled' ? geometryResult.value : null;
            const { units, totalUnits } = unitsResult.status === 'fulfilled' ? unitsResult.value : { units: [], totalUnits: 0 };
            const catastroData = {
                referenciaCadastral: ((_a = details.data) === null || _a === void 0 ? void 0 : _a.referenciaCadastral) || rcResult.rc,
                anyConstruccio: ((_b = details.data) === null || _b === void 0 ? void 0 : _b.anyConstruccio) || '',
                us: ((_c = details.data) === null || _c === void 0 ? void 0 : _c.us) || '',
                superficieConstruida: ((_d = details.data) === null || _d === void 0 ? void 0 : _d.superficieConstruida) || '',
                superficieSol: ((_e = details.data) === null || _e === void 0 ? void 0 : _e.superficieSol) || '',
                direccio: ((_f = details.data) === null || _f === void 0 ? void 0 : _f.direccio) || rcResult.address || '',
                municipi: ((_g = details.data) === null || _g === void 0 ? void 0 : _g.municipi) || '',
                provincia: ((_h = details.data) === null || _h === void 0 ? void 0 : _h.provincia) || '',
                tipusImmoble: ((_j = details.data) === null || _j === void 0 ? void 0 : _j.tipusImmoble) || '',
                croquis: (0, catastro_parser_1.getCroquisUrl)(rcResult.rc),
                facadeImage: (0, catastro_parser_1.getFacadeImageUrl)(rcResult.rc),
                elements: ((_k = details.data) === null || _k === void 0 ? void 0 : _k.elements) || [],
                units: units.length > 0 ? units : undefined,
                totalUnits: totalUnits > 1 ? totalUnits : undefined,
            };
            return { status: 200, jsonBody: { catastro: catastroData, buildingGeometry, error: null } };
        }
        catch (error) {
            return { status: 500, jsonBody: { error: `Error del Catastro: ${error instanceof Error ? error.message : String(error)}`, catastro: null } };
        }
    });
}
exports.catastroHttp = catastroHttp;
functions_1.app.http('catastro', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: catastroHttp
});
//# sourceMappingURL=catastro.js.map