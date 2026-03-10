async function verifyGemini() {
    const url = 'http://localhost:3000/api/gemini';
    const data = {
        address: 'Gran Via 585, Barcelona',
        rc: '0122405DF3802C',
        year: '2017',
        surface: '38551',
        usage: 'Oficinas',
    };

    console.log(`Testing Gemini API at ${url}...`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        const result = await response.json();
        console.log('Gemini API Response:', result);

        if (result.text) {
            console.log('SUCCESS: Generated text received.');
        } else {
            console.error('FAILURE: No text in response.');
        }

    } catch (error) {
        console.error('Verification Failed:', error.message);
    }
}

verifyGemini();
