module.exports = {
  apps: [
    {
      name: 'mmo-api',
      script: 'pnpm',
      args: '--filter @mmo/api start',
      env: {
        NODE_ENV: 'production',
        PORT: 4000
      }
    },
    {
      name: 'mmo-web',
      script: 'pnpm',
      args: '--filter @mmo/web start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'mmo-worker',
      script: 'pnpm',
      args: '--filter @mmo/worker start',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
