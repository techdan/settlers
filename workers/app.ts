import app from 'vinext/server/app-router-entry';
import { env } from 'cloudflare:workers';
export { GameRoom } from './room';

const worker = {
    async fetch(request: Request, bindings: Cloudflare.Env, ctx: ExecutionContext) {
        const url = new URL(request.url);
        const match = /^\/api\/room\/([A-Z]{4})\/events$/.exec(url.pathname);
        if (match) {
            const origin = request.headers.get('Origin');
            if (origin !== url.origin) return new Response('Forbidden origin', { status: 403 });
            return env.ROOMS.getByName(match[1]).fetch(request);
        }
        return app.fetch(request, bindings, ctx);
    },
};

export default worker;
