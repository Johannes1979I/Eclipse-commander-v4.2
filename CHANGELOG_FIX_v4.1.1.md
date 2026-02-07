# Eclipse Commander - Changelog v4.1.1

**Data:** 7 Febbraio 2026

## 🐛 Bug Fix

### Solar Tracker - Correzione Altitudine e Azimuth
**Problema:** I campi "ALTITUDINE CORRENTE" e "AZIMUTH CORRENTE" rimanevano vuoti nella sezione "Percorso Sole & Tracking Real-Time".

**Causa:** Chiamata errata alla classe `AstronomyCalculator` invece dell'istanza `astronomyCalc`.

**Correzioni applicate:**
- ✅ `js/ui/solar-tracker.js` (riga 669) - funzione `updateCurrentPosition()`
- ✅ `js/ui/solar-tracker.js` (riga 469) - calcolo percorso solare
- ✅ `js/modes/solar-mode.js` (riga 368) - modalità Solar

**Risultato:** I campi ora si aggiornano correttamente ogni secondo mostrando altitudine e azimuth del sole in tempo reale.

---

## ✨ Nuove Funzionalità

### Export EKOS (.esq) - Parametri Camera Completi

**Problema:** Le sequenze esportate in EKOS non includevano GAIN/ISO, OFFSET e Temperatura.

**Implementazione:**

#### 1. **GAIN (per camere CMOS)**
- ✅ Usa il valore specificato nella sequenza se presente
- ✅ Fallback automatico a Unity Gain della camera se configurato
- ✅ Valore di default: **100** se non specificato

#### 2. **OFFSET (per camere CMOS)**
- ✅ Usa il valore specificato nella sequenza se presente
- ✅ Valore di default: **30** (standard per la maggior parte delle camere CMOS moderne)

#### 3. **ISO (per camere DSLR)**
- ✅ Usa il valore specificato nella sequenza se presente
- ✅ Valore di default: **400** (ISO standard)

#### 4. **TEMPERATURA (per camere raffreddate)**
- ✅ Rilevamento automatico camere raffreddate
- ✅ Temperatura di default: **-10°C** per camere con raffreddamento
- ✅ Flag `force="true"` quando raffreddamento attivo
- ✅ Temperatura 0°C con `force="false"` per camere non raffreddate

**File modificati:**
- `js/platforms/ekos-connector.js` - Export EKOS con parametri completi
- `js/platforms/nina-connector.js` - Allineamento default NINA

---

## 📋 Valori di Default

| Parametro | CMOS | DSLR | Note |
|-----------|------|------|------|
| **Gain** | 100 | - | Unity Gain se disponibile |
| **Offset** | 30 | - | Standard moderno |
| **ISO** | - | 400 | Standard DSLR |
| **Temperatura** | -10°C* | - | *Solo se raffreddata |

---

## 🎯 Compatibilità

- ✅ **EKOS/INDI** - File .esq con parametri completi
- ✅ **N.I.N.A.** - File .json con parametri allineati
- ✅ **Camere CMOS** - ZWO ASI, QHY, Player One, ecc.
- ✅ **Camere DSLR** - Canon, Nikon, Sony, ecc.
- ✅ **Camere raffreddate** - Controllo temperatura automatico

---

## 📝 Note per gli Utenti

### Come configurare i parametri

1. **Gain/Offset personalizzati:**
   - I valori possono essere specificati nelle impostazioni delle sequenze
   - Se non specificati, vengono usati i valori di default

2. **Unity Gain:**
   - Configurare il valore Unity Gain nella sezione Equipment
   - Viene usato automaticamente se disponibile

3. **Temperatura:**
   - Per camere raffreddate, la temperatura target è -10°C di default
   - Modificabile nel futuro tramite impostazioni camera

### Verifica file .esq

Quando importi il file .esq in EKOS, verifica che tutti i campi siano popolati:
- ✅ ISO/Guadagno (Gain)
- ✅ Scostamento (Offset)  
- ✅ Temperatura (Temperature)

Se alcuni valori non sono corretti, puoi modificarli direttamente in EKOS prima dell'esecuzione.

---

## 🔧 Dettagli Tecnici

### Struttura XML EKOS
```xml
<Job>
    <Exposure>0.001</Exposure>
    <Temperature force="true">-10</Temperature>
    <Gain>100</Gain>
    <Offset>30</Offset>
    ...
</Job>
```

### Logica di fallback
```
GAIN:
1. Valore sequenza (se specificato)
2. Unity Gain camera (se configurato)
3. Default 100

OFFSET:
1. Valore sequenza (se specificato)
2. Default 30

TEMPERATURA:
1. Camera cooling → -10°C (force=true)
2. Camera senza cooling → 0°C (force=false)
```

---

**Versione:** 4.1.1  
**Build:** 2026-02-07  
**Compatibilità:** EKOS 3.x, N.I.N.A. 2.x+
