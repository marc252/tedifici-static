import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

const ALLOWED_HOSTS = [
    'ovc.catastro.meh.es',
    'maps.googleapis.com',
    'tile.openstreetmap.org',
    'a.tile.openstreetmap.org',
    'b.tile.openstreetmap.org',
    'c.tile.openstreetmap.org',
];

export async function imageProxyHttp(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
    const url = request.query.get('url');

    if (!url) {
        return { status: 400, jsonBody: { error: 'Missing url parameter' } };
    }

    try {
        const parsed = new URL(url);

        if (!ALLOWED_HOSTS.some(host => parsed.hostname === host || parsed.hostname.endsWith('.' + host))) {
            return { status: 403, jsonBody: { error: 'Host not allowed' } };
        }

        if (parsed.hostname === 'maps.googleapis.com' && !parsed.searchParams.has('key')) {
            const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';
            if (apiKey) {
                parsed.searchParams.set('key', apiKey);
            }
        }

        const response = await fetch(parsed.toString(), {
            headers: {
                'User-Agent': 'Infobuilding/1.0',
            },
            signal: AbortSignal.timeout(10000),
        });

        if (!response.ok) {
            return { status: response.status, jsonBody: { error: `Upstream returned ${response.status}` } };
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const buffer = await response.arrayBuffer();

        if (!contentType.startsWith('image/')) {
            return { status: 400, jsonBody: { error: 'Not an image' } };
        }

        // Return the binary data as the body
        return {
            status: 200,
            body: new Uint8Array(buffer),
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400',
            },
        };
    } catch (error) {
        return { status: 502, jsonBody: { error: 'Failed to fetch image' } };
    }
}

app.http('imageProxy', {
    methods: ['GET'],
    authLevel: 'anonymous',
    handler: imageProxyHttp
});
