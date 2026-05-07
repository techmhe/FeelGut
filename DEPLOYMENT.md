# FeelGut — Deployment-Anleitung

## Voraussetzungen auf dem Server

- Linux-Server (Ubuntu 22.04 empfohlen)
- Docker + Docker Compose installiert
- Eine Domain (optional, aber empfohlen)

---

## Schritt 1: Docker installieren (falls noch nicht vorhanden)

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

Prüfen ob es funktioniert:

```bash
docker --version
docker compose version
```

---

## Schritt 2: Projektdateien auf den Server übertragen

Option A — per Git:
```bash
git clone https://github.com/DEIN-USERNAME/FeelGut.git
cd FeelGut
```

Option B — per SCP (von deinem Mac aus):
```bash
scp -r /pfad/zu/FeelGut user@dein-server.de:~/FeelGut
ssh user@dein-server.de
cd FeelGut
```

---

## Schritt 3: Umgebungsvariablen konfigurieren

Erstelle eine `.env`-Datei im Projektordner:

```bash
cp .env.example .env
nano .env
```

Fülle die Werte aus:

```env
JWT_SECRET=hier-ein-langes-zufaelliges-passwort-eingeben-mindestens-32-zeichen
ALLOWED_ORIGIN=https://deine-domain.de
PORT=3000
NODE_ENV=production
```

Einen sicheren JWT_SECRET kannst du so generieren:
```bash
openssl rand -hex 32
```

---

## Schritt 4: App starten

```bash
docker compose up -d
```

Docker lädt alle Abhängigkeiten, baut das Frontend und startet den Server.  
Beim ersten Start dauert das 2–3 Minuten.

Prüfen ob alles läuft:
```bash
docker compose ps
docker compose logs -f
```

Die App ist jetzt unter `http://dein-server.de:3000` erreichbar.

---

## Schritt 5: Domain + HTTPS einrichten (empfohlen)

Installiere Nginx als Reverse Proxy:

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

Nginx-Konfiguration erstellen:

```bash
sudo nano /etc/nginx/sites-available/feelgut
```

Inhalt:
```nginx
server {
    server_name deine-domain.de;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Aktivieren und SSL-Zertifikat holen:

```bash
sudo ln -s /etc/nginx/sites-available/feelgut /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d deine-domain.de
```

Danach in der `.env` die Domain aktualisieren:
```env
ALLOWED_ORIGIN=https://deine-domain.de
```

Und App neu starten:
```bash
docker compose down && docker compose up -d
```

---

## Updates einspielen

Wenn du eine neue Version deployen möchtest:

```bash
# Neue Dateien holen (wenn per Git)
git pull

# Image neu bauen und starten (Daten bleiben erhalten!)
docker compose up -d --build
```

---

## Datenbank sichern

Die Datenbank liegt in einem Docker-Volume (`feelgut-data`). Backup erstellen:

```bash
docker run --rm \
  -v feelgut_feelgut-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/feelgut-backup-$(date +%Y%m%d).tar.gz -C /data .
```

Backup wiederherstellen:

```bash
docker compose down
docker run --rm \
  -v feelgut_feelgut-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/feelgut-backup-DATUM.tar.gz -C /data
docker compose up -d
```

---

## Nützliche Befehle

```bash
docker compose logs -f          # Live-Logs anzeigen
docker compose down             # App stoppen
docker compose up -d            # App starten
docker compose restart          # App neu starten
docker compose up -d --build    # App neu bauen und starten
```
