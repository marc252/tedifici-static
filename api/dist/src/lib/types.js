"use strict";
// ============================================================
// Types for Infobuilding App
// ============================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.initialBuildingData = void 0;
exports.initialBuildingData = {
    geocode: null,
    catastro: null,
    buildingGeometry: null,
    searchResults: null,
    geminiReport: null,
    openData: [],
    errors: [],
    loading: {
        geocode: false,
        catastro: false,
        search: false,
        gemini: false,
        openData: false,
    },
};
//# sourceMappingURL=types.js.map