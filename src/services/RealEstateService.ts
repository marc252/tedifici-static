export interface RealEstateListing {
    price?: number;
    url?: string;
    source: 'idealista' | 'fotocasa';
}

export async function searchRealEstate(address: string): Promise<RealEstateListing[]> {
    const listings: RealEstateListing[] = [];

    // Check for API keys
    const idealistaKey = process.env.IDEALISTA_API_KEY;
    const fotocasaKey = process.env.FOTOCASA_API_KEY;

    if (idealistaKey) {
        // TODO: Implement Idealista API call
        console.log('[RealEstate] detailed search on Idealista enabled');
    }

    if (fotocasaKey) {
        // TODO: Implement Fotocasa API call
        console.log('[RealEstate] detailed search on Fotocasa enabled');
    }

    return listings;
}
