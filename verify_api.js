async function verify() {
    const baseUrl = 'http://localhost:3000';
    const address = 'Gran Via de les Corts Catalanes 585, Barcelona';

    console.log(`Testing Geocoding for: "${address}"...`);
    try {
        const geoRes = await fetch(`${baseUrl}/api/geocode?address=${encodeURIComponent(address)}`);
        if (!geoRes.ok) throw new Error(`Geocoding failed: ${geoRes.statusObject}`);
        const geoData = await geoRes.json();
        console.log('Geocoding Result:', geoData);

        if (!geoData.lat || !geoData.lon) {
            console.error('Missing lat/lon in geocoding result');
            return;
        }

        console.log(`\nTesting Catastro for Lat: ${geoData.lat}, Lon: ${geoData.lon}...`);
        const catRes = await fetch(`${baseUrl}/api/catastro?lat=${geoData.lat}&lon=${geoData.lon}`);
        if (!catRes.ok) throw new Error(`Catastro failed: ${catRes.statusText}`);
        const catData = await catRes.json();
        console.log('Catastro Result:', catData);

        if (!catData.rc) {
            console.error('\n❌ Verification FAILED. No Cadastral Reference found.');
            return;
        }
        console.log(`\nTesting Building Details for RC: ${catData.rc}...`);
        const buildRes = await fetch(`${baseUrl}/api/catastro/building?rc=${catData.rc}`);
        if (!buildRes.ok) throw new Error(`Building Details failed: ${buildRes.statusText}`);
        const buildData = await buildRes.json();
        console.log('Building Details Result:', buildData);

        if (buildData.year && buildData.surface && buildData.uso) {
            console.log('\n✅ Verification SUCCESS! All Building Details retrieved.');
        } else {
            console.error('\n❌ Verification FAILED. Missing fields in Building Details.');
        }

    } catch (err) {
        console.error('\n❌ Verification FAILED:', err.message);
    }
}

verify();
