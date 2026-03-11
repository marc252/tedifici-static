// ============================================================
// Types for Infobuilding App
// ============================================================

export interface GeocodeResult {
    lat: number;
    lng: number;
    formattedAddress: string;
    municipality: string;
    province: string;
    postalCode: string;
    streetName: string;
    streetNumber: string;
    neighborhood: string;
}

export interface CatastroData {
    referenciaCadastral: string;
    anyConstruccio: string;
    us: string;
    superficieConstruida: string;
    superficieSol: string;
    direccio: string;
    municipi: string;
    provincia: string;
    tipusImmoble: string;
    plantesCount?: string;
    croquis?: string; // URL to the cadastral sketch
    facadeImage?: string; // URL to OVC FotoFachada
    elements?: CatastroElement[];
    units?: CatastroUnit[]; // Individual property units (for multi-unit parcels)
    totalUnits?: number;    // Total number of units in the parcel
}

export interface CatastroElement {
    us: string;
    superficieConstruida: string;
    antiguitat: string;
}

/** Individual property unit within a multi-unit parcel */
export interface CatastroUnit {
    rc: string;           // Full 20-char RC
    planta: string;       // Floor (-1=soterrani, 00=baixos, 01+=pisos)
    porta: string;        // Door number
    us: string;           // Usage type (Residencial, Almacén, etc.)
    superficie: string;   // Total surface in m²
    anyConstruccio: string; // Year built
    direccio: string;     // Full address with floor/door
}

export interface SearchResult {
    query: string;
    results: SearchResultItem[];
}

export interface SearchResultItem {
    title: string;
    url: string;
    content: string;
    score: number;
}

export interface OpenDataResult {
    source: string;
    data: Record<string, unknown>[];
    description: string;
}

export interface GeminiReport {
    content: string;
    model: string;
}

export interface BuildingData {
    geocode: GeocodeResult | null;
    catastro: CatastroData | null;
    buildingGeometry: number[][][] | null; // GeoJSON polygon from WFS INSPIRE
    searchResults: SearchResult | null;
    geminiReport: GeminiReport | null;
    openData: OpenDataResult[];
    errors: string[];
    loading: {
        geocode: boolean;
        catastro: boolean;
        search: boolean;
        gemini: boolean;
        openData: boolean;
    };
}

export const initialBuildingData: BuildingData = {
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
