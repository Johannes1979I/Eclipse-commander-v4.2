/**
 * ECLIPSE SEQUENCES - CORRECTED VERSION
 * Prende dati da Equipment e Eclipse Selector
 */

class EclipseSequences {
    constructor() {
        this.sequences = [];
        this.phases = [];
        this.phaseTimer = null;
        this.standaloneTimer = null;
    }
    
    /**
     * Inizializza
     */
    initialize() {
        Utils.log('Inizializzazione Eclipse Sequences...');
        
        // Pulsante genera
        const btnGenerate = document.getElementById('btnGenerateSequences');
        if (btnGenerate) {
            btnGenerate.addEventListener('click', () => this.generateSequences());
        }
        
        // ✅ A) Pulsante Ottimizza Scatti
        const btnOptimize = document.getElementById('btnOptimizeSequences');
        if (btnOptimize) {
            btnOptimize.addEventListener('click', () => this.optimizeSequences());
        }
        
        // Pulsanti fasi
        const btnStartPhases = document.getElementById('btnStartPhases');
        if (btnStartPhases) {
            btnStartPhases.addEventListener('click', () => this.startPhasesCountdown());
        }
        
        const btnStopPhases = document.getElementById('btnStopPhases');
        if (btnStopPhases) {
            btnStopPhases.addEventListener('click', () => this.stopPhasesCountdown());
        }
        
        // Pulsanti upload
        const btnNINA = document.getElementById('btnUploadNINA');
        if (btnNINA) btnNINA.addEventListener('click', () => this.uploadNINA());
        
        const btnEkos = document.getElementById('btnUploadEkos');
        if (btnEkos) btnEkos.addEventListener('click', () => this.uploadEkos());
        
        // Pulsanti download
        const btnJSON = document.getElementById('btnDownloadJSON');
        if (btnJSON) btnJSON.addEventListener('click', () => this.downloadJSON());
        
        const btnCSV = document.getElementById('btnDownloadCSV');
        if (btnCSV) btnCSV.addEventListener('click', () => this.downloadCSV());
        
        // ✅ FIX B: Pulsante Export NINA
        const btnDownloadNINA = document.getElementById('btnDownloadNINA');
        if (btnDownloadNINA) btnDownloadNINA.addEventListener('click', () => this.downloadNINA());
        
        // ✅ Pulsante Export EKOS
        const btnDownloadEKOS = document.getElementById('btnDownloadEKOS');
        if (btnDownloadEKOS) btnDownloadEKOS.addEventListener('click', () => this.downloadEKOS());
        
        // ========== PHASE SELECTOR ==========
        this.initPhaseSelector();
        
        Utils.log('Eclipse Sequences inizializzato');
    }
    
    /**
     * Inizializza il selettore delle fasi da fotografare
     */
    initPhaseSelector() {
        // Aggiorna sommario quando cambiano i checkbox
        const checkboxes = document.querySelectorAll('.phase-checkbox');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', () => this.updatePhaseSummary());
        });
        
        // Pulsante Seleziona Tutte
        const btnAll = document.getElementById('btnSelectAllPhases');
        if (btnAll) {
            btnAll.addEventListener('click', () => this.setAllPhases(true));
        }
        
        // Pulsante Deseleziona Tutte
        const btnNone = document.getElementById('btnDeselectAllPhases');
        if (btnNone) {
            btnNone.addEventListener('click', () => this.setAllPhases(false));
        }
        
        // Pulsante Presets - toggle panel
        const btnPresets = document.getElementById('btnPresetsPhases');
        if (btnPresets) {
            btnPresets.addEventListener('click', () => {
                const panel = document.getElementById('phasePresetsPanel');
                if (panel) {
                    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
                }
            });
        }
        
        // Pulsanti preset singoli
        document.querySelectorAll('.phase-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.applyPhasePreset(btn.dataset.preset);
                // Chiudi panel presets
                const panel = document.getElementById('phasePresetsPanel');
                if (panel) panel.style.display = 'none';
            });
        });
        
        // Inizializza sommario
        this.updatePhaseSummary();
    }
    
    /**
     * Seleziona o deseleziona tutte le fasi
     */
    setAllPhases(checked) {
        document.querySelectorAll('.phase-checkbox').forEach(cb => {
            cb.checked = checked;
        });
        this.updatePhaseSummary();
    }
    
    /**
     * Applica un preset di selezione fasi
     */
    applyPhasePreset(presetName) {
        // Prima deseleziona tutto
        this.setAllPhases(false);
        
        const presets = {
            'all': ['c1', 'partial-mid', 'c2-baily', 'totality-chromosphere', 'totality-inner-corona', 'totality-mid-corona', 'totality-outer-corona', 'totality-prominences', 'c3-baily', 'c4'],
            'totality-only': ['c2-baily', 'totality-chromosphere', 'totality-inner-corona', 'totality-mid-corona', 'totality-outer-corona', 'totality-prominences', 'c3-baily'],
            'corona-only': ['totality-inner-corona', 'totality-mid-corona', 'totality-outer-corona'],
            'highlights': ['c2-baily', 'totality-chromosphere', 'totality-inner-corona', 'totality-mid-corona', 'totality-outer-corona', 'c3-baily'],
            'partial-only': ['c1', 'partial-mid', 'c4']
        };
        
        const phases = presets[presetName] || presets['all'];
        phases.forEach(phaseId => {
            const cb = document.querySelector(`.phase-checkbox[value="${phaseId}"]`);
            if (cb) cb.checked = true;
        });
        
        this.updatePhaseSummary();
        
        // Feedback visivo
        const names = {
            'all': '🌑 Eclissi Completa',
            'totality-only': '👑 Solo Totalità',
            'corona-only': '✨ Solo Corona',
            'highlights': '⭐ Momenti Chiave',
            'partial-only': '🌗 Solo Parziale'
        };
        if (typeof notificationManager !== 'undefined') {
            notificationManager.show(`Preset applicato: ${names[presetName] || presetName}`, 'info');
        }
    }
    
    /**
     * Aggiorna il sommario delle fasi selezionate
     */
    updatePhaseSummary() {
        const all = document.querySelectorAll('.phase-checkbox');
        const checked = document.querySelectorAll('.phase-checkbox:checked');
        const summary = document.getElementById('phaseSelectionSummary');
        
        if (summary) {
            const count = checked.length;
            const total = all.length;
            
            if (count === 0) {
                summary.innerHTML = '⚠️ <span style="color: #ef4444;">Nessuna fase selezionata — selezionane almeno una</span>';
            } else if (count === total) {
                summary.innerHTML = `✅ ${count}/${total} fasi selezionate — eclissi completa`;
            } else {
                // Elenca cosa è selezionato
                const selectedNames = [];
                checked.forEach(cb => {
                    const label = cb.closest('.phase-toggle');
                    if (label) {
                        const strong = label.querySelector('.phase-toggle-label strong');
                        if (strong) selectedNames.push(strong.textContent);
                    }
                });
                summary.innerHTML = `🎯 ${count}/${total} fasi selezionate`;
            }
        }
    }
    
    /**
     * Restituisce le fasi selezionate dall'utente
     * @returns {Set<string>} Set di ID fasi selezionate
     */
    getSelectedPhases() {
        const checked = document.querySelectorAll('.phase-checkbox:checked');
        const phases = new Set();
        checked.forEach(cb => phases.add(cb.value));
        return phases;
    }
    
    /**
     * Genera sequenze
     */
    generateSequences() {
        Utils.log('=== GENERAZIONE SEQUENZE ===');
        
        try {
            // 1. Ottieni EQUIPMENT
            const equipment = equipmentPanel.getCurrentEquipment();
            if (!equipment || !equipment.camera) {
                alert('⚠️ Configura prima Equipment (Camera + Telescopio)!');
                return;
            }
            
            Utils.log('Equipment:', equipment);
            
            // 2. Ottieni ECLISSI
            const eclipse = eclipseSelector.getSelectedEclipse();
            if (!eclipse) {
                alert('⚠️ Seleziona prima un\'eclissi!');
                return;
            }
            
            Utils.log('Eclissi selezionata:', eclipse);
            
            // 3. Rileva tipo camera da equipment
            const cameraType = this.detectCameraType(equipment.camera);
            Utils.log('Tipo camera rilevato:', cameraType);
            
            // 4. Mostra campi corretti
            this.showCameraFields(cameraType);
            
            // 5. Ottieni parametri
            const params = this.getParameters(cameraType);
            Utils.log('Parametri:', params);
            
            // 6. Calcola contatti eclissi
            const contacts = this.calculateContacts(eclipse);
            Utils.log('Contatti calcolati:', contacts);
            
            // Salva contacts per uso futuro
            this.currentContacts = contacts;
            
            // 7. Genera sequenze (passa equipment per ottimizzazione esposizioni)
            this.currentEquipment = equipment;  // Salva per stats display
            this.sequences = this.createSequences(contacts, params, equipment);
            Utils.log(`Sequenze generate: ${this.sequences.length}`);
            
            // 8. Crea fasi per timeline
            this.phases = this.createPhases(contacts);
            
            // 9. Mostra risultati
            this.displayResults();
            
            notificationManager.show(
                `✅ ${this.sequences.length} sequenze generate!`,
                'success'
            );
            
        } catch (error) {
            Utils.log('Errore generazione: ' + error.message, 'error');
            alert('❌ Errore: ' + error.message);
        }
    }
    
    /**
     * ✅ A) OTTIMIZZA SCATTI AUTOMATICAMENTE
     * Calcola numero massimo di scatti per ogni fase in base alla durata
     */
    optimizeSequences() {
        Utils.log('=== OTTIMIZZAZIONE SCATTI ===');
        
        if (!this.sequences || this.sequences.length === 0) {
            alert('⚠️ Genera prima le sequenze!');
            return;
        }
        
        if (!this.currentContacts) {
            alert('⚠️ Dati contatti non disponibili. Rigenera le sequenze.');
            return;
        }
        
        let optimized = 0;
        let totalShots = 0;
        
        this.sequences.forEach(seq => {
            // Salta sequenze senza esposizioni (warnings)
            if (!seq.exposures || seq.exposures.length === 0) {
                seq.shots = 0;
                return;
            }
            
            // Calcola tempo totale di una "serie" (tutte le esposizioni una volta)
            let seriesTime = 0;
            seq.exposures.forEach(exp => {
                const expTime = this.parseExposureTime(exp);
                seriesTime += expTime;
            });
            
            // Aggiungi overhead per download (0.5s per esposizione)
            const downloadOverhead = seq.exposures.length * 0.5;
            seriesTime += downloadOverhead;
            
            // Calcola quante serie posso fare nella durata disponibile
            // Uso 80% del tempo come margine di sicurezza
            const availableTime = seq.duration * 0.8;
            let optimalShots = Math.floor(availableTime / seriesTime);
            
            // Limiti ragionevoli
            optimalShots = Math.max(1, Math.min(100, optimalShots));
            
            // Aggiorna shots
            const oldShots = seq.shots || 3;
            seq.shots = optimalShots;
            
            Utils.log(`${seq.name}: ${oldShots} → ${optimalShots} scatti (durata: ${seq.duration}s, serie: ${seriesTime.toFixed(1)}s)`);
            
            optimized++;
            totalShots += optimalShots * seq.exposures.length;
        });
        
        // Aggiorna display
        this.displayResults();
        
        notificationManager.show(
            `🚀 Ottimizzazione completata!\n` +
            `${optimized} sequenze ottimizzate\n` +
            `Totale scatti previsti: ${totalShots}`,
            'success'
        );
        
        Utils.log(`✅ Ottimizzate ${optimized} sequenze, totale ${totalShots} scatti`);
    }
    
    /**
     * Parsa tempo esposizione (es. "1/1000" → 0.001, "2s" → 2)
     */
    parseExposureTime(exposure) {
        if (typeof exposure === 'number') {
            return exposure;
        }
        
        const str = String(exposure).trim();
        
        // Frazione (es. "1/1000")
        if (str.includes('/')) {
            const parts = str.split('/');
            const numerator = parseFloat(parts[0]);
            const denominator = parseFloat(parts[1]);
            return numerator / denominator;
        }
        
        // Secondi (es. "2s", "0.001s")
        if (str.endsWith('s')) {
            return parseFloat(str.replace('s', ''));
        }
        
        // Numero puro
        return parseFloat(str) || 1.0;
    }
    
    /**
     * Rileva tipo camera (DSLR o CMOS)
     */
    detectCameraType(camera) {
        // Se ha campo type, usa quello
        if (camera.type) {
            if (camera.type === 'dslr') return 'dslr';
            if (camera.type === 'cmos') return 'cmos';
        }
        
        // Altrimenti rileva da manufacturer
        const manufacturer = (camera.manufacturer || '').toLowerCase();
        
        // DSLR manufacturers
        if (manufacturer.includes('canon') || 
            manufacturer.includes('nikon') || 
            manufacturer.includes('sony') && !camera.cooling) {
            return 'dslr';
        }
        
        // CMOS manufacturers
        if (manufacturer.includes('zwo') || 
            manufacturer.includes('qhy') || 
            manufacturer.includes('touptek') ||
            camera.cooling === true) {
            return 'cmos';
        }
        
        // Default: se ha cooling = CMOS, altrimenti DSLR
        return camera.cooling ? 'cmos' : 'dslr';
    }
    
    /**
     * Mostra campi corretti
     */
    showCameraFields(type) {
        const paramISO = document.getElementById('paramISO');
        const paramGain = document.getElementById('paramGain');
        const paramOffset = document.getElementById('paramOffset');
        const paramTemp = document.getElementById('paramTemp');
        
        if (type === 'dslr') {
            if (paramISO) paramISO.style.display = 'block';
            if (paramGain) paramGain.style.display = 'none';
            if (paramOffset) paramOffset.style.display = 'none';
            if (paramTemp) paramTemp.style.display = 'none';
        } else {
            if (paramISO) paramISO.style.display = 'none';
            if (paramGain) paramGain.style.display = 'block';
            if (paramOffset) paramOffset.style.display = 'block';
            if (paramTemp) paramTemp.style.display = 'block';
        }
    }
    
    /**
     * Ottieni parametri
     */
    getParameters(cameraType) {
        const params = {
            cameraType: cameraType,
            shots: parseInt(document.getElementById('sequenceShots')?.value) || 3
        };
        
        if (cameraType === 'dslr') {
            // DSLR: ISO (lascia undefined se vuoto per permettere default)
            const isoValue = document.getElementById('sequenceISO')?.value;
            if (isoValue && isoValue !== '') {
                params.iso = parseInt(isoValue);
            }
        } else {
            // CMOS: Gain, Offset, Temp (lascia undefined se vuoto per Unity Gain automatico)
            const gainValue = document.getElementById('sequenceGain')?.value;
            if (gainValue && gainValue !== '') {
                params.gain = parseInt(gainValue);
            }
            
            const offsetValue = document.getElementById('sequenceOffset')?.value;
            if (offsetValue && offsetValue !== '') {
                params.offset = parseInt(offsetValue);
            }
            
            const tempValue = document.getElementById('sequenceTemp')?.value;
            if (tempValue && tempValue !== '') {
                params.temp = parseInt(tempValue);
            }
        }
        
        return params;
    }
    
    /**
     * Calcola contatti eclissi per location specifica
     */
    calculateContacts(eclipse) {
        Utils.log('Calcolo contatti per location GPS...');
        
        // Ottieni location utente
        const userLocation = locationManager.currentLocation;
        
        if (!userLocation || !userLocation.lat || !userLocation.lon) {
            alert('⚠️ Imposta prima la tua posizione GPS!\n\nVai alla sezione "Località Osservazione" e ottieni la posizione.');
            throw new Error('Location GPS non impostata');
        }
        
        Utils.log('Location utente:', userLocation);
        
        // Trova location più vicina nel path dell'eclissi
        const pathData = this.findNearestPathLocation(eclipse, userLocation);
        
        if (!pathData) {
            // Fuori dal path - solo parziale
            return this.calculatePartialEclipse(eclipse, userLocation);
        }
        
        Utils.log('Path location trovata:', pathData);
        
        // Parsa data eclissi - gestisci sia String che Date object
        let year, month, day;
        
        if (typeof eclipse.date === 'string') {
            // Se è stringa (es. "2027-08-02")
            const dateParts = eclipse.date.split('-');
            year = parseInt(dateParts[0]);
            month = parseInt(dateParts[1]) - 1; // Month is 0-indexed in JS
            day = parseInt(dateParts[2]);
        } else if (eclipse.date instanceof Date) {
            // Se è già Date object
            year = eclipse.date.getFullYear();
            month = eclipse.date.getMonth();
            day = eclipse.date.getDate();
        } else {
            throw new Error('Formato data eclissi non valido');
        }
        
        Utils.log(`Data eclissi parsata: ${year}-${month+1}-${day}`);
        
        // Calcola orari locali basati su location
        const baseTime = this.calculateLocalTime(year, month, day, userLocation, pathData);
        
        Utils.log('Base time calcolato:', baseTime.toLocaleString('it-IT'));
        
        // Durata totalità in secondi
        const totalityDuration = pathData.duration || eclipse.maxDuration || 120;
        
        // Calcola contatti con date REALI dell'eclissi
        const contacts = {
            c1: new Date(baseTime.getTime() - 90 * 60000), // -90min
            c2: new Date(baseTime.getTime() - (totalityDuration/2) * 1000),
            c3: new Date(baseTime.getTime() + (totalityDuration/2) * 1000),
            c4: new Date(baseTime.getTime() + 90 * 60000), // +90min
            totalityDuration: totalityDuration,
            location: userLocation,
            pathLocation: pathData,
            isTotalEclipse: true,
            magnitude: eclipse.magnitude
        };
        
        Utils.log('Contatti calcolati:', {
            c1: contacts.c1.toLocaleString('it-IT'),
            c2: contacts.c2.toLocaleString('it-IT'),
            c3: contacts.c3.toLocaleString('it-IT'),
            c4: contacts.c4.toLocaleString('it-IT'),
            totalityDuration: totalityDuration + 's'
        });
        
        return contacts;
    }
    
    /**
     * Trova location più vicina nel path
     */
    findNearestPathLocation(eclipse, userLocation) {
        if (!eclipse.path || eclipse.path.length === 0) {
            return null;
        }
        
        let nearest = null;
        let minDistance = Infinity;
        
        eclipse.path.forEach(pathLoc => {
            const distance = this.calculateDistance(
                userLocation.lat, userLocation.lon,
                pathLoc.lat, pathLoc.lon
            );
            
            if (distance < minDistance) {
                minDistance = distance;
                nearest = pathLoc;
            }
        });
        
        // Se distanza >500km, probabilmente fuori dal path
        if (minDistance > 500) {
            return null;
        }
        
        return nearest;
    }
    
    /**
     * Calcola distanza tra due coordinate (km)
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Raggio Terra in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }
    
    /**
     * Calcola ora locale corretta per la data dell'eclissi
     */
    calculateLocalTime(year, month, day, userLocation, pathLocation) {
        // Crea data a mezzogiorno UTC del giorno dell'eclissi
        const baseDate = new Date(Date.UTC(year, month, day, 12, 0, 0));
        
        Utils.log('Base date UTC:', baseDate.toISOString());
        
        // Offset longitudine (4 minuti per grado)
        const lonOffset = (userLocation.lon - pathLocation.lon) * 4 * 60000; // millisecondi
        
        Utils.log(`Lon offset: ${lonOffset}ms (${lonOffset/60000} min)`);
        
        // Applica offset
        const localTime = new Date(baseDate.getTime() + lonOffset);
        
        Utils.log('Local time:', localTime.toLocaleString('it-IT'));
        
        return localTime;
    }
    
    /**
     * Calcola eclissi parziale (fuori path totalità)
     */
    calculatePartialEclipse(eclipse, userLocation) {
        Utils.log('Location fuori dal path - calcolo eclissi parziale');
        
        // Calcola % copertura massima basata su distanza dal path
        const nearestPath = eclipse.path[0];
        const distance = this.calculateDistance(
            userLocation.lat, userLocation.lon,
            nearestPath.lat, nearestPath.lon
        );
        
        // Stima copertura (approssimazione)
        let coverage = 100;
        if (distance > 100) {
            coverage = Math.max(0, 100 - (distance - 100) / 10);
        }
        
        // Parsa data eclissi - gestisci sia String che Date object
        let year, month, day;
        
        if (typeof eclipse.date === 'string') {
            // Se è stringa (es. "2027-08-02")
            const dateParts = eclipse.date.split('-');
            year = parseInt(dateParts[0]);
            month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
            day = parseInt(dateParts[2]);
        } else if (eclipse.date instanceof Date) {
            // Se è già Date object
            year = eclipse.date.getFullYear();
            month = eclipse.date.getMonth();
            day = eclipse.date.getDate();
        } else {
            throw new Error('Formato data eclissi non valido');
        }
        
        // Mezzogiorno UTC del giorno dell'eclissi
        const baseTime = new Date(Date.UTC(year, month, day, 12, 0, 0));
        
        // Offset longitudine
        const lonOffset = userLocation.lon * 4 * 60000;
        const localNoon = new Date(baseTime.getTime() + lonOffset);
        
        alert(`📍 La tua posizione NON è nel path della totalità!\n\n` +
              `Vedrai un'eclissi PARZIALE con:\n` +
              `• Copertura massima: ~${coverage.toFixed(1)}%\n` +
              `• Massimo oscuramento: ${localNoon.toLocaleString('it-IT')}\n\n` +
              `⚠️ FILTRO SOLARE OBBLIGATORIO per TUTTA la durata!`);
        
        return {
            c1: new Date(localNoon.getTime() - 60 * 60000), // -60min
            c2: null, // Nessun secondo contatto
            c3: null, // Nessun terzo contatto
            c4: new Date(localNoon.getTime() + 60 * 60000), // +60min
            maxCoverage: coverage,
            maxTime: localNoon,
            totalityDuration: 0,
            location: userLocation,
            isTotalEclipse: false,
            isPartialOnly: true
        };
    }
    
    /**
     * Ottieni esposizioni ottimizzate per tipo camera e fase
     * 
     * v2.0: Usa ExposureOptimizer con calcolo fotometrico basato su equipment.
     * Le esposizioni vengono scalate in base a f/ratio e sensibilità (ISO/Gain).
     */
    getExposures(cameraType, phase, equipment, params) {
        // Usa l'optimizer per calcolare esposizioni scalate
        var exposuresSeconds = exposureOptimizer.getOptimizedExposures(phase, equipment, params);
        
        // Converti in base al tipo camera
        if (cameraType === 'dslr') {
            // DSLR: usa frazione (1/1000, 1/500, etc.)
            return exposuresSeconds.map(function(sec) {
                if (sec >= 1) {
                    return sec + 's';
                } else {
                    var denominator = Math.round(1 / sec);
                    return '1/' + denominator;
                }
            });
        } else {
            // CMOS: usa secondi (0.001s, 1s, etc.)
            return exposuresSeconds.map(function(sec) {
                return sec + 's';
            });
        }
    }
    
    /**
     * Crea sequenze
     */
    createSequences(contacts, params, equipment) {
        const sequences = [];
        
        // Ottieni fasi selezionate dall'utente
        const selectedPhases = this.getSelectedPhases();
        
        // Se nessuna fase selezionata, avvisa
        if (selectedPhases.size === 0) {
            alert('⚠️ Seleziona almeno una fase da fotografare!');
            return [];
        }
        
        // Controlla se è eclissi parziale
        if (contacts.isPartialOnly) {
            // Solo parziale - NO totalità
            if (selectedPhases.has('c1')) {
                sequences.push({
                    id: 'c1',
                    name: 'Inizio Parziale',
                    phase: 'partial',
                    startTime: contacts.c1,
                    duration: 120,
                    filter: 'ND5 Solar OBBLIGATORIO',
                    exposures: this.getExposures(params.cameraType, 'partial', equipment, params),
                    ...params
                });
            }
            
            // Sempre includi il massimo per parziale (se partial-mid selezionato)
            if (selectedPhases.has('partial-mid')) {
                sequences.push({
                    id: 'max',
                    name: `⭕ Massimo (${contacts.maxCoverage.toFixed(1)}%)`,
                    phase: 'partial',
                    startTime: contacts.maxTime,
                    duration: 300,
                    filter: 'ND5 Solar OBBLIGATORIO',
                    exposures: this.getExposures(params.cameraType, 'partial', equipment, params),
                    ...params,
                    alert: true
                });
            }
            
            if (selectedPhases.has('c4')) {
                sequences.push({
                    id: 'c4',
                    name: 'Fine Parziale',
                    phase: 'partial',
                    startTime: contacts.c4,
                    duration: 120,
                    filter: 'ND5 Solar OBBLIGATORIO',
                    exposures: this.getExposures(params.cameraType, 'partial', equipment, params),
                    ...params
                });
            }
            
            return sequences;
        }
        
        // ============================================================
        // Eclissi TOTALE - sequenze con selezione fasi
        // ============================================================
        
        // 1. C1 - Primo Contatto
        if (selectedPhases.has('c1')) {
            sequences.push({
                id: 'c1',
                name: 'C1 - Primo Contatto',
                phase: 'partial',
                startTime: contacts.c1,
                duration: 120,
                filter: 'ND5 Solar',
                exposures: this.getExposures(params.cameraType, 'partial', equipment, params),
                ...params
            });
        }
        
        // 2. Parziale 50%
        if (selectedPhases.has('partial-mid')) {
            const midPartial = new Date((contacts.c1.getTime() + contacts.c2.getTime()) / 2);
            sequences.push({
                id: 'partial-mid',
                name: 'Parziale 50%',
                phase: 'partial',
                startTime: midPartial,
                duration: 60,
                filter: 'ND5 Solar',
                exposures: this.getExposures(params.cameraType, 'partial', equipment, params),
                ...params
            });
        }
        
        // Determina se servono fasi di totalità (qualsiasi fase tra baily e prominenze)
        const totalityPhaseIds = ['c2-baily', 'totality-chromosphere', 'totality-inner-corona', 'totality-mid-corona', 'totality-outer-corona', 'totality-prominences', 'c3-baily'];
        const hasAnyTotalityPhase = totalityPhaseIds.some(id => selectedPhases.has(id));
        
        if (hasAnyTotalityPhase) {
            // 3. Avviso Rimozione Filtro (sempre se c'è totalità)
            const filterWarning = new Date(contacts.c2.getTime() - 30000);
            sequences.push({
                id: 'filter-warning',
                name: '⚠️ RIMUOVI FILTRO',
                phase: 'warning',
                startTime: filterWarning,
                duration: 30,
                filter: 'RIMUOVERE ORA!',
                exposures: [],
                shots: 0,
                alert: true
            });
            
            // 4. C2 - Perle di Baily
            if (selectedPhases.has('c2-baily')) {
                const baily1 = new Date(contacts.c2.getTime() - 5000);
                sequences.push({
                    id: 'c2-baily',
                    name: 'C2 - Perle di Baily',
                    phase: 'baily',
                    startTime: baily1,
                    duration: 10,
                    filter: 'NESSUNO',
                    exposures: this.getExposures(params.cameraType, 'baily', equipment, params),
                    ...params
                });
            }
            
            // ========================================
            // 5. TOTALITÀ - SEQUENZE SELETTIVE
            // ========================================
            
            // Determina quali sotto-fasi della totalità sono selezionate
            const totalitySubPhases = ['totality-chromosphere', 'totality-inner-corona', 'totality-mid-corona', 'totality-outer-corona', 'totality-prominences'];
            const selectedTotalitySubs = totalitySubPhases.filter(id => selectedPhases.has(id));
            
            if (selectedTotalitySubs.length > 0) {
                const totalityStart = new Date(contacts.c2.getTime() + 5000);
                const totalityDuration = contacts.totalityDuration - 10; // -10s margine
                
                // Calcola durata per ogni segmento selezionato
                // Cromosfera e protuberanze hanno cap a 20s, le corone si dividono il resto
                const hasChromosphere = selectedPhases.has('totality-chromosphere');
                const hasProminences = selectedPhases.has('totality-prominences');
                const coronaPhases = selectedTotalitySubs.filter(id => 
                    id !== 'totality-chromosphere' && id !== 'totality-prominences'
                );
                
                // Tempo riservato per cromosfera e protuberanze (cap 20s ciascuna)
                const chromoDuration = hasChromosphere ? Math.min(20, Math.floor(totalityDuration / selectedTotalitySubs.length)) : 0;
                const prominDuration = hasProminences ? Math.min(20, Math.floor(totalityDuration / selectedTotalitySubs.length)) : 0;
                
                // Tempo rimanente per le fasi corona
                const remainingTime = totalityDuration - chromoDuration - prominDuration;
                const coronaSegmentDuration = coronaPhases.length > 0 ? Math.floor(remainingTime / coronaPhases.length) : 0;
                
                // Costruisci sequenze con timing progressivo
                let currentTime = totalityStart.getTime();
                
                // 5a. CROMOSFERA
                if (hasChromosphere) {
                    sequences.push({
                        id: 'totality-chromosphere',
                        name: '🔴 Cromosfera',
                        phase: 'totality-chromosphere',
                        startTime: new Date(currentTime),
                        duration: chromoDuration,
                        filter: 'NESSUNO',
                        description: 'Cattura lo strato rosso della cromosfera con esposizioni brevissime',
                        exposures: this.getExposures(params.cameraType, 'chromosphere', equipment, params),
                        ...params,
                        priority: 'high'
                    });
                    currentTime += chromoDuration * 1000;
                }
                
                // 5b. INNER CORONA
                if (selectedPhases.has('totality-inner-corona')) {
                    sequences.push({
                        id: 'totality-inner-corona',
                        name: '💫 Corona Interna',
                        phase: 'totality-inner-corona',
                        startTime: new Date(currentTime),
                        duration: coronaSegmentDuration,
                        filter: 'NESSUNO',
                        description: 'Cattura la corona interna brillante vicino al Sole',
                        exposures: this.getExposures(params.cameraType, 'inner-corona', equipment, params),
                        ...params,
                        priority: 'high'
                    });
                    currentTime += coronaSegmentDuration * 1000;
                }
                
                // 5c. MID CORONA
                if (selectedPhases.has('totality-mid-corona')) {
                    sequences.push({
                        id: 'totality-mid-corona',
                        name: '✨ Corona Media',
                        phase: 'totality-mid-corona',
                        startTime: new Date(currentTime),
                        duration: coronaSegmentDuration,
                        filter: 'NESSUNO',
                        description: 'Cattura le strutture della corona media',
                        exposures: this.getExposures(params.cameraType, 'mid-corona', equipment, params),
                        ...params,
                        priority: 'medium'
                    });
                    currentTime += coronaSegmentDuration * 1000;
                }
                
                // 5d. OUTER CORONA
                if (selectedPhases.has('totality-outer-corona')) {
                    sequences.push({
                        id: 'totality-outer-corona',
                        name: '🌟 Corona Esterna',
                        phase: 'totality-outer-corona',
                        startTime: new Date(currentTime),
                        duration: coronaSegmentDuration,
                        filter: 'NESSUNO',
                        description: 'Cattura le estensioni deboli della corona esterna',
                        exposures: this.getExposures(params.cameraType, 'outer-corona', equipment, params),
                        ...params,
                        priority: 'medium'
                    });
                    currentTime += coronaSegmentDuration * 1000;
                }
                
                // 5e. PROTUBERANZE
                if (hasProminences) {
                    sequences.push({
                        id: 'totality-prominences',
                        name: '🔥 Protuberanze',
                        phase: 'totality-prominences',
                        startTime: new Date(currentTime),
                        duration: prominDuration,
                        filter: 'NESSUNO',
                        description: 'Cattura le protuberanze rosse ai bordi del Sole',
                        exposures: this.getExposures(params.cameraType, 'prominences', equipment, params),
                        ...params,
                        priority: 'high'
                    });
                    currentTime += prominDuration * 1000;
                }
            }
            
            // 6. C3 - Perle di Baily
            if (selectedPhases.has('c3-baily')) {
                sequences.push({
                    id: 'c3-baily',
                    name: 'C3 - Perle di Baily',
                    phase: 'baily',
                    startTime: contacts.c3,
                    duration: 10,
                    filter: 'NESSUNO',
                    exposures: this.getExposures(params.cameraType, 'baily', equipment, params),
                    ...params
                });
            }
            
            // 7. Avviso Rimetti Filtro (se c'è C4 dopo le fasi di totalità)
            if (selectedPhases.has('c4')) {
                const filterReplace = new Date(contacts.c3.getTime() + 5000);
                sequences.push({
                    id: 'filter-replace',
                    name: '⚠️ RIMETTI FILTRO',
                    phase: 'warning',
                    startTime: filterReplace,
                    duration: 10,
                    filter: 'APPLICARE ORA!',
                    exposures: [],
                    shots: 0,
                    alert: true
                });
            }
        }
        
        // 8. C4 - Quarto Contatto
        if (selectedPhases.has('c4')) {
            const c4End = new Date(contacts.c4.getTime() - 60000);
            sequences.push({
                id: 'c4',
                name: 'C4 - Fine Eclissi',
                phase: 'partial',
                startTime: c4End,
                duration: 120,
                filter: 'ND5 Solar',
                exposures: this.getExposures(params.cameraType, 'partial', equipment, params),
                ...params
            });
        }
        
        return sequences;
    }
    
    /**
     * Crea fasi per timeline
     */
    createPhases(contacts) {
        // Se eclissi parziale, crea fasi diverse
        if (contacts.isPartialOnly) {
            return [
                {
                    id: 'c1',
                    name: 'Inizio Parziale',
                    time: contacts.c1,
                    color: '#5ac8fa',
                    filter: 'ND5 Solar OBBLIGATORIO',
                    icon: '🌗'
                },
                {
                    id: 'max',
                    name: `Massimo ${contacts.maxCoverage.toFixed(1)}%`,
                    time: contacts.maxTime,
                    color: '#ff9500',
                    filter: 'ND5 Solar OBBLIGATORIO',
                    icon: '⭕',
                    alert: true
                },
                {
                    id: 'c4',
                    name: 'Fine Parziale',
                    time: contacts.c4,
                    color: '#5ac8fa',
                    filter: 'ND5 Solar OBBLIGATORIO',
                    icon: '🌗'
                }
            ];
        }
        
        // Eclissi totale - fasi complete
        return [
            {
                id: 'c1',
                name: 'C1 - Primo Contatto',
                time: contacts.c1,
                color: '#5ac8fa',
                filter: 'ND5 Solar',
                icon: '🌗'
            },
            {
                id: 'c2-warning',
                name: 'RIMUOVI FILTRO',
                time: new Date(contacts.c2.getTime() - 30000),
                color: '#ff4444',
                filter: 'RIMUOVERE!',
                icon: '⚠️',
                alert: true
            },
            {
                id: 'c2',
                name: 'C2 - Secondo Contatto',
                time: contacts.c2,
                color: '#ffcc00',
                filter: 'NESSUNO',
                icon: '💎'
            },
            {
                id: 'totality',
                name: `TOTALITÀ (${contacts.totalityDuration}s)`,
                time: new Date((contacts.c2.getTime() + contacts.c3.getTime()) / 2),
                color: '#ff2d55',
                filter: 'NESSUNO',
                icon: '🌑'
            },
            {
                id: 'c3',
                name: 'C3 - Terzo Contatto',
                time: contacts.c3,
                color: '#ffcc00',
                filter: 'NESSUNO',
                icon: '💎'
            },
            {
                id: 'c3-warning',
                name: 'RIMETTI FILTRO',
                time: new Date(contacts.c3.getTime() + 5000),
                color: '#ff4444',
                filter: 'APPLICARE!',
                icon: '⚠️',
                alert: true
            },
            {
                id: 'c4',
                name: 'C4 - Quarto Contatto',
                time: contacts.c4,
                color: '#5ac8fa',
                filter: 'ND5 Solar',
                icon: '🌗'
            }
        ];
    }
    
    /**
     * Mostra risultati
     */
    displayResults() {
        const resultsDiv = document.getElementById('sequenceResults');
        if (!resultsDiv) return;
        
        resultsDiv.style.display = 'block';
        
        // Stats
        this.displayStats();
        
        // Pannello fasi
        this.displayPhases();
        
        // Pannello standalone
        this.displayStandalone();
        
        // Lista sequenze
        this.displaySequencesList();
    }
    
    /**
     * Mostra stats
     */
    displayStats() {
        const statsDiv = document.getElementById('sequenceStats');
        if (!statsDiv) return;
        
        const totalShots = this.sequences.reduce((sum, seq) => {
            return sum + (seq.exposures.length * (seq.shots || 0));
        }, 0);
        
        // Controlla se parziale o totale
        const contacts = this.sequences[0]; // Usa prima sequenza per determinare
        const isPartial = this.sequences.some(s => s.id === 'max');
        
        let html = '<strong>✅ Sequenze Generate!</strong><br>';
        html += `📋 ${this.sequences.length} sequenze<br>`;
        html += `📸 ~${totalShots} scatti totali<br>`;
        
        if (isPartial) {
            // Eclissi parziale
            const maxSeq = this.sequences.find(s => s.id === 'max');
            if (maxSeq) {
                const coverage = maxSeq.name.match(/\d+\.\d+/);
                html += `⭕ <strong>Eclissi PARZIALE</strong><br>`;
                html += `📊 Copertura massima: ${coverage ? coverage[0] : '?'}%<br>`;
                html += `⚠️ <strong style="color: #ff4444;">FILTRO SOLARE OBBLIGATORIO PER TUTTA LA DURATA!</strong>`;
            }
        } else {
            // Eclissi totale
            const totalityDur = this.getTotalityDuration();
            html += `🌑 <strong>Eclissi TOTALE</strong><br>`;
            html += `⏱️ Durata totalità: ${totalityDur}s (${Math.floor(totalityDur/60)}m ${totalityDur%60}s)`;
        }
        
        // Mostra info selezione fasi
        const selectedPhases = this.getSelectedPhases();
        const allCheckboxes = document.querySelectorAll('.phase-checkbox');
        if (selectedPhases.size < allCheckboxes.length && selectedPhases.size > 0) {
            html += `<hr style="border: none; border-top: 1px solid rgba(255,255,255,0.2); margin: 8px 0;">`;
            html += `<strong>🎯 Fasi Selezionate: ${selectedPhases.size}/${allCheckboxes.length}</strong><br>`;
            
            // Mostra le fasi attive
            const phaseNames = [];
            document.querySelectorAll('.phase-checkbox:checked').forEach(cb => {
                const label = cb.closest('.phase-toggle');
                if (label) {
                    const strong = label.querySelector('.phase-toggle-label strong');
                    if (strong) phaseNames.push(strong.textContent);
                }
            });
            html += `<span style="color: #a8adb8; font-size: 0.85em;">${phaseNames.join(' · ')}</span>`;
        }
        
        // Mostra info ottimizzazione esposizioni
        if (this.currentEquipment && this.currentEquipment.telescope && this.currentEquipment.camera) {
            const eq = this.currentEquipment;
            const scaleFactor = exposureOptimizer.calculateScaleFactor(eq);
            
            html += `<hr style="border: none; border-top: 1px solid rgba(255,255,255,0.2); margin: 8px 0;">`;
            html += `<strong>📐 Esposizioni Ottimizzate</strong><br>`;
            html += `🔭 f/${parseFloat(eq.telescope.fRatio).toFixed(1)} `;
            html += `(${eq.telescope.focalLength}mm)<br>`;
            html += `📷 ${eq.camera.name}<br>`;
            html += `🎯 ISO equiv: ${Math.round(scaleFactor.effectiveISO)}<br>`;
            
            // Descrizione scala
            if (scaleFactor.total < 0.8) {
                html += `⚡ <span style="color: #4cd964;">Setup veloce → esposizioni ${Math.round(1/scaleFactor.total)}× più corte del riferimento</span>`;
            } else if (scaleFactor.total > 1.2) {
                html += `🐌 <span style="color: #ffcc00;">Setup lento → esposizioni ${scaleFactor.total.toFixed(1)}× più lunghe del riferimento</span>`;
            } else {
                html += `✅ <span style="color: #4cd964;">Setup bilanciato → esposizioni vicine al riferimento</span>`;
            }
        }
        
        statsDiv.innerHTML = html;
    }
    
    /**
     * Mostra pannello fasi
     */
    displayPhases() {
        const phasesDiv = document.getElementById('phasesDisplay');
        if (!phasesDiv) return;
        
        // Verifica che abbiamo contacts salvati
        if (!this.currentContacts) {
            phasesDiv.innerHTML = '<p style="color: #999;">Genera prima le sequenze per vedere le fasi</p>';
            return;
        }
        
        let html = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin: 1rem 0;">';
        
        this.phases.forEach((phase, index) => {
            // ✅ FIX A: Calcola durata REALE dai contacts invece che dalle sequenze
            let phaseDuration = 60000; // default 1 minuto
            let endTime = new Date(phase.time.getTime() + phaseDuration);
            
            // Calcola durata reale in base al tipo di fase
            if (phase.id === 'c1') {
                // Da C1 a prossima fase
                if (this.phases[index + 1]) {
                    phaseDuration = this.phases[index + 1].time - phase.time;
                    endTime = new Date(this.phases[index + 1].time);
                }
            } else if (phase.id === 'c2-warning') {
                // 30 secondi prima di C2
                phaseDuration = 30000;
                endTime = new Date(this.currentContacts.c2);
            } else if (phase.id === 'c2') {
                // Da C2 a C3 (totalità)
                phaseDuration = this.currentContacts.c3 - this.currentContacts.c2;
                endTime = new Date(this.currentContacts.c3);
            } else if (phase.id === 'totality') {
                // Tutta la totalità
                phaseDuration = (this.currentContacts.c3 - this.currentContacts.c2);
                endTime = new Date(this.currentContacts.c3);
            } else if (phase.id === 'c3') {
                // Da C3 a warning filtro
                phaseDuration = 5000; // 5 secondi fino a warning
                endTime = new Date(this.currentContacts.c3.getTime() + 5000);
            } else if (phase.id === 'c3-warning') {
                // Warning dopo C3
                phaseDuration = 25000; // 25 secondi
                endTime = new Date(this.currentContacts.c3.getTime() + 30000);
            } else if (phase.id === 'c4') {
                // Da C4 a fine
                phaseDuration = 600000; // 10 minuti
                endTime = new Date(this.currentContacts.c4.getTime() + 600000);
            } else if (phase.id === 'max') {
                // Eclissi parziale - massimo
                if (this.phases[index + 1]) {
                    phaseDuration = this.phases[index + 1].time - phase.time;
                    endTime = new Date(this.phases[index + 1].time);
                } else {
                    phaseDuration = 60000;
                    endTime = new Date(phase.time.getTime() + 60000);
                }
            } else {
                // Altre fasi - usa distanza alla prossima fase
                if (this.phases[index + 1]) {
                    phaseDuration = this.phases[index + 1].time - phase.time;
                    endTime = new Date(this.phases[index + 1].time);
                }
            }
            
            // Calcola durata in formato leggibile
            const durationMin = Math.floor(phaseDuration / 60000);
            const durationSec = Math.floor((phaseDuration % 60000) / 1000);
            const durationText = durationMin > 0 
                ? `${durationMin}m ${durationSec}s` 
                : `${durationSec}s`;
            
            html += `
                <div id="phase-${phase.id}" class="phase-box" style="background: ${phase.color}20; border-left: 4px solid ${phase.color}; padding: 1.5rem; border-radius: 8px; position: relative;">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">${phase.icon}</div>
                    <div style="font-weight: bold; font-size: 1.1rem; margin-bottom: 0.5rem;">${phase.name}</div>
                    <div style="font-size: 0.85rem; color: #666; margin-bottom: 1rem;">
                        ⏰ <strong>Inizio:</strong> ${phase.time.toLocaleTimeString('it-IT')}<br>
                        ⏰ <strong>Fine:</strong> ${endTime.toLocaleTimeString('it-IT')}<br>
                        ⏱️ <strong>Durata:</strong> ${durationText}<br>
                        🔵 ${phase.filter}
                    </div>
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid ${phase.color}40;">
                        <div style="font-size: 0.85rem; color: #666; margin-bottom: 0.25rem;">Countdown:</div>
                        <div class="phase-countdown" style="font-size: 1.5rem; font-weight: bold; font-family: monospace; color: ${phase.color};">
                            --:--:--
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        
        phasesDiv.innerHTML = html;
    }
    
    /**
     * Mostra pannello standalone
     */
    displayStandalone() {
        const standaloneDiv = document.getElementById('standaloneDisplay');
        if (!standaloneDiv) return;
        
        standaloneDiv.innerHTML = `
            <div style="background: var(--primary-color); color: white; padding: 2rem; border-radius: 8px; text-align: center;">
                <div style="font-size: 2rem; margin-bottom: 1rem;">📱</div>
                <div style="font-size: 1.5rem; font-weight: bold; margin-bottom: 1rem;">
                    Modalità Standalone Attiva
                </div>
                <div style="font-size: 1.1rem;">
                    Il countdown fasi ti guiderà con avvisi visivi e sonori<br>
                    Segui i suggerimenti per scattare manualmente
                </div>
            </div>
            <div id="standaloneSuggestion" style="margin-top: 1.5rem; padding: 1.5rem; background: var(--bg-primary); border: 2px solid var(--primary-color); border-radius: 8px; display: none;">
                <!-- Suggerimento dinamico -->
            </div>
        `;
    }
    
    /**
     * Mostra lista sequenze
     */
    displaySequencesList() {
        const listDiv = document.getElementById('sequencesList');
        if (!listDiv) return;
        
        let html = '<h3>📋 Dettaglio Sequenze</h3><div style="display: grid; gap: 1rem; margin-top: 1rem;">';
        
        this.sequences.forEach((seq, index) => {
            const phaseColor = this.getPhaseColor(seq.phase);
            
            // Formatta durata in formato leggibile
            const durationMin = Math.floor(seq.duration / 60);
            const durationSec = seq.duration % 60;
            const durationFormatted = durationMin > 0 
                ? `${durationMin}m ${durationSec}s` 
                : `${durationSec}s`;
            
            // Verifica che startTime sia un Date valido
            let startTimeStr = 'Data non disponibile';
            if (seq.startTime instanceof Date && !isNaN(seq.startTime.getTime())) {
                startTimeStr = seq.startTime.toLocaleString('it-IT', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            } else {
                Utils.log(`Sequenza ${seq.id} ha startTime invalido:`, seq.startTime, 'error');
            }
            
            html += `
                <details style="background: ${phaseColor}20; border-left: 4px solid ${phaseColor}; padding: 1rem; border-radius: 4px;">
                    <summary style="cursor: pointer; font-weight: bold; font-size: 1.1rem;">
                        #${index + 1} ${seq.name}
                    </summary>
                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid ${phaseColor}40;">
                        <div style="display: grid; gap: 0.5rem; font-size: 0.9rem;">
                            <div>⏰ <strong>Inizio:</strong> ${startTimeStr}</div>
                            <div>⏱️ <strong>Durata:</strong> ${durationFormatted}</div>
                            <div>🔵 <strong>Filtro:</strong> ${seq.filter}</div>
                            ${seq.exposures.length > 0 ? `
                                <div>📸 <strong>Esposizioni:</strong> ${seq.exposures.join(', ')}</div>
                                <div>📷 <strong>Scatti:</strong> ${seq.shots} per esposizione = ${seq.shots * seq.exposures.length} totali</div>
                            ` : ''}
                            ${seq.cameraType === 'dslr' && seq.iso ? `
                                <div>⚙️ <strong>ISO:</strong> ${seq.iso}</div>
                            ` : ''}
                            ${seq.cameraType === 'cmos' && seq.gain !== undefined ? `
                                <div>⚙️ <strong>Gain:</strong> ${seq.gain}</div>
                                <div>⚙️ <strong>Offset:</strong> ${seq.offset}</div>
                                <div>⚙️ <strong>Temperatura:</strong> ${seq.temp}°C</div>
                            ` : ''}
                        </div>
                    </div>
                </details>
            `;
        });
        
        html += '</div>';
        listDiv.innerHTML = html;
    }
    
    /**
     * Avvia countdown fasi
     */
    startPhasesCountdown() {
        Utils.log('Avvio countdown fasi...');
        
        if (this.phaseTimer) {
            clearInterval(this.phaseTimer);
        }
        
        // Update ogni secondo
        this.phaseTimer = setInterval(() => {
            this.updatePhasesCountdown();
        }, 1000);
        
        this.updatePhasesCountdown();
        
        // Mostra/nascondi pulsanti
        const btnStart = document.getElementById('btnStartPhases');
        const btnStop = document.getElementById('btnStopPhases');
        if (btnStart) btnStart.style.display = 'none';
        if (btnStop) btnStop.style.display = 'inline-block';
        
        notificationManager.show('⏱️ Countdown fasi avviato!', 'success');
    }
    
    /**
     * Ferma countdown fasi
     */
    stopPhasesCountdown() {
        if (this.phaseTimer) {
            clearInterval(this.phaseTimer);
            this.phaseTimer = null;
        }
        
        const btnStart = document.getElementById('btnStartPhases');
        const btnStop = document.getElementById('btnStopPhases');
        if (btnStart) btnStart.style.display = 'inline-block';
        if (btnStop) btnStop.style.display = 'none';
    }
    
    /**
     * Update countdown fasi
     */
    updatePhasesCountdown() {
        const now = new Date();
        let activePhase = null;
        
        this.phases.forEach(phase => {
            const phaseBox = document.getElementById(`phase-${phase.id}`);
            if (!phaseBox) return;
            
            const countdownEl = phaseBox.querySelector('.phase-countdown');
            if (!countdownEl) return;
            
            // Verifica che phase.time sia un Date valido
            if (!(phase.time instanceof Date) || isNaN(phase.time.getTime())) {
                countdownEl.textContent = 'ERROR';
                Utils.log(`Fase ${phase.id} ha time invalido:`, phase.time, 'error');
                return;
            }
            
            // Calcola differenza in millisecondi
            const diffMs = phase.time.getTime() - now.getTime();
            const totalSeconds = Math.floor(diffMs / 1000);
            
            // Formato tempo
            if (totalSeconds < 0) {
                countdownEl.textContent = 'PASSATO';
                countdownEl.style.color = '#888';
                phaseBox.style.opacity = '0.5';
            } else {
                // Calcola ore, minuti, secondi
                const hours = Math.floor(totalSeconds / 3600);
                const mins = Math.floor((totalSeconds % 3600) / 60);
                const secs = totalSeconds % 60;
                
                // Formato HH:MM:SS
                countdownEl.textContent = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
                
                // Evidenzia prossima fase
                if (!activePhase || (diffMs > 0 && diffMs < (activePhase.time.getTime() - now.getTime()))) {
                    activePhase = phase;
                }
                
                // Colore warning
                if (totalSeconds <= 10) {
                    countdownEl.style.animation = 'blink 0.5s infinite';
                    countdownEl.style.color = '#ff4444';
                } else if (totalSeconds <= 60) {
                    countdownEl.style.animation = 'pulse 1s infinite';
                    countdownEl.style.color = '#ff9500';
                } else {
                    countdownEl.style.animation = 'none';
                    countdownEl.style.color = phase.color;
                }
            }
        });
        
        // Evidenzia fase attiva
        document.querySelectorAll('.phase-box').forEach(box => {
            box.style.transform = '';
            box.style.boxShadow = '';
        });
        
        if (activePhase) {
            const activeBox = document.getElementById(`phase-${activePhase.id}`);
            if (activeBox) {
                activeBox.style.transform = 'scale(1.05)';
                activeBox.style.boxShadow = '0 8px 24px rgba(76, 217, 100, 0.3)';
            }
            
            // Update standalone suggestion
            this.updateStandaloneSuggestion(activePhase);
            
            // AVVISI ACUSTICI
            const diffMs = activePhase.time.getTime() - now.getTime();
            const secondsToPhase = Math.floor(diffMs / 1000);
            
            // Play audio alert a intervalli specifici
            if (audioManager) {
                // Alert a 60, 30, 10, 5, 0 secondi
                if (secondsToPhase === 60) {
                    audioManager.playAlert('countdown_30', `60 secondi a ${activePhase.name}`);
                    Utils.log(`🔊 Alert 60s: ${activePhase.name}`);
                } else if (secondsToPhase === 30) {
                    audioManager.playAlert('countdown_30', `30 secondi a ${activePhase.name}`);
                    Utils.log(`🔊 Alert 30s: ${activePhase.name}`);
                } else if (secondsToPhase === 10) {
                    audioManager.playAlert('countdown_10', `10 secondi a ${activePhase.name}`);
                    Utils.log(`🔊 Alert 10s: ${activePhase.name}`);
                } else if (secondsToPhase === 5) {
                    audioManager.playAlert('countdown_5', `5 secondi a ${activePhase.name}`);
                    Utils.log(`🔊 Alert 5s: ${activePhase.name}`);
                } else if (secondsToPhase === 0) {
                    audioManager.playAlert('sequence_start', `INIZIO: ${activePhase.name}`);
                    Utils.log(`🔊 Alert START: ${activePhase.name}`);
                }
                
                // Alert speciali per fasi critiche
                if (activePhase.alert) {
                    if (secondsToPhase === 15) {
                        audioManager.playAlert('filter_warning', `15 secondi: ${activePhase.name}`);
                        Utils.log(`🔊 Alert FILTRO 15s: ${activePhase.name}`);
                    } else if (secondsToPhase === 3) {
                        audioManager.playAlert('filter_critical', `3 secondi: ${activePhase.name}`);
                        Utils.log(`🔊 Alert FILTRO 3s: ${activePhase.name}`);
                    }
                }
            }
        }
    }
    
    /**
     * Update suggerimento standalone
     */
    updateStandaloneSuggestion(phase) {
        const suggestionDiv = document.getElementById('standaloneSuggestion');
        if (!suggestionDiv) return;
        
        const diff = phase.time - new Date();
        const seconds = Math.floor(diff / 1000);
        
        if (seconds <= 60 && seconds > 0) {
            suggestionDiv.style.display = 'block';
            
            let suggestion = '';
            let bgColor = 'var(--primary-color)';
            
            if (seconds <= 10) {
                suggestion = `<strong style="font-size: 1.5rem;">⏱️ ${seconds}s - ${phase.name}</strong><br>`;
                bgColor = '#ff4444';
            } else if (seconds <= 30) {
                suggestion = `<strong>30s - ${phase.name}</strong><br>`;
                bgColor = '#ff9500';
            } else {
                suggestion = `<strong>1 minuto a ${phase.name}</strong><br>`;
                bgColor = '#ffcc00';
            }
            
            suggestion += `🔵 Filtro: ${phase.filter}`;
            
            suggestionDiv.innerHTML = `
                <div style="background: ${bgColor}; color: white; padding: 1.5rem; border-radius: 8px; text-align: center;">
                    ${suggestion}
                </div>
            `;
        } else if (seconds <= 0 && seconds > -10) {
            suggestionDiv.style.display = 'block';
            suggestionDiv.innerHTML = `
                <div style="background: #4cd964; color: white; padding: 1.5rem; border-radius: 8px; text-align: center; animation: pulse 0.5s infinite;">
                    <div style="font-size: 2rem; font-weight: bold;">🎬 ${phase.name} - ORA!</div>
                    <div style="font-size: 1.2rem; margin-top: 0.5rem;">🔵 ${phase.filter}</div>
                </div>
            `;
        } else {
            suggestionDiv.style.display = 'none';
        }
    }
    
    /**
     * Helper methods
     */
    getTotalityDuration() {
        // CORRETTO: Somma tutte le sequenze di totalità (ora sono 5 separate)
        const totalitySequences = this.sequences.filter(s => 
            s.id && s.id.startsWith('totality-')
        );
        
        if (totalitySequences.length > 0) {
            // Somma le durate
            const totalDuration = totalitySequences.reduce((sum, seq) => {
                return sum + (seq.duration || 0);
            }, 0);
            return totalDuration;
        }
        
        // Fallback: cerca sequenza totalità singola (vecchio formato)
        const totality = this.sequences.find(s => s.id === 'totality');
        if (totality) {
            return totality.duration;
        }
        
        // Fallback finale: cerca nei contacts se disponibile
        if (this.currentContacts && this.currentContacts.totalityDuration) {
            return this.currentContacts.totalityDuration;
        }
        
        return 0;
    }
    
    getPhaseColor(phase) {
        const colors = {
            'partial': '#5ac8fa',
            'warning': '#ff4444',
            'baily': '#ffcc00',
            'totality': '#ff2d55',
            'default': '#888'
        };
        return colors[phase] || colors.default;
    }
    
    /**
     * Upload NINA
     */
    uploadNINA() {
        if (this.sequences.length === 0) {
            alert('Genera prima le sequenze!');
            return;
        }
        alert(`📡 Upload a N.I.N.A. - ${this.sequences.length} sequenze\n\n(Richiede connessione NINA attiva)`);
    }
    
    /**
     * Upload Ekos
     */
    uploadEkos() {
        if (this.sequences.length === 0) {
            alert('Genera prima le sequenze!');
            return;
        }
        alert(`📡 Upload a Ekos - ${this.sequences.length} sequenze\n\n(Richiede connessione Ekos attiva)`);
    }
    
    /**
     * Download JSON
     */
    downloadJSON() {
        if (this.sequences.length === 0) {
            alert('Genera prima le sequenze!');
            return;
        }
        
        const data = {
            generated: new Date().toISOString(),
            sequences: this.sequences.map(seq => ({
                ...seq,
                startTime: seq.startTime.toISOString()
            }))
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `eclipse_sequences_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        notificationManager.show('💾 JSON scaricato!', 'success');
    }
    
    /**
     * Download CSV
     */
    downloadCSV() {
        if (this.sequences.length === 0) {
            alert('Genera prima le sequenze!');
            return;
        }
        
        let csv = 'Sequence,Phase,Start Time,Duration,Filter,Exposures,Shots\n';
        
        this.sequences.forEach(seq => {
            csv += `"${seq.name}","${seq.phase}","${seq.startTime.toLocaleString()}",${seq.duration},"${seq.filter}","${seq.exposures.join('; ')}",${seq.shots || 0}\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `eclipse_sequences_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        
        notificationManager.show('💾 CSV scaricato!', 'success');
    }
    
    /**
     * ✅ FIX B: Download NINA format
     */
    downloadNINA() {
        if (this.sequences.length === 0) {
            alert('Genera prima le sequenze!');
            return;
        }
        
        try {
            Utils.log('🚀 Export NINA in corso...', 'info');
            
            // Verifica che sequenceUploader sia disponibile
            if (typeof sequenceUploader === 'undefined') {
                throw new Error('sequenceUploader non disponibile');
            }
            
            // Usa sequenceUploader per esportare
            const result = sequenceUploader.downloadSequencesNINA(this.sequences);
            
            if (result.success) {
                notificationManager.show(
                    `✅ Sequenze esportate in formato N.I.N.A.!\n` +
                    `File: ${result.filename}\n` +
                    `Dimensione: ${(result.size / 1024).toFixed(1)} KB\n\n` +
                    `Importa in N.I.N.A.: Sequencer → Load → Seleziona file`,
                    'success'
                );
                Utils.log('✅ Export NINA completato', 'success');
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            Utils.log('❌ Errore export N.I.N.A.: ' + error.message, 'error');
            notificationManager.show('❌ Errore export N.I.N.A.: ' + error.message, 'error');
        }
    }
    
    /**
     * Download sequenze formato EKOS/KStars (.esq)
     */
    downloadEKOS() {
        if (this.sequences.length === 0) {
            alert('Genera prima le sequenze!');
            return;
        }
        
        try {
            Utils.log('🚀 Export EKOS in corso...', 'info');
            
            // Verifica che ekosConnector sia disponibile
            if (!window.ekosConnector) {
                throw new Error('EKOS Connector non disponibile');
            }
            
            // Usa ekosConnector per esportare
            const result = window.ekosConnector.exportToFile(this.sequences);
            
            if (result.success) {
                notificationManager.show(
                    `✅ Sequenze esportate in formato EKOS/KStars!\n` +
                    `File: ${result.filename}\n` +
                    `Dimensione: ${(result.size / 1024).toFixed(1)} KB\n\n` +
                    `Importa in EKOS/KStars: Capture Module → Load Sequence Queue → Seleziona file .esq`,
                    'success'
                );
                Utils.log('✅ Export EKOS completato', 'success');
            } else {
                throw new Error(result.error || 'Export fallito');
            }
            
        } catch (error) {
            Utils.log('❌ Errore export EKOS: ' + error.message, 'error');
            notificationManager.show('❌ Errore export EKOS: ' + error.message, 'error');
        }
    }
}

// Istanza globale
const eclipseSequences = new EclipseSequences();
