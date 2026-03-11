import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { GoogleGenerativeAI } from '@google/generative-ai';

const MODELS = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];

export async function geminiHttp(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    try {
        const body = (await request.json()) as any;
        const { address, rc, year, usage, surface, searchContext, openDataSummary } = body;

        const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
        if (!apiKey) {
            return { status: 500, jsonBody: { error: 'Google Gemini API key no configurada.' } };
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        const truncatedContext = searchContext ? searchContext.substring(0, 1000) : '';
        const economicContext = openDataSummary ? `\nDades econòmiques de la zona:\n${openDataSummary}\n` : '';

        const prompt = `Ets un expert en inversió immobiliària i rehabilitació d'edificis.
Fes una anàlisi breu (max 150 paraules) d'aquest immoble com a inversió per a lloguer:

- Adreça: ${address || 'No disponible'}
- Ref. Cadastral: ${rc || 'No disponible'}
- Any construcció: ${year || 'No disponible'}
- Ús: ${usage || 'No disponible'}
- Superfície: ${surface || 'No disponible'} m²

${truncatedContext ? `Info extra:\n${truncatedContext}\n` : ''}${economicContext}
INSTRUCCIONS:
1. Respon en català.
2. Estructura: Potencial (rendibilitat/lloguer), Riscos (antiguitat/rehabilitació/zona), Recomanació (compra/descarta/aprofundir).
3. NO repeteixis l'enunciat. Sigues directe i concís.
4. Si l'edifici és antic (>50 anys), menciona possibles costos de rehabilitació.
5. Valora la zona en termes de demanda de lloguer.`;

        for (const modelName of MODELS) {
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContentStream(prompt);

                const encoder = new TextEncoder();
                const readable = new ReadableStream({
                    async start(controller) {
                        try {
                            for await (const chunk of result.stream) {
                                const text = chunk.text();
                                if (text) {
                                    controller.enqueue(encoder.encode(text));
                                }
                            }
                            controller.close();
                        } catch (e) {
                            controller.error(e);
                        }
                    }
                });

                return {
                    status: 200,
                    body: readable as any,
                    headers: {
                        'Content-Type': 'text/plain; charset=utf-8',
                        'Transfer-Encoding': 'chunked',
                    },
                };
            } catch (e: unknown) {
                const errMsg = e instanceof Error ? e.message : String(e);
                if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('404') || errMsg.includes('not found')) continue;
                throw e;
            }
        }

        return { status: 429, jsonBody: { error: 'Tots els models IA estan saturats. Torna-ho a provar en 1 minut.' } };
    } catch (error) {
        return { status: 500, jsonBody: { error: `Error intern: ${error instanceof Error ? error.message : String(error)}` } };
    }
}

app.http('gemini', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: geminiHttp
});
