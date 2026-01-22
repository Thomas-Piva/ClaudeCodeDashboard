# Quick Start Guide

Guida rapida per avviare la Dashboard Claude Code in 5 minuti.

## Step 1: Installazione Dipendenze

```bash
# Da root
npm install

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
cd ..
```

## Step 2: Configurazione Progetti

Modifica `backend/config.json` con i tuoi progetti:

```json
{
  "projects": [
    {
      "name": "MioProgetto",
      "path": "C:\\Path\\Al\\Progetto"
    }
  ]
}
```

**Nota**: Usa doppio backslash `\\` per i path Windows!

## Step 3: Avvio Dashboard

```bash
npm run dev
```

Questo avvia:
- Backend: http://localhost:3001
- Frontend: http://localhost:5173 (si apre automaticamente)

## Step 4: Testing con Simulatore

In un nuovo terminale, avvia il simulatore che modifica automaticamente i file status.json:

```bash
npm run simulate
```

Il simulatore aggiorna lo status di tutti i progetti ogni 5 secondi con dati casuali.

## Struttura File Status

Ogni progetto deve avere un file `.claude/status.json`:

```json
{
  "status": "active",
  "lastUpdate": "2025-01-22T10:30:00Z",
  "lastOutput": "Building component...",
  "project": "MioProgetto"
}
```

## Comandi Utili

| Comando | Descrizione |
|---------|-------------|
| `npm run dev` | Avvia backend + frontend |
| `npm run dev:backend` | Solo backend |
| `npm run dev:frontend` | Solo frontend |
| `npm run simulate` | Simulatore attività |
| `npm run build` | Build produzione |

## Troubleshooting Rapido

### "Cannot find module"
```bash
# Reinstalla dipendenze
npm install && cd backend && npm install && cd ../frontend && npm install
```

### Porta 3001 occupata
Modifica `PORT` in `backend/server.js`

### Frontend non si connette
Verifica che il backend sia in esecuzione su http://localhost:3001

## Prossimi Passi

1. Personalizza `backend/config.json` con i tuoi progetti reali
2. Il backend crea automaticamente i file `.claude/status.json` se mancanti
3. Integra con le tue sessioni Claude Code reali

Vedi [README.md](README.md) per documentazione completa.
