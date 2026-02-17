# Solar Chat Widget (Client-Hosted)

Pacchetto self-hosted per aziende fotovoltaiche:
- chat AI in italiano
- calcolatore EV + fotovoltaico
- embed universale per qualsiasi CMS (WordPress, HTML custom, ecc.)

## 1) Architettura

- `src/server.js`: API backend (chat, calcolo, admin)
- `public/embed.js`: snippet universale da incorporare nei siti clienti
- `public/widget/*`: UI chatbot
- `public/demo/*`: pagina demo embed per test corner launcher
- `data/tenants/*.json`: configurazioni tenant
- `data/chat.ndjson`: log chat/calcoli/errori

La logica del calcolatore e le chiamate AI sono lato server, non nel browser.

## 2) Requisiti

- Node.js 20+
- opzionale: Docker + Docker Compose

## 3) Avvio locale

```bash
cp .env.example .env
npm install
npm start
```

Server su `http://localhost:3000`.

Link utili in locale:
- `http://localhost:3000/health`
- `http://localhost:3000/widget/index.html?tenant=default` (fullscreen direct page)
- `http://localhost:3000/demo/` (corner embed demo)
- `http://localhost:3000/admin/`

## 4) Configurazione `.env`

```env
PORT=3000
BASE_URL=http://localhost:3000
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
ALLOWED_ORIGINS=*
ADMIN_TOKEN=change-me
```

Note:
- se `OPENAI_API_KEY` e' vuota, la chat usa fallback locale (no AI cloud)
- `ADMIN_TOKEN` protegge endpoint admin

## 5) Modalita UI

Il progetto ora ha due modalita principali:

- Direct/fullscreen page: `https://TUO-DOMINIO/widget/index.html?tenant=default`
  - chatbot centrato
  - sezione branding/info in alto, fuori dal box chat
  - consigliato per traffico ads (landing chat diretta)
- Embed/corner launcher: usare `embed.js` su un sito esistente
  - bottone flottante in basso
  - pannello chat che si apre in overlay
  - consigliato per siti cliente gia online

Pagina demo embed (simula sito cliente):
- `https://TUO-DOMINIO/demo/`

## 6) Embed sul sito cliente

Incollare prima di `</body>`:

```html
<script
  src="https://TUO-DOMINIO/embed.js"
  data-tenant="default"
  data-label="Consulente FV"
  data-position="right"
  data-primary-color="#f39c12"
></script>
```

Attributi disponibili:
- `data-tenant`: id tenant (`default`, `cliente1`, ...)
- `data-label`: testo bottone floating
- `data-position`: `right` o `left`
- `data-primary-color`: colore bottone

## 7) Multi-tenant

Creare file tenant, esempio `data/tenants/cliente1.json`.

Puoi partire da `data/tenants/default.json` e cambiare:
- branding (`brandName`, `ui`)
- prompt AI (`assistant.systemPrompt`)
- listini (`options.packagePrices`)
- host consentiti (`security.allowedEmbedHosts`)

## 8) Admin UI

Pagina: `https://TUO-DOMINIO/admin/`

Permette caricare/salvare JSON tenant via API admin (`x-admin-token`).

## 9) API principali

- `GET /api/public/config?tenant=default`
- `POST /api/calculate`
- `POST /api/chat`
- `GET /api/admin/config?tenant=default` (auth token)
- `PUT /api/admin/config?tenant=default` (auth token)

## 10) Docker

```bash
cp .env.example .env
docker compose up -d --build
```

Servizio: `solar-chat`, porta `3000`.

## 11) Primo deploy con volume persistente

Se monti un volume vuoto su `/app/data`, inizializza il tenant `default` una volta:

```bash
curl -X PUT "https://TUO-DOMINIO/api/admin/config?tenant=default&token=ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  --data-binary @data/tenants/default.json
```

Verifica:
- `https://TUO-DOMINIO/health`
- `https://TUO-DOMINIO/widget/index.html?tenant=default`
- `https://TUO-DOMINIO/demo/`

## 12) Sicurezza e protezione IP

- le API key restano lato server
- usa `security.allowedEmbedHosts` per limitare i domini autorizzati
- distribuisci solo build/package operativo al cliente
- proteggi legalmente con contratto/licenza (tecnicamente la copia non puo' essere azzerata al 100%)
