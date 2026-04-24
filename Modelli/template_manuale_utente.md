# TEMPLATE MANUALE UTENTE
## Linee Guida per la Creazione di Manuali Operativi

---

## STRUTTURA STANDARD

### 1. INTESTAZIONE
```markdown
# MANUALE UTENTE - [NOME MODULO]
## [CODICE MODULO] - [Sottotitolo Descrittivo]

Versione: X.X
Data: AAAA-MM-GG
Destinatari: [Ruolo utenti finali]
```

### 2. INDICE RAPIDO
- Max 6-8 sezioni principali
- Titoli orientati all'azione (es: "Come fare X", "Gestione Y")
- Link cliccabili alle sezioni

### 3. STRUTTURA SEZIONI

---

## ELEMENTI GRAFICI E FORMATTAZIONE

### Box Mockup Interfacce
Usare diagrammi ASCII per rappresentare le schermate:

```
┌─────────────────────────────────────┐
│  TITOLO SCHERMATA                   │
│                                     │
│  Campo 1: [____________]  🔍        │
│  Campo 2: [____________]            │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  Area contenuto / Griglia     │  │
│  └───────────────────────────────┘  │
│                                     │
│    [  Pulsante 1  ] [  Pulsante 2  ]│
└─────────────────────────────────────┘
```

**Regole:**
- Larghezza max: 60 caratteri
- Usare caratteri box: ┌ ─ ┐ │ └ ┘ ├ ┤ ┬ ┴ ┼
- Campi input: [____]
- Pulsanti: [ Testo ]
- Icone emoji dove appropriate: 🔍 📊 ⏱️ 📁 ✅ ❌

### Icone e Simboli Standard

**Stati e Risultati:**
- ✅ Operazione corretta / Sì / Abilitato
- ❌ Errore / No / Disabilitato
- ⚠️ Attenzione / Warning
- ℹ️ Informazione
- 💡 Suggerimento / Tip
- 📌 Nota importante

**Tipo Messaggio:**
- 🔴 Errore bloccante
- 🟡 Warning non bloccante
- 🟢 Successo / Completato
- 🔵 Informativo

**Azioni:**
- ▶️ Avvia / Play
- ⏸️ Pausa
- ⏹️ Stop
- 🔄 Ricarica / Aggiorna
- 💾 Salva
- 🗑️ Elimina
- ✏️ Modifica
- 👁️ Visualizza
- 🖨️ Stampa
- 🔍 Cerca

**Categorie:**
- 📁 File / Documenti
- 📊 Report / Statistiche
- ⚙️ Impostazioni
- 🔒 Sicurezza / Password
- 📞 Supporto / Contatti
- ❓ Domande / FAQ

### Box Evidenziati

**Box Attenzione:**
```markdown
⚠️ **ATTENZIONE**: Messaggio importante

Spiegazione del rischio o comportamento critico.
```

**Box Suggerimento:**
```markdown
💡 **SUGGERIMENTO**: Consiglio operativo

Best practice o trucco per velocizzare.
```

**Box Nota:**
```markdown
📌 **NOTA**: Informazione rilevante

Dettaglio aggiuntivo da ricordare.
```

**Box Procedura:**
```markdown
**COSA FARE:**
1. Primo passo
2. Secondo passo
3. Terzo passo
```

### Diagrammi di Flusso

Usare caratteri ASCII per flow chart semplici:

```
                  ┌─────────────────┐
                  │ Domanda?        │
                  └────────┬────────┘
                           │
           ┌───────────────┴───────────────┐
           │                               │
        ❌ NO                            ✅ SÌ
           │                               │
           ▼                               ▼
    ┌─────────────┐                ┌─────────────┐
    │  Azione A   │                │  Azione B   │
    └─────────────┘                └─────────────┘
           │                               │
           └───────────────┬───────────────┘
                           ▼
                    ┌─────────────┐
                    │  Risultato  │
                    └─────────────┘
```

### Sequenze Temporali

Per operazioni step-by-step con timeline:

```
10:00 → Azione 1 → Risultato 1
10:30 → Azione 2 → Risultato 2
11:00 → Azione 3 → Risultato 3
```

---

## STILE DI SCRITTURA

### Tono e Linguaggio

**DA FARE:**
- ✅ Usa la seconda persona ("tu" / "voi")
- ✅ Linguaggio semplice e diretto
- ✅ Frasi brevi (max 20 parole)
- ✅ Verbi all'imperativo per istruzioni ("Clicca", "Inserisci", "Seleziona")
- ✅ Esempi concreti con numeri reali
- ✅ Termini tecnici solo se necessari (e spiegati)

**DA EVITARE:**
- ❌ Gergo tecnico non necessario
- ❌ Frasi passive ("viene inserito" → "inserisci")
- ❌ Acronimi senza spiegazione
- ❌ Riferimenti a codice o database
- ❌ Linguaggio burocratico

### Struttura Paragrafi

**Ogni sezione deve avere:**
1. **Titolo chiaro** (cosa fa / quando usarla)
2. **Mockup visuale** (se applicabile)
3. **Procedura step-by-step**
4. **Esempi pratici**
5. **Note/warning** (se necessari)

**Template Sezione Standard:**
```markdown
### [N]. [NOME OPERAZIONE]

[Breve introduzione - 1-2 righe]

#### Schermata [Nome]

[Mockup ASCII della schermata]

#### Come [Fare X]

**COSA FARE:**
1. Primo passo con dettagli
2. Secondo passo con dettagli
3. Terzo passo con dettagli

**ESEMPIO PRATICO:**
```
Scenario reale con numeri
→ Azione eseguita
→ Risultato ottenuto
```

💡 **SUGGERIMENTO**: [Consiglio utile]

⚠️ **ATTENZIONE**: [Warning se necessario]
```

---

## SEZIONI OBBLIGATORIE

### 1. Introduzione / Come Iniziare
- Scopo del modulo
- A chi è rivolto
- Prerequisiti (se presenti)
- Prima operazione (quick start)

### 2. Operazioni Principali
- Una sezione per ogni funzione core
- Procedura step-by-step
- Mockup interfaccia
- Esempi pratici

### 3. Gestione Casi Particolari
- Scenari alternativi
- Eccezioni alle regole standard
- Tabelle comparative (quando scegliere X vs Y)

### 4. Messaggi di Errore
- Max 10 messaggi più comuni
- Formato standard:
  ```markdown
  ### 🔴 "Testo messaggio errore"

  **CAUSA:**
  - Motivo 1
  - Motivo 2

  **SOLUZIONE:**
  1. Passo 1
  2. Passo 2
  3. Se persiste: contatta supporto
  ```

### 5. FAQ (Domande Frequenti)
- 8-12 domande tipiche
- Formato domanda/risposta
- Ordinate per frequenza o per tema
- Formato:
  ```markdown
  ### ❓ Domanda chiara?

  **RISPOSTA:**
  - Risposta diretta
  - Dettagli se necessari
  - Riferimento a sezione specifica (se applicabile)
  ```

### 6. Supporto / Contatti
- Numeri interni
- Email supporto
- Orari disponibilità
- Escalation procedure (se applicabile)

### 7. Riepilogo Veloce
- Sequenza tipo più comune (5-10 passi)
- Sequenza alternativa (se esiste)
- Formato compatto tipo checklist

---

## ESEMPI E SCENARI

### Regole per Esempi Efficaci

**✅ BUON ESEMPIO:**
```
Richiesti: 100 pezzi
Prodotti finora: 50 pezzi
→ Clicca ACCONTO per registrare i 50 pezzi
→ Il sistema salva e ti permette di continuare
→ Più tardi produci altri 50 pezzi
→ Clicca SALDO per chiudere (totale: 100 pezzi)
```

**❌ CATTIVO ESEMPIO:**
```
Inserire la quantità nel campo apposito e procedere
con il salvataggio tramite il pulsante appropriato.
```

### Tipi di Esempi da Includere

1. **Scenario Standard** - Caso più comune, tutto ok
2. **Scenario con Eccezione** - Caso con warning/errore gestibile
3. **Scenario Alternativo** - Metodo diverso per stesso risultato
4. **Scenario Multi-step** - Operazione complessa con più fasi

---

## TABELLE E COMPARAZIONI

### Tabella Comparativa

Quando ci sono alternative (es: ACCONTO vs SALDO):

```markdown
| Aspetto | Opzione A | Opzione B |
|---------|-----------|-----------|
| Quando usarla | Descrizione chiara | Descrizione chiara |
| Cosa fa | Elenco puntato | Elenco puntato |
| Limiti | Eventuali limiti | Eventuali limiti |
```

### Schema Decisionale

Per guidare la scelta:

```markdown
## Cosa Scegliere?

✅ Usa **OPZIONE A** se:
- Condizione 1
- Condizione 2
- Condizione 3

✅ Usa **OPZIONE B** se:
- Condizione 1
- Condizione 2
- Condizione 3
```

---

## CHECKLIST PRE-PUBBLICAZIONE

Prima di considerare completo un manuale, verificare:

### Contenuto
- [ ] Tutte le sezioni obbligatorie presenti
- [ ] Ogni funzione principale coperta
- [ ] Almeno 1 esempio per ogni operazione
- [ ] FAQ con minimo 8 domande
- [ ] Sezione errori con i 10 messaggi più comuni
- [ ] Riepilogo veloce alla fine

### Formattazione
- [ ] Mockup ASCII per ogni schermata principale
- [ ] Icone/emoji usate in modo consistente
- [ ] Box evidenziati per warning/suggerimenti
- [ ] Diagrammi di flusso per decisioni complesse
- [ ] Indice con link funzionanti

### Linguaggio
- [ ] Tono colloquiale e diretto
- [ ] Nessun termine tecnico non spiegato
- [ ] Verbi all'imperativo nelle istruzioni
- [ ] Esempi con numeri reali
- [ ] Nessuna frase >25 parole

### Usabilità
- [ ] Un operatore può seguire senza formazione
- [ ] Ogni procedura è completa (nessun "poi...")
- [ ] Scenari realistici e riconoscibili
- [ ] Contatti supporto chiari e aggiornati

---

## ESEMPIO STRUTTURA COMPLETA

```markdown
# MANUALE UTENTE - [NOME MODULO]
## [CODICE] - [Sottotitolo]

Versione: 1.0 | Data: 2025-01-XX | Utenti: Operatori Produzione

---

## INDICE RAPIDO

1. [Come Iniziare](#1-come-iniziare)
2. [Operazione Principale 1](#2-operazione-principale-1)
3. [Operazione Principale 2](#3-operazione-principale-2)
4. [Scelta tra Opzioni](#4-scelta-tra-opzioni)
5. [Messaggi di Errore](#5-messaggi-di-errore)
6. [Domande Frequenti](#6-domande-frequenti)
7. [Supporto](#7-supporto)
8. [Riepilogo Veloce](#8-riepilogo-veloce)

---

## 1. COME INIZIARE

[Introduzione breve - 2-3 righe]

### PASSO 1: [Prima Azione]

[Mockup schermata]

**COSA FARE:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

💡 **SUGGERIMENTO**: [Tip utile]

### PASSO 2: [Seconda Azione]

[Continua...]

---

## 2. OPERAZIONE PRINCIPALE 1

[Struttura come sopra]

---

## 3. OPERAZIONE PRINCIPALE 2

[Struttura come sopra]

---

## 4. SCELTA TRA OPZIONI

### 🔷 OPZIONE A

**QUANDO USARLA:**
- [Condizione 1]
- [Condizione 2]

**COSA FA IL SISTEMA:**
- [Azione 1]
- [Azione 2]

### 🔶 OPZIONE B

[Come sopra]

### 📊 SCHEMA DECISIONALE

[Diagramma flusso]

---

## 5. MESSAGGI DI ERRORE

### 🔴 "Messaggio 1"

**CAUSA:** [Spiegazione]

**SOLUZIONE:**
1. [Step 1]
2. [Step 2]

---

[Ripeti per altri messaggi]

---

## 6. DOMANDE FREQUENTI

### ❓ Domanda 1?

**RISPOSTA:** [Risposta chiara e diretta]

---

[Ripeti per 8-12 domande]

---

## 7. SUPPORTO

📞 **Contatti:**
- Responsabile: [Nome] - Interno XXX
- Email: support@azienda.it
- Orari: Lun-Ven 8:00-18:00

---

## 8. RIEPILOGO VELOCE

### Sequenza Standard

```
1. [Azione 1]
2. [Azione 2]
3. [Azione 3]
...
10. FATTO! ✓
```

---

**Buon Lavoro! 🎯**

*Versione: 1.0 - Creato: [Data]*
```

---

## NOTE FINALI

### Lunghezza Raccomandata
- **Manuale Completo**: 2000-4000 parole
- **Guida Rapida**: 800-1500 parole
- **FAQ Stand-alone**: 500-1000 parole

### Formati Output
- Primario: **Markdown** (.md)
- Secondario: **PDF** (per stampa)
- Terziario: **HTML** (per intranet)

### Manutenzione
- Aggiornare ad ogni release software
- Verificare link e contatti trimestralmente
- Raccogliere feedback utenti e integrare FAQ

### Localizzazione
- Linguaggio: **Italiano** per utenti italiani
- Termini tecnici: mantenere in inglese solo se universali (es: "login")
- Date: formato DD/MM/YYYY o AAAA-MM-GG (ISO)

---

## RISORSE E STRUMENTI

### Caratteri Speciali Box
```
┌ ─ ┐  (angoli superiori)
│      (laterali)
└ ─ ┘  (angoli inferiori)
├ ┤    (T laterali)
┬ ┴    (T alto/basso)
┼      (croce)
```

### Emoji Comuni
```
✅ ❌ ⚠️ ℹ️ 💡 📌
🔴 🟡 🟢 🔵
▶️ ⏸️ ⏹️ 🔄 💾 🗑️
📁 📊 ⚙️ 🔒 📞 ❓
```

### Template Vuoti Pronti
- Mockup schermata vuota: vedi sezione "Box Mockup Interfacce"
- Diagramma flusso vuoto: vedi sezione "Diagrammi di Flusso"
- Template FAQ: vedi sezione "FAQ"

---

**Questo template va salvato e usato come riferimento per ogni nuovo manuale utente.**

*Versione Template: 1.0*
*Ultima modifica: 2025-01-XX*
