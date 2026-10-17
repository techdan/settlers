// Legacy .env files belong to the retired PostgreSQL deployment. Never load
// them into the local Workers runtime or generated deployment bindings.
process.env.CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV = 'false';
if (Number(process.versions.node.split('.')[0]) < 24) {
    throw new Error('Cloudflare development requires Node 24 or newer. Run npm install to install the project-local runtime.');
}
await import('../node_modules/vite/bin/vite.js');
