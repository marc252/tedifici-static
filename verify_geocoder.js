const { GET } = require('./src/app/api/geocode/route');
require('dotenv').config({ path: '.env.local' });

// Mock Request object
class MockRequest {
    constructor(url) {
        this.url = url;
    }
}

async function testGeocode(address) {
    console.log(`\nTesting address: "${address}"`);
    const req = new MockRequest(`http://localhost:3000/api/geocode?address=${encodeURIComponent(address)}`);

    try {
        const response = await GET(req);
        const data = await response.json();
        console.log('Response:', JSON.stringify(data, null, 2));

        if (data.lat && data.lon) {
            console.log('✅ Coordinates found');
        } else {
            console.error('❌ No coordinates');
        }

        if (data.rc) {
            console.log('✅ Cadastral Reference found');
        } else {
            console.warn('⚠️ No Cadastral Reference (expected if OVC is strict or mock)');
        }
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// user example
testGeocode('Passeig de Gracia 20, Barcelona').then(() => {
    // normal example
    return testGeocode('Gran Via 585, Barcelona');
});
