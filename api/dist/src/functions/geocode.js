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
exports.geocodeHttp = void 0;
const functions_1 = require("@azure/functions");
function geocodeHttp(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        const address = request.query.get('address');
        if (!address) {
            return { status: 400, jsonBody: { error: 'Cal proporcionar una adreça' } };
        }
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return { status: 500, jsonBody: { error: 'Google Maps API key no configurada' } };
        }
        try {
            const searchAddress = address.includes('España') || address.includes('Spain') || address.includes('Espanya')
                ? address
                : `${address}, España`;
            const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchAddress)}&key=${apiKey}&language=ca&region=es`;
            const response = yield fetch(url);
            const data = yield response.json();
            if (data.status !== 'OK' || !data.results || data.results.length === 0) {
                return { status: 404, jsonBody: { error: `No s'ha trobat l'adreça: ${data.status}` } };
            }
            const result = data.results[0];
            const location = result.geometry.location;
            const components = result.address_components || [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const getComponent = (type) => {
                const comp = components.find((c) => c.types.includes(type));
                return (comp === null || comp === void 0 ? void 0 : comp.long_name) || '';
            };
            return {
                status: 200,
                jsonBody: {
                    lat: location.lat,
                    lng: location.lng,
                    formattedAddress: result.formatted_address,
                    municipality: getComponent('locality') || getComponent('administrative_area_level_4'),
                    province: getComponent('administrative_area_level_2'),
                    postalCode: getComponent('postal_code'),
                    streetName: getComponent('route'),
                    streetNumber: getComponent('street_number'),
                    neighborhood: getComponent('neighborhood') || getComponent('sublocality') || getComponent('sublocality_level_1'),
                }
            };
        }
        catch (error) {
            return {
                status: 500,
                jsonBody: { error: `Error de geocodificació: ${error instanceof Error ? error.message : String(error)}` }
            };
        }
    });
}
exports.geocodeHttp = geocodeHttp;
functions_1.app.http('geocode', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: geocodeHttp
});
//# sourceMappingURL=geocode.js.map