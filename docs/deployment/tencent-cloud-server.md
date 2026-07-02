# Tencent Cloud Server Deployment

Status: recommended first online deployment path.

This project should be treated as a new StoryPlay project:

- Repository: `https://github.com/wdiandian/storyplay`
- Domain: `https://storyplay.cc/`
- Runtime target: Tencent Cloud CVM + Docker Compose + Nginx reverse proxy

Cloudflare Workers remains an optional deployment target, but it is not the
default path for the current server you already own.

## Deployment Shape

```text
GitHub repo -> GitHub Actions builds GHCR image
Tencent Cloud CVM -> docker compose pulls image
Nginx -> storyplay.cc -> 127.0.0.1:3000
```

The image name is:

```text
ghcr.io/wdiandian/storyplay:latest
```

## Server Prerequisites

Install Docker, Docker Compose, Nginx, and Certbot on the Tencent Cloud server.

For Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y docker.io docker-compose-plugin nginx certbot python3-certbot-nginx
sudo systemctl enable --now docker nginx
```

If the server already runs another project, keep it on its current port and
run StoryPlay on port `3000` or another unused local port.

## DNS

In the DNS provider for `storyplay.cc`, point the domain to the Tencent Cloud
server public IP:

```text
storyplay.cc      A      <server-public-ip>
www.storyplay.cc  CNAME  storyplay.cc
```

## GitHub Container Registry

The existing workflow `.github/workflows/docker.yml` builds the Docker image
on pushes to `main`.

After pushing this repo to `https://github.com/wdiandian/storyplay`, check:

```text
GitHub -> Actions -> Build and push Docker image
GitHub -> Packages -> storyplay
```

If the package is private, login on the server:

```bash
echo <github-token> | docker login ghcr.io -u wdiandian --password-stdin
```

The token needs package read permission.

## App Directory

On the server:

```bash
sudo mkdir -p /opt/storyplay
cd /opt/storyplay
```

Create `.env.local`:

```bash
sudo nano .env.local
```

Required:

```text
TEXT_BASE_URL=
TEXT_API_KEY=
TEXT_MODEL=

IMAGE_BASE_URL=
IMAGE_API_KEY=
IMAGE_MODEL=
IMAGE_PROVIDER=

VISION_BASE_URL=
VISION_API_KEY=
VISION_MODEL=
# Optional. If VISION_* is blank, StoryPlay reuses TEXT_* for click vision.
VISION_TIMEOUT_MS=20000

MOCK_IMAGE=false
```

Optional:

```text
TTS_BASE_URL=
TTS_API_KEY=
TTS_SPEECH_MODEL=
IMAGE_TIMEOUT_MS=
IMAGE_HEDGE_MS=
VISION_TIMEOUT_MS=
FAL_IMAGE_EDIT_MODEL=
```

Create `docker-compose.yml` or copy it from the repo:

```yaml
services:
  storyplay:
    image: ghcr.io/wdiandian/storyplay:latest
    ports:
      - "3000:3000"
    env_file:
      - .env.local
    volumes:
      - storyplay_data:/app/.storyplay
      - storyplay_assets:/app/public/studio-assets
    restart: unless-stopped

volumes:
  storyplay_data:
  storyplay_assets:
```

Start:

```bash
sudo docker compose pull
sudo docker compose up -d
sudo docker compose logs -f storyplay
```

## Nginx

Create:

```bash
sudo nano /etc/nginx/sites-available/storyplay.cc
```

Config:

```nginx
server {
    listen 80;
    server_name storyplay.cc www.storyplay.cc;

    client_max_body_size 20m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable:

```bash
sudo ln -s /etc/nginx/sites-available/storyplay.cc /etc/nginx/sites-enabled/storyplay.cc
sudo nginx -t
sudo systemctl reload nginx
```

Issue HTTPS certificate:

```bash
sudo certbot --nginx -d storyplay.cc -d www.storyplay.cc
```

## Update Deployment

After each merge to `main`, GitHub Actions builds a new image.

On the server:

```bash
cd /opt/storyplay
sudo docker compose pull
sudo docker compose up -d
sudo docker image prune -f
```

## Smoke Test

1. Open `https://storyplay.cc/`.
2. Start a preset story.
3. Open `/zh-CN/studio/projects`.
4. Create a StoryProject.
5. Publish it.
6. Restart the container:

```bash
sudo docker compose restart storyplay
```

7. Refresh Studio and confirm the project still exists.

If the project disappears, check that the named volume `storyplay_data` is
attached to `/app/.storyplay`.

## Current Limits

- This is a single-server MVP deployment.
- Studio data is persisted in the Docker volume.
- Auth, ownership, rate limits, and multi-user isolation are not implemented.
- Later production storage should move StoryProject records to a database and
  generated assets to object storage.
