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
exports.getCatastroDataByAddress = exports.getCatastroDataByCoordinates = exports.getCatastroDataByRC = exports.getFacadeImage = void 0;
/**
 * Fetches the facade image URL for a given Cadastral Reference (RC).
 * Uses the OVC "FotoFachada" endpoint.
 */
function getFacadeImage(rc) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!rc)
            return null;
        // URL pattern for the facade image from OVC
        return `http://ovc.catastro.meh.es/OVCServWeb/OVCWcfLibres/OVCFotoFachada.svc/RecuperarFotoFachadaGet?ReferenciaCatastral=${rc}`;
    });
}
exports.getFacadeImage = getFacadeImage;
/**
 * Fetches building details (Year, Surface, Usage) from OVC using RC.
 */
function getCatastroDataByRC(rc) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const url = `http://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejero.asmx/Consulta_DNPRC?Provincia=&Municipio=&RC=${rc}`;
            const response = yield fetch(url);
            if (!response.ok)
                throw new Error('Catastro API failed');
            const xmlText = yield response.text();
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
        }
        catch (error) {
            console.error('[Catastro] Error fetching by RC:', error);
            return null;
        }
    });
}
exports.getCatastroDataByRC = getCatastroDataByRC;
function getCatastroDataByCoordinates(lat, lon) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const url = `http://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCoordenadas.asmx/Consulta_RCCOOR?SRS=EPSG:4326&Coordenada_X=${lon}&Coordenada_Y=${lat}`;
            const response = yield fetch(url);
            if (!response.ok)
                throw new Error('Catastro API failed');
            const xmlText = yield response.text();
            const pc1Match = xmlText.match(/<pc1>(.*?)<\/pc1>/);
            const pc2Match = xmlText.match(/<pc2>(.*?)<\/pc2>/);
            if (pc1Match && pc2Match) {
                const rc = `${pc1Match[1]}${pc2Match[1]}`;
                // We successfully found the RC
                return { rc, address: '' };
            }
            return null;
        }
        catch (error) {
            console.error('[Catastro] Error fetching by coordinates:', error);
            return null;
        }
    });
}
exports.getCatastroDataByCoordinates = getCatastroDataByCoordinates;
function getCatastroDataByAddress(address) {
    return __awaiter(this, void 0, void 0, function* () {
        // Placeholder for future implementation of splitting address and querying OVC
        return null;
    });
}
exports.getCatastroDataByAddress = getCatastroDataByAddress;
//# sourceMappingURL=CatastroService.js.map