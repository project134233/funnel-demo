# Solar Chat Widget (Client-Hosted)

Pacchetto self-hosted per aziende fotovoltaiche:
- chat AI in italiano
- calcolatore EV + fotovoltaico
- raccolta lead
- embed universale per qualsiasi CMS (WordPress, HTML custom, ecc.)

## 1) Architettura

- `src/server.js`: API backend (chat, calcolo, lead, admin)
- `public/embed.js`: snippet universale da incorporare nei siti clienti
- `public/widget/*`: UI chatbot in iframe
- `data/tenants/*.json`: configurazioni tenant
- `data/leads.ndjson`: lead raccolti
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

## 5) Embed sul sito cliente

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

## 6) Multi-tenant

Creare file tenant, esempio `data/tenants/cliente1.json`.

Puoi partire da `data/tenants/default.json` e cambiare:
- branding (`brandName`, `ui`)
- prompt AI (`assistant.systemPrompt`)
- listini (`options.packagePrices`)
- host consentiti (`security.allowedEmbedHosts`)
- webhook lead (`integrations.leadWebhook`)

## 7) Admin UI

Pagina: `https://TUO-DOMINIO/admin/`

Permette caricare/salvare JSON tenant via API admin (`x-admin-token`).

## 8) API principali

- `GET /api/public/config?tenant=default`
- `POST /api/calculate`
- `POST /api/chat`
- `POST /api/leads`
- `GET /api/admin/config?tenant=default` (auth token)
- `PUT /api/admin/config?tenant=default` (auth token)

## 9) Docker

```bash
cp .env.example .env
docker compose up -d --build
```

Servizio: `solar-chat`, porta `3000`.

## 10) Sicurezza e protezione IP

- le API key restano lato server
- usa `security.allowedEmbedHosts` per limitare i domini autorizzati
- distribuisci solo build/package operativo al cliente
- proteggi legalmente con contratto/licenza (tecnicamente la copia non puo' essere azzerata al 100%)

