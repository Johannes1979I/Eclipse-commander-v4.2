# Eclipse Commander v4.2.0 - Exposure Optimization

## 🎯 Esposizioni Ottimizzate per Camera + Ottica

### Problema risolto
Le esposizioni di scatto erano **hardcoded** e identiche per qualsiasi setup (camera + telescopio). Un f/5 con ASI2600 e un f/15 con Canon 6D generavano gli stessi tempi.

### Soluzione: Modello Fotometrico Reale

Il nuovo `ExposureOptimizer v2.0` calcola le esposizioni in base a:

#### Formula di scala
```
t_actual = t_reference × (f_actual / f_ref)² × (ISO_ref / ISO_actual)
```

- **f/ratio**: Un'ottica f/5 raccoglie 4× più luce di f/10 → esposizioni 4× più corte
- **ISO/Gain**: ISO 800 = 8× più sensibile di ISO 100 → esposizioni 8× più corte
- **Tipo sensore**: Sensori BSI (IMX571, IMX455, etc.) hanno QE superiore → compensato

#### Riferimento: Tabella Fred Espenak (NASA)
Setup di riferimento: **f/10, ISO 100**. Le esposizioni base per ogni fase dell'eclissi sono derivate dalla guida di Fred Espenak e scalate per l'equipment reale.

#### Caratteristiche CMOS specifiche
- **Unity Gain**: Usato come punto di riferimento per la conversione Gain → ISO equivalente
- **Gain per stop**: ZWO (~33), QHY (~25), altri (~30)
- **Rilevamento BSI**: Sensori IMX294, IMX571, IMX455, etc. riconosciuti automaticamente

#### Limiti trailing automatici
- Calcolo dell'esposizione massima prima che il moto siderale causi trailing visibile (>1 pixel)
- Basato su focale, pixel size e tracking residuo tipico (~1"/s)

#### Arrotondamento a shutter standard
Le esposizioni calcolate vengono arrotondate ai valori reali delle camere (1/8000, 1/6400, ... 1, 2, 4s)

### Esempi pratici

| Setup | Cromosfera | Corona Interna | Corona Esterna |
|-------|------------|----------------|----------------|
| f/10, Canon 6D @ ISO 400 | 1/8000-1/1000 | 1/4000-1/125 | 1/15-1s |
| f/5, ASI2600 @ gain 100 | 1/8000-1/4000 | 1/8000-1/500 | 1/60-1/4 |
| f/15, Nikon D850 @ ISO 200 | 1/1250-1/160 | 1/640-1/20 | 1/2-6s |

### File modificati
- `js/equipment/exposure-optimizer.js` - **Riscritto completamente** con modello fotometrico
- `js/eclipse-sequences-fixed.js` - `getExposures()` ora usa l'optimizer con equipment
- `js/ui/equipment-panel.js` - Passa campo `sensor` per rilevamento BSI
- `js/config.js` - Versione 4.2.0
