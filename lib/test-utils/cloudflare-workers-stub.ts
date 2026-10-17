/** Node UI tests may import server actions but must mock calls across this boundary. */
export const env = new Proxy({}, {
    get(_target, key) {
        throw new Error(`Cloudflare binding ${String(key)} requires a Workers runtime test or an explicit mock`);
    },
});
