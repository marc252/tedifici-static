import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function geminiHttp(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const bodyContent = await request.text();
        const { address, rc, year, surface, usage } = JSON.parse(bodyContent);

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            return { status: 500, jsonBody: { error: 'GOOGLE_API_KEY is not configured' } };
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });

        const prompt = `
      Actua com un arquitecte tècnic i expert en cadastre amb un enfocament rigorós i factual.
      Tinc les següents dades CONFIRMADES sobre un edifici:
      - Adreça: ${address}
      - Referència Cadastral: ${rc}
      - Any de Construcció: ${year}
      - Superfície Construïda: ${surface} m²
      - Ús Principal: ${usage}

      Genera un informe tècnic breu (màxim 3 paràgrafs) en Català.
      
      INSTRUCCIONS CRÍTIQUES:
      1. BASA'T en les dades proporcionades (Any, Superfície, Ús), però TINGUES EN COMPTE que l'ús cadastral és administratiu i pot no coincidir amb la realitat actual (ex: un local registrat com "industrial" pot ser ara un loft o una oficina).
      2. Utilitza fórmules com "registrat administrativament com..." o "amb ús cadastral de..." per no donar per fet que és l'ús real actual si no és obvi.
      3. NO INVENTIS noms de negocis, botigues o hotels específics.
      4. Contextualitza l'edifici en el seu entorn (barri, any de construcció) més que centrar-te només en l'ús estricte.
      
      Exemple d'estil desitjat: "Edifici del 1972, situat a l'Eixample. Tot i constar amb ús principal industrial al Cadastre, la seva tipologia i ubicació suggereixen que podria haver estat reconvertit o tenir un ús mixt actualment..."
    `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return { status: 200, jsonBody: { text } };

    } catch (error) {
        context.error('Gemini API Error:', error);
        return { 
            status: 500, 
            jsonBody: { error: 'Failed to generate insights', details: error instanceof Error ? error.message : String(error) } 
        };
    }
}

app.http('gemini', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: geminiHttp
});
