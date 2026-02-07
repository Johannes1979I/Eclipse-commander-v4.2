/**
 * SOLAR MODE - COMPLETE WORKING VERSION
 * Modalità foto solare con calcolo posizione e timing ottimale
 * Usa Equipment (camera, telescopio, filtro) come Eclipse Mode
 */

class SolarMode {
    constructor() {
        this.active = false;
        this.updateInterval = null;
        this.timelapseInterval = null;
        this.timelapseRunning = false;
        this.currentEquipment = null;
        this.currentLocation = null;
    }
    
    activate() {
        this.active = true;
        
        console.log('=== SOLAR MODE ACTIVATION ===');
        console.log('1. Solar Mode attivato');
        
        // Ottieni equipment
        console.log('2. Carico equipment...');
        this.loadEquipment();
        console.log('3. Equipment caricato:', this.currentEquipment);
        
        // Auto-calcola posizione se location disponibile
        console.log('4. Verifico location...');
        this.currentLocation = locationManager.getCurrentLocation();
        console.log('5. Location:', this.currentLocation);
        
        if (this.currentLocation) {
            console.log('6. Calcolo posizione solare...');
            this.calculateSolarPosition();
            
            // Auto-update ogni 10 secondi
            this.updateInterval = setInterval(() => {
                this.calculateSolarPosition();
            }, 10000);
            
            console.log('7. Timer auto-update attivato');
        } else {
            console.log('⚠️ Location non disponibile');
            notificationManager.show('⚠️ Imposta prima la posizione GPS nella sezione Location', 'warning');
        }
        
        console.log('=== SOLAR MODE ACTIVATION COMPLETE ===');
        Utils.log('Solar Mode attivato');
    }
    
    deactivate() {
        this.active = false;
        
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        this.stopTimelapse();
        
        Utils.log('Solar Mode disattivato');
    }
    
    /**
     * Carica equipment da equipmentPanel (come Eclipse Mode)
     */
    loadEquipment() {
        console.log('=== LOAD EQUIPMENT ===');
        
        if (!window.equipmentPanel) {
            console.log('❌ equipmentPanel non disponibile');
            Utils.log('⚠️ equipmentPanel non disponibile', 'warning');
            return null;
        }
        
        console.log('✅ equipmentPanel disponibile');
        
        this.currentEquipment = window.equipmentPanel.getCurrentEquipment();
        console.log('Equipment ottenuto:', this.currentEquipment);
        
        if (this.currentEquipment && this.currentEquipment.camera) {
            Utils.log(`✅ Equipment caricato: ${this.currentEquipment.camera.name}`, 'success');
            Utils.log(`Camera: ${this.currentEquipment.camera.name}`, 'info');
            Utils.log(`Telescopio: ${this.currentEquipment.telescope ? this.currentEquipment.telescope.name : 'Nessuno'}`, 'info');
            Utils.log(`Filtro: ${this.currentEquipment.filter || 'Nessuno'}`, 'info');
            
            console.log('Chiamo displayEquipmentInfo()...');
            // Aggiorna UI con equipment info
            this.displayEquipmentInfo();
            console.log('displayEquipmentInfo() completato');
        } else {
            console.log('⚠️ Equipment non configurato o camera mancante');
            Utils.log('⚠️ Equipment non configurato', 'warning');
            notificationManager.show('⚠️ Configura prima Equipment (Camera + Telescopio + Filtro)', 'warning');
        }
        
        console.log('=== LOAD EQUIPMENT COMPLETE ===');
        return this.currentEquipment;
    }
    
    /**
     * Mostra info equipment nella UI
     */
    displayEquipmentInfo() {
        console.log('=== DISPLAY EQUIPMENT INFO ===');
        console.log('currentEquipment:', this.currentEquipment);
        
        const infoDiv = document.getElementById('solarEquipmentInfoContent');
        console.log('solarEquipmentInfoContent div:', infoDiv);
        
        if (!this.currentEquipment) {
            console.log('⚠️ Nessun equipment, mostro messaggio di avviso');
            if (infoDiv) {
                infoDiv.innerHTML = '<p class="text-muted">⚠️ Nessun equipment configurato. Vai su Equipment per configurare Camera, Telescopio e Filtro.</p>';
                console.log('✅ Messaggio avviso inserito nel div');
            } else {
                console.log('❌ Div solarEquipmentInfoContent non trovato!');
            }
            return;
        }
        
        console.log('✅ Equipment presente, genero HTML...');
        
        const eq = this.currentEquipment;
        let infoHtml = '<div class="alert alert-success"><strong>✅ Equipment Pronto:</strong><br>';
        
        if (eq.camera) {
            infoHtml += `<strong>Camera:</strong> ${eq.camera.name}<br>`;
            if (eq.camera.unityGain) {
                infoHtml += `<strong>Unity Gain:</strong> ${eq.camera.unityGain}<br>`;
            }
        }
        
        if (eq.telescope) {
            infoHtml += `<strong>Telescopio:</strong> ${eq.telescope.name} (${eq.telescope.aperture}mm, f/${eq.telescope.focalRatio})<br>`;
        }
        
        if (eq.filter) {
            infoHtml += `<strong>Filtro:</strong> ${eq.filter}`;
        }
        
        infoHtml += '</div>';
        
        console.log('HTML generato:', infoHtml.substring(0, 100) + '...');
        
        // Inserisci nel div dedicato
        if (infoDiv) {
            infoDiv.innerHTML = infoHtml;
            console.log('✅ HTML inserito nel div');
            Utils.log('✅ Equipment info mostrate nella UI', 'success');
        } else {
            console.log('❌ Div solarEquipmentInfoContent non trovato!');
            Utils.log('⚠️ Div solarEquipmentInfoContent non trovato', 'warning');
        }
        
        console.log('=== DISPLAY EQUIPMENT INFO COMPLETE ===');
    }
    
    /**
     * Ottieni parametri di scatto basati su equipment e filtro
     */
    getCaptureParameters() {
        if (!this.currentEquipment || !this.currentEquipment.camera) {
            notificationManager.show('⚠️ Configura prima Equipment!', 'error');
            return null;
        }
        
        const camera = this.currentEquipment.camera;
        const filter = this.currentEquipment.filter || 'ND5';
        
        // Rileva tipo camera
        const cameraType = this.detectCameraType(camera);
        
        // Parametri base
        const params = {
            camera: camera.name,
            cameraType: cameraType,
            filter: filter,
            binning: 1
        };
        
        // Parametri specifici per tipo camera
        if (cameraType === 'cmos') {
            // Unity Gain automatico o manuale
            if (camera.unityGain) {
                params.gain = camera.unityGain;
                Utils.log(`📷 Unity Gain automatico: ${camera.unityGain}`, 'info');
            } else {
                params.gain = 100; // Default
            }
            params.offset = 10; // Default offset
        } else if (cameraType === 'dslr') {
            params.iso = 400; // Default ISO per DSLR
        }
        
        // Esposizioni consigliate per filtro
        params.exposures = this.getSuggestedExposures(filter);
        
        Utils.log('Parametri cattura generati:', params);
        
        return params;
    }
    
    /**
     * Rileva tipo camera (CMOS vs DSLR)
     */
    detectCameraType(camera) {
        if (!camera) return 'cmos';
        
        const name = camera.name.toLowerCase();
        
        // DSLR brands
        if (name.includes('canon') || name.includes('nikon') || 
            name.includes('sony alpha') || name.includes('pentax')) {
            return 'dslr';
        }
        
        // CMOS default
        return 'cmos';
    }
    
    /**
     * Esposizioni consigliate per filtro solare
     */
    getSuggestedExposures(filter) {
        const filterType = filter ? filter.toLowerCase() : 'nd5';
        
        if (filterType.includes('nd') || filterType.includes('white')) {
            return ['1/2000', '1/1000', '1/500']; // ND5 White Light
        } else if (filterType.includes('h-alpha') || filterType.includes('halpha')) {
            return ['1/500', '1/250', '1/100']; // H-alpha
        } else if (filterType.includes('cak') || filterType.includes('calcium')) {
            return ['1/200', '1/100', '1/50']; // Calcium K
        }
        
        // Default
        return ['1/1000', '1/500', '1/250'];
    }
    
    /**
     * Mostra parametri cattura dettagliati nella UI
     */
    displayCaptureParameters() {
        console.log('=== DISPLAY CAPTURE PARAMETERS ===');
        console.log('Ottengo parametri cattura...');
        
        const params = this.getCaptureParameters();
        console.log('Parametri ottenuti:', params);
        
        if (!params) {
            console.log('❌ Parametri non disponibili');
            notificationManager.show('⚠️ Configura prima Equipment!', 'warning');
            return;
        }
        
        console.log('✅ Parametri disponibili, genero HTML...');
        
        let html = '<div class="alert alert-success">';
        html += '<strong>📸 Parametri di Cattura (da Equipment):</strong><br>';
        html += `<strong>Camera:</strong> ${params.camera} (${params.cameraType.toUpperCase()})<br>`;
        html += `<strong>Filtro:</strong> ${params.filter}<br>`;
        
        if (params.cameraType === 'cmos') {
            html += `<strong>Gain:</strong> ${params.gain}<br>`;
            html += `<strong>Offset:</strong> ${params.offset}<br>`;
        } else {
            html += `<strong>ISO:</strong> ${params.iso}<br>`;
        }
        
        html += `<strong>Esposizioni consigliate:</strong> ${params.exposures.join(', ')}<br>`;
        html += `<strong>Binning:</strong> ${params.binning}×${params.binning}`;
        html += '</div>';
        
        console.log('HTML generato');
        
        // Mostra nel div dedicato
        const paramsDiv = document.getElementById('solarCaptureParams');
        console.log('solarCaptureParams div:', paramsDiv);
        
        if (paramsDiv) {
            paramsDiv.innerHTML = html;
            console.log('✅ HTML inserito nel div');
            Utils.log('✅ Parametri cattura mostrati nella UI', 'success');
        } else {
            console.log('❌ Div solarCaptureParams non trovato!');
            Utils.log('⚠️ Div solarCaptureParams non trovato', 'warning');
        }
        
        notificationManager.show('✅ Parametri cattura calcolati da Equipment!', 'success');
        console.log('=== DISPLAY CAPTURE PARAMETERS COMPLETE ===');
    }
    
    /**
     * Cattura singola con parametri equipment
     */
    captureSingle() {
        console.log('=== CAPTURE SINGLE ===');
        
        if (!this.currentEquipment || !this.currentEquipment.camera) {
            console.log('❌ Equipment non configurato');
            notificationManager.show('⚠️ Configura prima Equipment!', 'error');
            return;
        }
        
        if (!this.currentLocation) {
            console.log('❌ Location non configurata');
            notificationManager.show('⚠️ Imposta prima la posizione GPS!', 'error');
            return;
        }
        
        console.log('✅ Equipment e location OK');
        console.log('Equipment:', this.currentEquipment);
        console.log('Location:', this.currentLocation);
        
        const params = this.getCaptureParameters();
        console.log('Parametri cattura:', params);
        
        if (!params) {
            console.log('❌ Parametri non disponibili');
            return;
        }
        
        // Log cattura
        Utils.log('=== CATTURA SINGOLA SOLARE ===', 'info');
        Utils.log(`Camera: ${params.camera}`, 'info');
        Utils.log(`Filtro: ${params.filter}`, 'info');
        Utils.log(`Posizione: ${this.currentLocation.name}`, 'info');
        
        if (params.cameraType === 'cmos') {
            Utils.log(`Gain: ${params.gain}, Offset: ${params.offset}`, 'info');
        } else {
            Utils.log(`ISO: ${params.iso}`, 'info');
        }
        
        // Beep
        if (countdownDisplay && countdownDisplay.playBeep) {
            countdownDisplay.playBeep(1);
            console.log('✅ Beep riprodotto');
        }
        
        notificationManager.show(
            `📸 Cattura solare eseguita!\n` +
            `Camera: ${params.camera}\n` +
            `Filtro: ${params.filter}\n` +
            `Esposizioni consigliate: ${params.exposures.join(', ')}`,
            'success'
        );
        
        Utils.log('✅ Cattura singola completata', 'success');
        console.log('=== CAPTURE SINGLE COMPLETE ===');
    }
    
    calculateSolarPosition() {
        // Ricarica location se non disponibile
        if (!this.currentLocation) {
            this.currentLocation = locationManager.getCurrentLocation();
        }
        
        if (!this.currentLocation) {
            notificationManager.show('Imposta prima la località nella sezione Location', 'warning');
            return;
        }
        
        const now = new Date();
        
        // Calcola posizione sole usando AstronomyCalculator
        const sunPos = astronomyCalc.calculateSunPosition(
            now,
            this.currentLocation.lat,
            this.currentLocation.lon
        );
        
        // Update UI
        this.updateSolarDisplay(sunPos, now);
        this.updateTimingAdvice(sunPos);
        
        return sunPos;
    }
    
    updateSolarDisplay(sunPos, time) {
        const altElement = document.getElementById('solarAltitude');
        const azElement = document.getElementById('solarAzimuth');
        const timeElement = document.getElementById('solarTime');
        
        if (altElement) {
            altElement.textContent = `${sunPos.altitude.toFixed(1)}°`;
        }
        
        if (azElement) {
            azElement.textContent = `${sunPos.azimuth.toFixed(1)}°`;
        }
        
        if (timeElement) {
            timeElement.textContent = Utils.formatTime(time);
        }
    }
    
    updateTimingAdvice(sunPos) {
        const adviceDiv = document.getElementById('solarTimingAdvice');
        if (!adviceDiv) return;
        
        adviceDiv.classList.remove('hidden');
        
        const alt = sunPos.altitude;
        let seeingQuality = '';
        let seeingClass = '';
        let recommendation = '';
        
        if (alt > 50) {
            seeingQuality = '✅ OTTIMO';
            seeingClass = 'alert-success';
            recommendation = 'Questo è il MIGLIOR MOMENTO per scattare! Seeing eccellente, turbolenza minima.';
        } else if (alt > 30) {
            seeingQuality = '⚠️ DISCRETO';
            seeingClass = 'alert-warning';
            recommendation = 'Condizioni accettabili. Puoi scattare, ma qualità non ottimale. Meglio aspettare altitudine >50°.';
        } else if (alt > 0) {
            seeingQuality = '❌ SCARSO';
            seeingClass = 'alert-error';
            recommendation = 'Seeing scarso, troppa turbolenza atmosferica. SCONSIGLIATO scattare ora. Aspetta che sole sia più alto.';
        } else {
            seeingQuality = '🌙 SOLE SOTTO ORIZZONTE';
            seeingClass = 'alert-info';
            recommendation = 'Il sole non è visibile. Torna quando sarà sopra l\'orizzonte.';
        }
        
        const titleEl = document.getElementById('timingTitle');
        const messageEl = document.getElementById('timingMessage');
        const recommendEl = document.getElementById('timingRecommendation');
        
        if (titleEl) titleEl.textContent = `📊 Seeing: ${seeingQuality}`;
        if (messageEl) messageEl.textContent = `Altitudine: ${alt.toFixed(1)}°`;
        if (recommendEl) recommendEl.textContent = recommendation;
        
        const alertDiv = adviceDiv.querySelector('.alert');
        if (alertDiv) {
            alertDiv.className = `alert ${seeingClass}`;
        }
    }
    
    startTimelapse() {
        if (this.timelapseRunning) {
            this.stopTimelapse();
            return;
        }
        
        const intervalSeconds = parseInt(document.getElementById('inputInterval')?.value) || 60;
        const durationMinutes = parseInt(document.getElementById('inputDuration')?.value) || 30;
        
        const totalFrames = Math.floor((durationMinutes * 60) / intervalSeconds);
        
        if (!confirm(`Avvio time-lapse: ${totalFrames} scatti ogni ${intervalSeconds}s per ${durationMinutes} minuti. Confermi?`)) {
            return;
        }
        
        this.timelapseRunning = true;
        let frameCount = 0;
        
        const statusDiv = document.getElementById('timelapseStatus');
        const btnTimelapse = document.getElementById('btnStartTimelapse');
        
        if (btnTimelapse) btnTimelapse.textContent = '⏸️ Ferma Time-lapse';
        
        // Primo frame immediato
        this.captureFrame(frameCount + 1, totalFrames, statusDiv);
        frameCount++;
        
        // Frames successivi
        this.timelapseInterval = setInterval(() => {
            if (frameCount >= totalFrames) {
                this.stopTimelapse();
                notificationManager.show(`Time-lapse completato! ${totalFrames} frames catturati.`, 'success');
                return;
            }
            
            this.captureFrame(frameCount + 1, totalFrames, statusDiv);
            frameCount++;
            
        }, intervalSeconds * 1000);
        
        notificationManager.show(`Time-lapse avviato: ${totalFrames} frames`, 'success');
        Utils.log(`Time-lapse avviato: ${intervalSeconds}s × ${durationMinutes}min = ${totalFrames} frames`);
    }
    
    stopTimelapse() {
        if (this.timelapseInterval) {
            clearInterval(this.timelapseInterval);
            this.timelapseInterval = null;
        }
        
        this.timelapseRunning = false;
        
        const btnTimelapse = document.getElementById('btnStartTimelapse');
        if (btnTimelapse) btnTimelapse.textContent = '▶️ Avvia Time-lapse';
        
        const statusDiv = document.getElementById('timelapseStatus');
        if (statusDiv) statusDiv.classList.add('hidden');
        
        Utils.log('Time-lapse fermato');
    }
    
    captureFrame(current, total, statusDiv) {
        // Ottieni parametri cattura da equipment
        const params = this.getCaptureParameters();
        
        if (!params) {
            Utils.log('❌ Parametri cattura non disponibili', 'error');
            this.stopTimelapse();
            return;
        }
        
        // Log parametri cattura
        Utils.log(`📸 Cattura frame ${current}/${total}:`, 'info');
        Utils.log(`  Camera: ${params.camera} (${params.cameraType})`, 'info');
        Utils.log(`  Filtro: ${params.filter}`, 'info');
        if (params.cameraType === 'cmos') {
            Utils.log(`  Gain: ${params.gain}, Offset: ${params.offset}`, 'info');
        } else {
            Utils.log(`  ISO: ${params.iso}`, 'info');
        }
        Utils.log(`  Esposizioni consigliate: ${params.exposures.join(', ')}`, 'info');
        
        // Beep per notificare frame
        if (countdownDisplay && countdownDisplay.playBeep) {
            countdownDisplay.playBeep(1);
        }
        
        // Update status con info equipment
        if (statusDiv) {
            const percent = (current / total) * 100;
            const eta = Math.floor(((total - current) * parseInt(document.getElementById('inputInterval')?.value || 60)) / 60);
            
            let cameraInfo = '';
            if (params.cameraType === 'cmos') {
                cameraInfo = `Gain: ${params.gain}, Offset: ${params.offset}`;
            } else {
                cameraInfo = `ISO: ${params.iso}`;
            }
            
            statusDiv.innerHTML = `
                <div class="alert alert-info">
                    <strong>🎬 Time-lapse in corso...</strong><br>
                    Frame: ${current} / ${total} (${percent.toFixed(0)}%)<br>
                    Camera: ${params.camera}<br>
                    Filtro: ${params.filter}<br>
                    ${cameraInfo}<br>
                    ETA: ${eta} minuti
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percent}%; background: #3b82f6;"></div>
                    </div>
                </div>
            `;
            statusDiv.classList.remove('hidden');
        }
        
        Utils.log(`✅ Time-lapse frame ${current}/${total} catturato con equipment configurato`);
    }
}

const solarMode = new SolarMode();
