# Handover Checklist (One-Time Delivery)

1. Installazione ambiente
- Node 20 o Docker installati
- Dominio/subdominio dedicato (es. `chat.cliente.it`)

2. Configurazione
- `.env` compilato (`OPENAI_API_KEY`, `ALLOWED_ORIGINS`)
- `data/tenants/default.json` personalizzato (testi, prezzi, prompt, host)
- `security.allowedEmbedHosts` impostato con domini reali

3. Verifiche funzionali
- `/health` risponde
- widget apribile da embed (`/demo/`)
- simulazione calcolatore funzionante
- chat AI risponde

4. Consegna cliente
- snippet embed finale
- procedura backup cartella `data/`
- mini training su modifica file `data/tenants/default.json` + redeploy

5. Post-consegna
- test da dominio produzione
- conferma funzionamento simulazione e chat con team commerciale
