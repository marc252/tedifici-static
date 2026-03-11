"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.geminiHttp = void 0;
const functions_1 = require("@azure/functions");
const generative_ai_1 = require("@google/generative-ai");
const MODELS = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'];
function geminiHttp(request, context) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const body = (yield request.json());
            const { address, rc, year, usage, surface, searchContext, openDataSummary } = body;
            const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
            if (!apiKey) {
                return { status: 500, jsonBody: { error: 'Google Gemini API key no configurada.' } };
            }
            const genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
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
                    const result = yield model.generateContentStream(prompt);
                    const encoder = new TextEncoder();
                    const readable = new ReadableStream({
                        start(controller) {
                            var _a, e_1, _b, _c;
                            return __awaiter(this, void 0, void 0, function* () {
                                try {
                                    try {
                                        for (var _d = true, _e = __asyncValues(result.stream), _f; _f = yield _e.next(), _a = _f.done, !_a;) {
                                            _c = _f.value;
                                            _d = false;
                                            try {
                                                const chunk = _c;
                                                const text = chunk.text();
                                                if (text) {
                                                    controller.enqueue(encoder.encode(text));
                                                }
                                            }
                                            finally {
                                                _d = true;
                                            }
                                        }
                                    }
                                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                                    finally {
                                        try {
                                            if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
                                        }
                                        finally { if (e_1) throw e_1.error; }
                                    }
                                    controller.close();
                                }
                                catch (e) {
                                    controller.error(e);
                                }
                            });
                        }
                    });
                    return {
                        status: 200,
                        body: readable,
                        headers: {
                            'Content-Type': 'text/plain; charset=utf-8',
                            'Transfer-Encoding': 'chunked',
                        },
                    };
                }
                catch (e) {
                    const errMsg = e instanceof Error ? e.message : String(e);
                    if (errMsg.includes('429') || errMsg.includes('quota') || errMsg.includes('404') || errMsg.includes('not found'))
                        continue;
                    throw e;
                }
            }
            return { status: 429, jsonBody: { error: 'Tots els models IA estan saturats. Torna-ho a provar en 1 minut.' } };
        }
        catch (error) {
            return { status: 500, jsonBody: { error: `Error intern: ${error instanceof Error ? error.message : String(error)}` } };
        }
    });
}
exports.geminiHttp = geminiHttp;
functions_1.app.http('gemini', {
    methods: ['POST'],
    authLevel: 'anonymous',
    handler: geminiHttp
});
//# sourceMappingURL=gemini.js.map