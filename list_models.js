const fs = require('fs');
const path = require('path');

async function listModels() {
    try {
        const envPath = path.join(__dirname, '.env.local');
        let apiKey = process.env.GOOGLE_API_KEY;

        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const match = envContent.match(/GOOGLE_API_KEY=(.*)/);
            if (match) {
                apiKey = match[1].trim();
            }
        }

        if (!apiKey) {
            console.error("No API KEY found in .env.local or process.env");
            return;
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.models) {
            console.log("Available generation models:");
            data.models.forEach(m => {
                if (m.supportedGenerationMethods && m.supportedGenerationMethods.includes("generateContent")) {
                    console.log(`- ${m.name}`);
                }
            });
        } else {
            console.error("Error listing models:", data);
        }
    } catch (error) {
        console.error("Script error:", error);
    }
}

listModels();
