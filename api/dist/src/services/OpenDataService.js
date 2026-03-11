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
exports.getBuildingInfoFromOpenData = void 0;
const CatastroService_1 = require("./CatastroService");
function getBuildingInfoFromOpenData(rc, city) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log(`[OpenData] Querying for RC: ${rc}, City: ${city}`);
            const normalizedCity = (city === null || city === void 0 ? void 0 : city.toLowerCase().trim()) || '';
            let result = null;
            if (normalizedCity.includes('barcelona') || normalizedCity.includes('bcn')) {
                console.log(`[OpenData] Detected city: Barcelona. Routing to getBarcelonaOpenData`);
                result = yield getBarcelonaOpenData(rc);
            }
            else if (normalizedCity.includes('madrid')) {
                console.log(`[OpenData] Detected city: Madrid. Routing to getMadridOpenData`);
                result = yield getMadridOpenData(rc);
            }
            else {
                console.log(`[OpenData] City '${normalizedCity}' not supported for specific Open Data.`);
            }
            // Always try to get the image from Catastro as a supplement if we have an RC
            if (rc) {
                const imageUrl = yield (0, CatastroService_1.getFacadeImage)(rc);
                if (imageUrl) {
                    result = result || {};
                    result = Object.assign(Object.assign({}, result), { image_url: imageUrl });
                }
            }
            return result;
        }
        catch (error) {
            console.error('[OpenData] Error fetching data:', error);
            return null;
        }
    });
}
exports.getBuildingInfoFromOpenData = getBuildingInfoFromOpenData;
function getBarcelonaOpenData(rc) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Barcelona Open Data (CKAN) placeholder
            // In the future, query the actual API or specific resource ID here.
            console.log('[OpenData] Fetching from Barcelona Open Data...');
            return {
                source: 'Ajuntament de Barcelona (Open Data)',
                info_url: `https://opendata-ajuntament.barcelona.cat/data/es/dataset/est-cadastral-valors-unitaris-residencial`
            };
        }
        catch (e) {
            console.error('Barcelona Open Data failed', e);
            return null;
        }
    });
}
function getMadridOpenData(rc) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('[OpenData] Fetching from Madrid Open Data...');
            return {
                source: 'Ayuntamiento de Madrid (Geoportal)',
                info_url: 'https://geoportal.madrid.es/'
            };
        }
        catch (e) {
            console.error('Madrid Open Data failed', e);
            return null;
        }
    });
}
//# sourceMappingURL=OpenDataService.js.map