# Eclipse Commander v4.3.1 — Fix Export .esq per Ekos/KStars

Correzione dell'esportazione della sequenza `.esq` verso Ekos/KStars, verificata
contro il sorgente reale di KStars (`sequencequeue.cpp`, `sequencejob.cpp::loadFrom`,
`capturedeviceadaptor::cameraGain`). File toccato: `js/platforms/ekos-connector.js`
(`convertToEkosFormat`).

## 🔴 Bug critico corretto — Gain/Offset non applicati
Prima venivano scritti come elementi top-level `<Gain>`/`<Offset>`, che il parser di
KStars **non legge**: il gain veniva quindi ignorato e la camera scattava con il gain
sbagliato (per un'eclissi = scatti rovinati). Ora Gain/Offset sono dentro
`<Properties>` nel formato che Ekos legge davvero (`cameraGain`):
- `CCD_CONTROLS` → `Gain`/`Offset` (ToupTek/ZWO/QHY)
- fallback `CCD_GAIN` → `GAIN` e `CCD_OFFSET` → `OFFSET` per camere con vettori dedicati

## 🟠 Altri fix di conformità allo schema KStars v2.6
- **Naming**: rimosso il blocco `<Prefix>` deprecato (i booleani venivano letti come
  `"1"/"0"`, non `"true"/"false"`). Ora si usa `<TargetName>Eclipse_<Fase>` +
  `<PlaceholderFormat>` + `<PlaceholderSuffix>`.
- **Properties**: formato `<OneElement name='X'>valore</OneElement>` (testo), non più
  l'errato `<OneElement name="X" value="On"/>`.
- **Calibration**: schema attuale `<PreAction><Type>0</Type></PreAction>` +
  `<FlatDuration dark='false'>`, al posto di `<FlatSource>/<PreMountPark>/<PreDomePark>`.
- **UploadMode**: aggiunto `<UploadMode>1</UploadMode>` (salvataggio locale su disco).
- **Header**: rimosso `<CCD>Eclipse Commander</CCD>`; aggiunti guide/refocus disabilitati
  (nessun enforcement durante l'eclissi).

## 🟡 Rifiniture
- **Filtro manuale**: le etichette dell'eclissi (`NESSUNO`, `ND5 Solar`, `RIMUOVERE ORA!`…)
  non vengono più scritte come `<Filter>` (evita i warning "filtro non trovato" in Ekos:
  l'eclissi usa filtro manuale, non su ruota).
- **Temperatura**: priorità all'input di sequenza (`seq.temp`), poi alla camera raffreddata.

## ✅ Verifica
- `node --check` OK; XML validato well-formed con `xml.dom.minidom` (Windows) e
  `xmllint` su AstroArch EQ8 (stesso stack libxml/Qt di KStars).
- Test di integrazione con oggetti sequenza reali (`...params` + etichette filtro):
  9 job → Gain emesso in tutti, 0 `<Filter>`, Temperatura da `seq.temp`, TargetName puliti.
- Residuo: load-test dentro una sessione Ekos "viva" (da fare all'avvio di KStars).

## Nota reflex (DSLR)
Ekos vuole `<ISOIndex>` (indice nella lista ISO della camera), non un valore ISO grezzo.
Per le CMOS (gain) è tutto coperto; l'ISO per reflex verrà gestito nella fase "live"
quando la camera è connessa e la sua lista ISO è nota.
