# Handover Checklist (One-Time Delivery)

1. Installazione ambiente
- Node 20 o Docker installati
- Dominio/subdominio dedicato (es. `chat.cliente.it`)

2. Configurazione
- `.env` compilato (`OPENAI_API_KEY`, `ADMIN_TOKEN`)
- `data/tenants/default.json` personalizzato
- `security.allowedEmbedHosts` impostato con domini reali

3. Verifiche funzionali
- `/health` risponde
- widget apribile da embed
- simulazione calcolatore funzionante
- chat AI risponde
- lead salvato in `data/leads.ndjson`
- webhook lead ricevuto (se configurato)

4. Consegna cliente
- snippet embed finale
- credenziali admin/token
- procedura backup cartella `data/`
- mini training su modifica testi/prompt/listino

5. Post-consegna
- test da dominio produzione
- conferma eventi lead con team commerciale
