"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFacadeImageUrl = exports.getCroquisUrl = exports.parseUnitDetailResponse = exports.parseUnitListResponse = exports.parseAddressSearchResponse = exports.parseBuildingDetailsResponse = exports.parseCoordinatesResponse = void 0;
/**
 * Parse the Catastro OVCCoordenadas Consulta_RCCOOR response using regex.
 * Simple and reliable (Tedifici-style).
 */
function parseCoordinatesResponse(xmlText) {
    // Check for error first
    const errMatch = xmlText.match(/<des>(.*?)<\/des>/);
    if (errMatch && !xmlText.includes('<pc1>')) {
        return { rc: null, address: null, error: `Error del Catastro: ${errMatch[1]}` };
    }
    const pc1Match = xmlText.match(/<pc1>(.*?)<\/pc1>/);
    const pc2Match = xmlText.match(/<pc2>(.*?)<\/pc2>/);
    if (pc1Match && pc2Match) {
        const rc = `${pc1Match[1]}${pc2Match[1]}`;
        // Extract address description if available
        const ldtMatch = xmlText.match(/<ldt>(.*?)<\/ldt>/);
        const address = ldtMatch ? ldtMatch[1] : null;
        if (rc.length < 10) {
            return { rc: null, address, error: 'Referència cadastral no vàlida.' };
        }
        return { rc, address, error: null };
    }
    // Try direct <rc> tag 
    const rcMatch = xmlText.match(/<rc>(.*?)<\/rc>/);
    if (rcMatch) {
        return { rc: rcMatch[1], address: null, error: null };
    }
    return { rc: null, address: null, error: 'No s\'ha trobat cap referència cadastral per a aquestes coordenades.' };
}
exports.parseCoordinatesResponse = parseCoordinatesResponse;
/**
 * Parse the Catastro Consulta_DNPRC response using regex.
 * Extracts building details: year, surface, usage, address.
 */
function parseBuildingDetailsResponse(xmlText) {
    // Check for error
    const errMatch = xmlText.match(/<des>(.*?)<\/des>/);
    const usoMatch = xmlText.match(/<luso>(.*?)<\/luso>/);
    if (errMatch && !usoMatch) {
        return { data: null, error: `Error del Catastro: ${errMatch[1]}` };
    }
    const surfaceMatch = xmlText.match(/<sfc>(.*?)<\/sfc>/);
    const yearMatch = xmlText.match(/<ant>(.*?)<\/ant>/);
    // Address components
    const tvMatch = xmlText.match(/<tv>(.*?)<\/tv>/); // Tipo Via (CL, AV, PZ...)
    const nvMatch = xmlText.match(/<nv>(.*?)<\/nv>/); // Nombre Via
    const pnpMatch = xmlText.match(/<pnp>(.*?)<\/pnp>/); // Numero
    // RC components
    const pc1Match = xmlText.match(/<pc1>(.*?)<\/pc1>/);
    const pc2Match = xmlText.match(/<pc2>(.*?)<\/pc2>/);
    const carMatch = xmlText.match(/<car>(.*?)<\/car>/);
    const ccMatch = xmlText.match(/<cc>(.*?)<\/cc>/);
    const cc1Match = xmlText.match(/<cc1>(.*?)<\/cc1>/);
    const cc2Match = xmlText.match(/<cc2>(.*?)<\/cc2>/);
    // Build full RC
    let fullRc = '';
    if (pc1Match && pc2Match) {
        const cc = ccMatch ? ccMatch[1] : (cc1Match && cc2Match ? `${cc1Match[1]}${cc2Match[1]}` : '');
        fullRc = `${pc1Match[1]}${pc2Match[1]}${carMatch ? carMatch[1] : ''}${cc}`;
    }
    // Municipality and Province
    const nmMatch = xmlText.match(/<nm>(.*?)<\/nm>/);
    const npMatch = xmlText.match(/<np>(.*?)<\/np>/);
    // Full address from <ldt> tag
    const ldtMatch = xmlText.match(/<ldt>(.*?)<\/ldt>/);
    // Build address string
    const direccio = ldtMatch
        ? ldtMatch[1]
        : (tvMatch && nvMatch && pnpMatch)
            ? `${tvMatch[1]} ${nvMatch[1]}, ${pnpMatch[1]}`
            : '';
    // Extract construction elements (all <dfcons> blocks)
    const elements = [];
    const consRegex = /<cons>[\s\S]*?<lcd>(.*?)<\/lcd>[\s\S]*?<stl>(.*?)<\/stl>[\s\S]*?<\/cons>/g;
    let consMatch;
    while ((consMatch = consRegex.exec(xmlText)) !== null) {
        elements.push({
            us: consMatch[1],
            superficieConstruida: consMatch[2],
            antiguitat: '',
        });
    }
    // If we didn't find any meaningful data, return error
    if (!usoMatch && !surfaceMatch && !yearMatch) {
        return { data: null, error: 'No s\'han trobat dades de l\'immoble.' };
    }
    const result = {
        referenciaCadastral: fullRc,
        anyConstruccio: yearMatch ? yearMatch[1] : '',
        us: usoMatch ? usoMatch[1] : '',
        superficieConstruida: surfaceMatch ? surfaceMatch[1] : '',
        superficieSol: '',
        direccio,
        municipi: nmMatch ? nmMatch[1] : '',
        provincia: npMatch ? npMatch[1] : '',
        tipusImmoble: '',
        elements,
    };
    return { data: result, error: null };
}
exports.parseBuildingDetailsResponse = parseBuildingDetailsResponse;
/**
 * Parse the Catastro Consulta_DNPLOC response (Address Search) using regex.
 * Used as optional fallback when coordinate lookup fails.
 */
function parseAddressSearchResponse(xmlText) {
    // Check for error first
    const errMatch = xmlText.match(/<des>(.*?)<\/des>/);
    const pc1Match = xmlText.match(/<pc1>(.*?)<\/pc1>/);
    const pc2Match = xmlText.match(/<pc2>(.*?)<\/pc2>/);
    if (pc1Match && pc2Match) {
        const rc = `${pc1Match[1]}${pc2Match[1]}`;
        const ldtMatch = xmlText.match(/<ldt>(.*?)<\/ldt>/);
        return { rc, address: ldtMatch ? ldtMatch[1] : null, error: null };
    }
    if (errMatch) {
        return { rc: null, address: null, error: `Error del Catastro: ${errMatch[1]}` };
    }
    return { rc: null, address: null, error: 'No s\'ha trobat cap immoble per a aquesta adreça.' };
}
exports.parseAddressSearchResponse = parseAddressSearchResponse;
/**
 * Parse the Consulta_DNPRC response for a 14-char RC (parcel listing).
 * Returns the list of unit identifiers: {car, pt, pu} for each unit.
 * cudnp > 1 means it's a multi-unit parcel.
 */
function parseUnitListResponse(xmlText) {
    // Extract total count
    const cudnpMatch = xmlText.match(/<cudnp>(\d+)<\/cudnp>/);
    const totalUnits = cudnpMatch ? parseInt(cudnpMatch[1], 10) : 0;
    if (totalUnits <= 1)
        return { totalUnits, units: [] };
    // Extract all <rcdnp> blocks
    const units = [];
    const rcdnpRegex = /<rcdnp>[\s\S]*?<car>(.*?)<\/car>[\s\S]*?<cc1>(.*?)<\/cc1>[\s\S]*?<cc2>(.*?)<\/cc2>[\s\S]*?<pt>(.*?)<\/pt>[\s\S]*?<pu>(.*?)<\/pu>[\s\S]*?<\/rcdnp>/g;
    let match;
    while ((match = rcdnpRegex.exec(xmlText)) !== null) {
        units.push({
            car: match[1],
            cc1: match[2],
            cc2: match[3],
            pt: match[4],
            pu: match[5],
        });
    }
    return { totalUnits, units };
}
exports.parseUnitListResponse = parseUnitListResponse;
/**
 * Parse the Consulta_DNPRC response for an 18-char RC (individual unit detail).
 * Returns detailed data for a single unit: usage, surface, year, address.
 */
function parseUnitDetailResponse(xmlText, pc1, pc2, car) {
    // Extract <bico> data
    const lusoMatch = xmlText.match(/<luso>(.*?)<\/luso>/);
    const sfcMatch = xmlText.match(/<sfc>(.*?)<\/sfc>/);
    const antMatch = xmlText.match(/<ant>(.*?)<\/ant>/);
    const ldtMatch = xmlText.match(/<ldt>(.*?)<\/ldt>/);
    const cc1Match = xmlText.match(/<cc1>(.*?)<\/cc1>/);
    const cc2Match = xmlText.match(/<cc2>(.*?)<\/cc2>/);
    const ptMatch = xmlText.match(/<pt>(.*?)<\/pt>/);
    const puMatch = xmlText.match(/<pu>(.*?)<\/pu>/);
    if (!lusoMatch && !sfcMatch)
        return null;
    const cc = ((cc1Match === null || cc1Match === void 0 ? void 0 : cc1Match[1]) || '') + ((cc2Match === null || cc2Match === void 0 ? void 0 : cc2Match[1]) || '');
    return {
        rc: `${pc1}${pc2}${car}${cc}`,
        planta: (ptMatch === null || ptMatch === void 0 ? void 0 : ptMatch[1]) || '',
        porta: (puMatch === null || puMatch === void 0 ? void 0 : puMatch[1]) || '',
        us: (lusoMatch === null || lusoMatch === void 0 ? void 0 : lusoMatch[1]) || '',
        superficie: (sfcMatch === null || sfcMatch === void 0 ? void 0 : sfcMatch[1]) || '',
        anyConstruccio: (antMatch === null || antMatch === void 0 ? void 0 : antMatch[1]) || '',
        direccio: (ldtMatch === null || ldtMatch === void 0 ? void 0 : ldtMatch[1]) || '',
    };
}
exports.parseUnitDetailResponse = parseUnitDetailResponse;
/**
 * Generate the URL for the Catastro property map page
 */
function getCroquisUrl(rc) {
    if (!rc || rc.length < 14)
        return '';
    return `https://www1.sedecatastro.gob.es/CYCBienInmueble/OVCConCiworking.aspx?RefC=${encodeURIComponent(rc)}`;
}
exports.getCroquisUrl = getCroquisUrl;
/**
 * Generate the URL for the Catastro facade photo (OVC FotoFachada).
 * Free, no API key needed.
 */
function getFacadeImageUrl(rc) {
    if (!rc)
        return '';
    return `http://ovc.catastro.meh.es/OVCServWeb/OVCWcfLibres/OVCFotoFachada.svc/RecuperarFotoFachadaGet?ReferenciaCatastral=${rc}`;
}
exports.getFacadeImageUrl = getFacadeImageUrl;
//# sourceMappingURL=catastro-parser.js.map