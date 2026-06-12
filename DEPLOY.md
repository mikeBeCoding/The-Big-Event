# Deploying The Big Event to a Hostinger VPS

The app is a single Node process: the Express server (`server/`) serves both the
`/api` routes **and** the built React frontend (`The Big Event/dist`). nginx sits
in front for HTTPS, and PM2 keeps the process alive.

```
Browser ──HTTPS──> nginx (:443) ──proxy──> Node/Express (:4000)
                                              ├─ /api/*        → game logic + Anthropic
                                              └─ everything else → built React SPA
```

## 1. One-time server setup

SSH into the VPS as a sudo user, then:

```bash
# Node 20 LTS, nginx, certbot, pm2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt install -y nodejs nginx certbot python3-certbot-nginx git
sudo npm i -g pm2

# Firewall: only SSH + web. The Node port (4000) stays private.
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
```

Point your domain's DNS **A record** (`mikebecoding.com` and `www`) at the VPS IP
in Hostinger's DNS panel before requesting the TLS cert.

## 2. Get the code and secrets

```bash
sudo git clone <your-repo-url> /var/www/bigevent
sudo chown -R $USER:$USER /var/www/bigevent
cd /var/www/bigevent

# Create the server env file (NOT committed). Use your real key.
printf 'ANTHROPIC_API_KEY=sk-ant-...\nPORT=4000\n' > server/.env
```

> The app still runs without a key — it falls back to scripted responses — but
> you'll want the key for real AI conversations and coaching.

## 3. Build and launch

```bash
./deploy/deploy.sh        # installs deps, builds frontend, starts PM2
pm2 startup               # prints a command — run it to enable boot startup
pm2 save
```

Verify locally on the box: `curl http://127.0.0.1:4000/api/resident` should return JSON.

## 4. nginx + HTTPS

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/bigevent
sudo ln -s /etc/nginx/sites-available/bigevent /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default      # drop the welcome page
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d mikebecoding.com -d www.mikebecoding.com
```

Certbot rewrites the config to add HTTPS and auto-renews via a systemd timer.

Visit **https://mikebecoding.com** — you're live.

## Updating after code changes

```bash
cd /var/www/bigevent
git pull
./deploy/deploy.sh        # rebuilds + reloads with zero-downtime PM2 reload
```

## Useful commands

| Task | Command |
|------|---------|
| View logs | `pm2 logs bigevent` |
| Restart | `pm2 restart bigevent` |
| Status | `pm2 status` |
| Reload nginx | `sudo systemctl reload nginx` |

## Notes / limitations

- **Data store:** sessions are saved to `server/data/sessions.json` (gitignored).
  It's rewritten on every message with no locking — fine for an event/demo with
  light concurrent use, but not for high traffic. Back this file up if the
  history matters. Migrate to SQLite if you outgrow it.
- **Secrets:** never commit `server/.env`. It's already gitignored.
- **Local dev** is unchanged: `npm run dev` runs the Vite dev server (:5173) and
  the API (:4000) separately. Production serves both from :4000.
