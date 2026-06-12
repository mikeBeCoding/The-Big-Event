// PM2 process manager config. Keeps the API + frontend server running,
// restarts on crash, and survives reboots (with `pm2 startup` + `pm2 save`).
//
//   pm2 start ecosystem.config.js
//   pm2 logs bigevent
//   pm2 restart bigevent
//
// The server reads ANTHROPIC_API_KEY and PORT from server/.env, so secrets
// stay out of this committed file.
module.exports = {
  apps: [
    {
      name: 'bigevent',
      script: 'server/index.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
