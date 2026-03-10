async function inspect() {
    const rc = '0122405DF3802C';
    // URL for Consulta_DNPRC
    // Province and Municipality are optional if RC is full 20 chars, but here we have 14. 
    // Actually, for RC queries, we often use OVCCallejero.asmx/Consulta_DNPRC
    // Parameters: RC
    // Note: If RC is 14 chars, it might return list of buildings.

    // Let's try the standard endpoint for RC lookup
    const url = `http://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/OVCCallejero.asmx/Consulta_DNPRC?Provincia=&Municipio=&RC=${rc}`;

    console.log(`Fetching: ${url}`);

    try {
        const res = await fetch(url);
        const text = await res.text();
        console.log('--- XML RESPONSE ---');
        console.log(text);
        console.log('--------------------');
    } catch (e) {
        console.error(e);
    }
}

inspect();
