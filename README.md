# Solar Chat Widget (Client-Hosted)

Pacchetto self-hosted per aziende fotovoltaiche:
- chat AI in italiano
- calcolatore EV + fotovoltaico
- embed universale per qualsiasi CMS (WordPress, HTML custom, ecc.)

## 1) Architettura

- `src/server.js`: API backend (chat + calcolo)
- `public/embed.js`: snippet universale da incorporare nei siti clienti
- `public/widget/*`: UI chatbot
- `public/demo/*`: pagina demo embed per test corner launcher
- `data/tenants/default.json`: configurazione hardcoded del chatbot
- `data/chat.ndjson`: log chat/calcoli/errori

La logica del calcolatore e le chiamate AI sono lato server, non nel browser.

## 2) Config hardcoded (senza admin)

Questa versione non ha pannello admin e non espone endpoint di modifica config a runtime.

Per cambiare testi, colori, prezzi, modelli auto o prompt AI:
1. modifica `data/tenants/default.json`
2. ridistribuisci/redeploya il servizio

## 3) Requisiti

- Node.js 20+
- opzionale: Docker + Docker Compose

## 4) Avvio locale

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

## 5) Configurazione `.env`

```env
PORT=3000
BASE_URL=http://localhost:3000
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4.1-mini
ALLOWED_ORIGINS=*
```

Note:
- se `OPENAI_API_KEY` e' vuota, la chat usa fallback locale (no AI cloud)
- in produzione evita `ALLOWED_ORIGINS=*` e usa domini espliciti

## 6) Modalita UI

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

## 7) Embed sul sito cliente

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
- `data-tenant`: mantiene compatibilita' ma questa build usa config hardcoded `default`
- `data-label`: testo bottone floating
- `data-position`: `right` o `left`
- `data-primary-color`: colore bottone

## 8) API principali

- `GET /api/public/config`
- `POST /api/calculate`
- `POST /api/chat`

## 9) Docker

```bash
cp .env.example .env
docker compose up -d --build
```

Servizio: `solar-chat`, porta `3000`.

## 10) Sicurezza e protezione IP

- le API key restano lato server
- usa `security.allowedEmbedHosts` in `data/tenants/default.json` per limitare i domini autorizzati
- distribuisci solo build/package operativo al cliente
- proteggi legalmente con contratto/licenza (tecnicamente la copia non puo' essere azzerata al 100%)
