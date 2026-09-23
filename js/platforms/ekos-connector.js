/**
 * EKOS CONNECTOR MODULE
 * Connessione a Ekos/INDI tramite INDI Web Manager
 */

class EkosConnector {
    constructor() {
        this.baseUrl = null;
        this.connected = false;
        this.devices = [];
        this.profiles = [];
        this.activeProfile = null;
        this.pollInterval = null;
    }
    
    /**
     * Connetti a Ekos Web Manager
     * @param {string} host - IP o hostname (es. "192.168.4.1" o "raspberrypi.local")
     * @param {number} port - Porta (default 8624)
     */
    async connect(host, port = CONFIG.EKOS_DEFAULT_PORT) {
        try {
            this.baseUrl = `http://${host}:${port}`;
            
            Utils.log(`Connessione a Ekos: ${this.baseUrl}`);
            
            // Test connessione
            const response = await fetch(`${this.baseUrl}/api/server/status`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            // Verifica Content-Type della risposta ✅
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                // Risposta non è JSON - probabilmente pagina HTML di errore
                const text = await response.text();
                const preview = text.substring(0, 100);
                throw new Error(
                    `Server non risponde con JSON (ricevuto ${contentType || 'unknown'}). ` +
                    `Verifica che Ekos sia in esecuzione e l'API sia attiva. ` +
                    `Preview: ${preview}...`
                );
            }
            
            const status = await response.json();
            
            Utils.log('Ekos connesso: ' + JSON.stringify(status));
            
            this.connected = true;
            
            // Carica profili disponibili
            await this.loadProfiles();
            
            // Avvia polling dispositivi
            this.startPolling();
            
            return {
                success: true,
                status: status,
                url: this.baseUrl
            };
            
        } catch (error) {
            Utils.log('Errore connessione Ekos: ' + error.message, 'error');
            this.connected = false;
            
            // Messaggi di errore più utili ✅
            let userMessage = error.message;
            
            if (error.message.includes('Failed to fetch')) {
                userMessage = `Impossibile raggiungere Ekos su ${this.baseUrl}. Verifica che:
• Ekos sia in esecuzione
• L'indirizzo ${host} sia corretto
• La porta ${port} sia aperta
• Non ci siano firewall che bloccano la connessione`;
            } else if (error.message.includes('NetworkError')) {
                userMessage = `Errore di rete: verifica connessione a ${host}`;
            }
            
            throw new Error(userMessage);
        }
    }
    
    /**
     * Disconnetti da Ekos
     */
    disconnect() {
        this.stopPolling();
        this.connected = false;
        this.devices = [];
        this.baseUrl = null;
        
        Utils.log('Ekos disconnesso');
    }
    
    /**
     * Carica profili disponibili
     */
    async loadProfiles() {
        try {
            const response = await fetch(`${this.baseUrl}/api/profiles`, {
                method: 'GET'
            });
            
            if (!response.ok) {
                throw new Error('Errore caricamento profili');
            }
            
            this.profiles = await response.json();
            
            Utils.log(`Profili Ekos trovati: ${this.profiles.length}`);
            
            return this.profiles;
            
        } catch (error) {
            Utils.log('Errore caricamento profili: ' + error.message, 'error');
            return [];
        }
    }
    
    /**
     * Avvia profilo Ekos
     */
    async startProfile(profileName) {
        try {
            const response = await fetch(`${this.baseUrl}/api/profiles/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    profile: profileName
                })
            });
            
            if (!response.ok) {
                throw new Error('Errore avvio profilo');
            }
            
            this.activeProfile = profileName;
            
            Utils.log(`Profilo avviato: ${profileName}`);
            
            // Attendi dispositivi pronti
            await this.waitForDevices();
            
            return true;
            
        } catch (error) {
            Utils.log('Errore avvio profilo: ' + error.message, 'error');
            throw error;
        }
    }
    
    /**
     * Attendi che dispositivi siano pronti
     */
    async waitForDevices(timeout = 10000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            await this.updateDevices();
            
            if (this.devices.length > 0) {
                Utils.log('Dispositivi pronti');
                return true;
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        throw new Error('Timeout attesa dispositivi');
    }
    
    /**
     * Aggiorna lista dispositivi
     */
    async updateDevices() {
        if (!this.connected) return [];
        
        try {
            const response = await fetch(`${this.baseUrl}/api/devices`, {
                method: 'GET'
            });
            
            if (!response.ok) {
                throw new Error('Errore lettura dispositivi');
            }
            
            const devices = await response.json();
            
            // Processa dispositivi
            this.devices = devices.map(device => ({
                name: device.name || device.device,
                driver: device.driver,
                type: this.detectDeviceType(device),
                connected: device.state === 'Connected' || device.connected === true,
                interface: device.interface || 'INDI',
                raw: device
            }));
            
            return this.devices;
            
        } catch (error) {
            Utils.log('Errore update dispositivi: ' + error.message, 'warn');
            return this.devices;
        }
    }
    
    /**
     * Rileva tipo dispositivo
     */
    detectDeviceType(device) {
        const name = (device.name || device.driver || '').toLowerCase();
        const driver = (device.driver || '').toLowerCase();
        
        if (name.includes('ccd') || name.includes('camera') || 
            driver.includes('asi') || driver.includes('qhy')) {
            return 'camera';
        }
        if (name.includes('mount') || name.includes('telescope') ||
            driver.includes('eqmod') || driver.includes('ioptron')) {
            return 'mount';
        }
        if (name.includes('focuser') || driver.includes('focus')) {
            return 'focuser';
        }
        if (name.includes('wheel') || name.includes('filter')) {
            return 'filterwheel';
        }
        if (name.includes('guide') || driver.includes('guide')) {
            return 'guider';
        }
        
        return 'unknown';
    }
    
    /**
     * Ottieni camere disponibili
     */
    getCameras() {
        return this.devices.filter(d => d.type === 'camera');
    }
    
    /**
     * Ottieni dettagli camera
     */
    async getCameraDetails(cameraName) {
        try {
            const response = await fetch(`${this.baseUrl}/api/devices/${cameraName}/properties`, {
                method: 'GET'
            });
            
            if (!response.ok) {
                throw new Error('Errore lettura proprietà camera');
            }
            
            const properties = await response.json();
            
            // Estrai info utili
            const details = {
                name: cameraName,
                type: 'cmos', // Assume CMOS per INDI
                connected: true,
                properties: {}
            };
            
            // Cerca proprietà comuni
            for (let prop of properties) {
                if (prop.name === 'CCD_INFO') {
                    details.width = parseInt(prop.values?.CCD_MAX_X?.value) || 0;
                    details.height = parseInt(prop.values?.CCD_MAX_Y?.value) || 0;
                    details.pixelSize = parseFloat(prop.values?.CCD_PIXEL_SIZE?.value) || 0;
                    details.bitDepth = parseInt(prop.values?.CCD_BITSPERPIXEL?.value) || 16;
                }
                
                if (prop.name === 'CCD_TEMPERATURE') {
                    details.temperature = parseFloat(prop.values?.CCD_TEMPERATURE_VALUE?.value);
                    details.hasCooling = true;
                }
                
                if (prop.name === 'CCD_CONTROLS') {
                    details.gainMin = parseInt(prop.values?.Gain?.min) || 0;
                    details.gainMax = parseInt(prop.values?.Gain?.max) || 100;
                    details.gainUnity = 50; // Stima
                }
            }
            
            return details;
            
        } catch (error) {
            Utils.log('Errore dettagli camera: ' + error.message, 'error');
            return null;
        }
    }
    
    /**
     * Imposta proprietà dispositivo
     */
    async setProperty(deviceName, propertyName, values) {
        try {
            const response = await fetch(`${this.baseUrl}/api/devices/${deviceName}/properties/${propertyName}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(values)
            });
            
            if (!response.ok) {
                throw new Error(`Errore set property: ${response.statusText}`);
            }
            
            return true;
            
        } catch (error) {
            Utils.log(`Errore set property ${propertyName}: ${error.message}`, 'error');
            return false;
        }
    }
    
    /**
     * Imposta temperatura camera
     */
    async setCameraTemperature(cameraName, temperature) {
        return await this.setProperty(cameraName, 'CCD_TEMPERATURE', {
            CCD_TEMPERATURE_VALUE: temperature
        });
    }
    
    /**
     * Imposta gain camera
     */
    async setCameraGain(cameraName, gain) {
        return await this.setProperty(cameraName, 'CCD_CONTROLS', {
            Gain: gain
        });
    }
    
    /**
     * Imposta offset camera
     */
    async setCameraOffset(cameraName, offset) {
        return await this.setProperty(cameraName, 'CCD_CONTROLS', {
            Offset: offset
        });
    }
    
    /**
     * Cattura immagine
     */
    async captureImage(cameraName, exposure, gain = null, binning = 1) {
        try {
            // Imposta binning
            if (binning > 1) {
                await this.setProperty(cameraName, 'CCD_BINNING', {
                    HOR_BIN: binning,
                    VER_BIN: binning
                });
            }
            
            // Imposta gain se fornito
            if (gain !== null) {
                await this.setCameraGain(cameraName, gain);
            }
            
            // Avvia esposizione
            const result = await this.setProperty(cameraName, 'CCD_EXPOSURE', {
                CCD_EXPOSURE_VALUE: exposure
            });
            
            if (!result) {
                throw new Error('Errore avvio esposizione');
            }
            
            Utils.log(`Esposizione avviata: ${exposure}s @ Gain ${gain}`);
            
            return {
                success: true,
                exposure: exposure,
                gain: gain,
                binning: binning
            };
            
        } catch (error) {
            Utils.log('Errore capture: ' + error.message, 'error');
            throw error;
        }
    }
    
    /**
     * Cattura sequenza
     */
    async captureSequence(cameraName, sequence) {
        const results = [];
        
        for (let i = 0; i < sequence.length; i++) {
            const shot = sequence[i];
            
            try {
                const result = await this.captureImage(
                    cameraName,
                    shot.exposure / 1000, // ms to seconds
                    shot.gain,
                    shot.binning || 1
                );
                
                results.push(result);
                
                // Attendi completamento + buffer
                await new Promise(resolve => 
                    setTimeout(resolve, (shot.exposure / 1000 + 2) * 1000)
                );
                
            } catch (error) {
                Utils.log(`Errore frame ${i+1}/${sequence.length}: ${error.message}`, 'error');
                results.push({
                    success: false,
                    error: error.message
                });
            }
        }
        
        return results;
    }
    
    /**
     * Avvia polling stato dispositivi
     */
    startPolling(interval = 5000) {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
        
        this.pollInterval = setInterval(() => {
            if (this.connected) {
                this.updateDevices();
            }
        }, interval);
    }
    
    /**
     * Ferma polling
     */
    stopPolling() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }
    
    /**
     * Test connessione
     */
    async testConnection(host, port = CONFIG.EKOS_DEFAULT_PORT) {
        try {
            const response = await fetch(`http://${host}:${port}/api/server/status`, {
                method: 'GET',
                timeout: 5000
            });
            
            return response.ok;
            
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Scan rete per trovare Ekos
     */
    async scanNetwork(subnet = '192.168') {
        Utils.log('Scan rete Ekos...');
        
        const hosts = [];
        const promises = [];
        
        // Scan solo alcuni IP comuni
        const commonIPs = [
            `${subnet}.4.1`,     // Raspberry hotspot
            `${subnet}.1.100`,   // DHCP tipico
            `${subnet}.1.101`,
            `${subnet}.1.102`,
            'raspberrypi.local',
            'stellarmate.local'
        ];
        
        for (let ip of commonIPs) {
            promises.push(
                this.testConnection(ip).then(success => {
                    if (success) {
                        hosts.push({
                            host: ip,
                            port: CONFIG.EKOS_DEFAULT_PORT,
                            url: `http://${ip}:${CONFIG.EKOS_DEFAULT_PORT}`
                        });
                    }
                }).catch(() => {})
            );
        }
        
        await Promise.allSettled(promises);
        
        Utils.log(`Ekos trovati: ${hosts.length}`);
        
        return hosts;
    }
    
    /**
     * Ottieni stato connessione
     */
    getStatus() {
        return {
            connected: this.connected,
            url: this.baseUrl,
            profile: this.activeProfile,
            devices: this.devices.length,
            cameras: this.getCameras().length
        };
    }
    
    // ==================== EXPORT EKOS SEQUENCE (.esq) ====================
    
    /**
     * Converti sequenze Eclipse → formato EKOS XML (.esq)
     * @param {Array} sequences - Array di sequenze da Eclipse Commander
     * @returns {string} - XML formattato per EKOS
     */
    convertToEkosFormat(sequences) {
        Utils.log('=== CONVERSIONE EKOS .esq ===');
        
        // Ottieni equipment per parametri (accesso globale)
        const equipment = (typeof window !== 'undefined' && window.equipmentPanel) 
            ? window.equipmentPanel.getCurrentEquipment() 
            : null;
        const camera = equipment ? equipment.camera : null;
        
        if (camera) {
            Utils.log(`Camera rilevata: ${camera.name} (Unity Gain: ${camera.unityGain || 'N/A'})`);
        }
        
        // Inizio XML
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<SequenceQueue version="2.6">\n';
        
        // Observer + parametri header (verificati su sorgente KStars sequencequeue.cpp)
        xml += '  <Observer>Osservatorio Jupiter</Observer>\n';
        // Eclissi: nessun enforcement guida/autofocus/refocus (non c'e' tempo)
        xml += "  <GuideDeviation enabled='false'>2</GuideDeviation>\n";
        xml += "  <GuideStartDeviation enabled='false'>2</GuideStartDeviation>\n";
        xml += "  <RefocusOnTemperatureDelta enabled='false'>1</RefocusOnTemperatureDelta>\n";
        xml += "  <RefocusEveryN enabled='false'>60</RefocusEveryN>\n";
        xml += "  <RefocusOnMeridianFlip enabled='false'/>\n";
        
        // Converti ogni sequenza in job EKOS
        sequences.forEach((seq, index) => {
            Utils.log(`Conversione sequenza ${index + 1}/${sequences.length}: ${seq.name}`);
            
            // Per ogni esposizione nella sequenza
            if (seq.exposures && seq.exposures.length > 0) {
                seq.exposures.forEach((exposure, expIndex) => {
                    const exposureTime = this.parseExposureTime(exposure);
                    const shots = seq.shots || 1;
                    
                    // Calcola Gain/ISO
                    let finalGain = null;
                    let finalISO = null;
                    let finalOffset = null;
                    let finalTemp = 0;
                    let forceTemp = false;
                    
                    if (seq.cameraType === 'cmos') {
                        // GAIN
                        if (seq.gain !== undefined && seq.gain !== null && seq.gain !== '') {
                            finalGain = parseInt(seq.gain);
                        } else if (camera && camera.unityGain) {
                            finalGain = camera.unityGain;
                            Utils.log(`📷 Unity Gain automatico: ${finalGain} (${camera.name})`);
                        } else {
                            // Default per CMOS
                            finalGain = 100;
                            Utils.log(`📷 Gain di default: ${finalGain}`);
                        }
                        
                        // OFFSET
                        if (seq.offset !== undefined && seq.offset !== null && seq.offset !== '') {
                            finalOffset = parseInt(seq.offset);
                        } else {
                            // Default offset per CMOS
                            finalOffset = 30;
                            Utils.log(`📷 Offset di default: ${finalOffset}`);
                        }
                        
                        // TEMPERATURA: priorità all'input di sequenza (seq.temp), poi equipment
                        if (seq.temp !== undefined && seq.temp !== null && seq.temp !== '') {
                            finalTemp = parseInt(seq.temp);
                            forceTemp = true;
                            Utils.log(`❄️ Temperatura da sequenza: ${finalTemp}°C`);
                        } else if (camera && camera.cooling) {
                            if (camera.coolingTemp !== undefined && camera.coolingTemp !== null) {
                                finalTemp = camera.coolingTemp;
                            } else {
                                finalTemp = -10; // Default -10°C
                            }
                            forceTemp = true;
                            Utils.log(`❄️ Temperatura raffreddamento: ${finalTemp}°C`);
                        }
                    } else if (seq.cameraType === 'dslr') {
                        // ISO per DSLR
                        if (seq.iso !== undefined && seq.iso !== null && seq.iso !== '') {
                            finalISO = parseInt(seq.iso);
                        } else {
                            finalISO = 400;
                        }
                    }
                    
                    // Nome target per-feature (diventa sottocartella e prefisso file via %t)
                    const targetName = 'Eclipse_' + String(seq.name || 'Fase').trim()
                        .replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

                    // Job EKOS — schema conforme al parser KStars (sequencejob.cpp::loadFrom, v2.6)
                    xml += '  <Job>\n';
                    xml += `    <Exposure>${exposureTime}</Exposure>\n`;
                    xml += `    <Format></Format>\n`;
                    xml += `    <Encoding>FITS</Encoding>\n`;
                    xml += `    <Binning>\n      <X>${seq.binning || 1}</X>\n      <Y>${seq.binning || 1}</Y>\n    </Binning>\n`;
                    xml += `    <Frame>\n      <X>0</X>\n      <Y>0</Y>\n      <W>0</W>\n      <H>0</H>\n    </Frame>\n`;
                    // Temperatura solo se camera raffreddata e impostata
                    if (forceTemp) {
                        xml += `    <Temperature force='true'>${finalTemp}</Temperature>\n`;
                    }
                    // Filtro: solo se e' un vero filtro su ruota. Le etichette dell'eclissi
                    // ('NESSUNO', 'ND5 Solar', 'RIMUOVERE ORA!'...) sono filtro MANUALE -> omesse
                    // (altrimenti Ekos cerca un filtro con quel nome sulla ruota e logga warning).
                    const fRaw = (seq.filter || '').trim();
                    const isRealWheelFilter = fRaw && fRaw !== '-' &&
                        !/nessuno|solar|filtro|rimuov|applicar|none/i.test(fRaw);
                    if (isRealWheelFilter) {
                        xml += `    <Filter>${fRaw}</Filter>\n`;
                    }
                    xml += `    <Type>Light</Type>\n`;
                    xml += `    <Count>${shots}</Count>\n`;
                    xml += `    <Delay>0</Delay>\n`;
                    // Naming moderno (il vecchio <Prefix> e' deprecato: legge i booleani come "1"/"0")
                    xml += `    <TargetName>${targetName}</TargetName>\n`;
                    xml += `    <FITSDirectory></FITSDirectory>\n`;
                    xml += `    <PlaceholderFormat>/%t/%t_%e_%D</PlaceholderFormat>\n`;
                    xml += `    <PlaceholderSuffix>3</PlaceholderSuffix>\n`;
                    xml += `    <UploadMode>1</UploadMode>\n`;
                    // Gain/Offset: Ekos li legge SOLO da <Properties> (cameraGain: CCD_GAIN.GAIN | CCD_CONTROLS.Gain)
                    xml += `    <Properties>\n`;
                    if (finalGain !== null || finalOffset !== null) {
                        xml += `      <PropertyVector name='CCD_CONTROLS'>\n`;
                        if (finalGain !== null)   xml += `        <OneElement name='Gain'>${finalGain}</OneElement>\n`;
                        if (finalOffset !== null) xml += `        <OneElement name='Offset'>${finalOffset}</OneElement>\n`;
                        xml += `      </PropertyVector>\n`;
                        // Fallback universale per camere con vettori dedicati (ZWO/QHY): ignorati se assenti
                        if (finalGain !== null) {
                            xml += `      <PropertyVector name='CCD_GAIN'>\n        <OneElement name='GAIN'>${finalGain}</OneElement>\n      </PropertyVector>\n`;
                        }
                        if (finalOffset !== null) {
                            xml += `      <PropertyVector name='CCD_OFFSET'>\n        <OneElement name='OFFSET'>${finalOffset}</OneElement>\n      </PropertyVector>\n`;
                        }
                    }
                    xml += `    </Properties>\n`;
                    // Nota reflex: Ekos vuole <ISOIndex> (indice), non <ISO> (valore) -> gestito in fase live
                    // Calibration conforme allo schema attuale (PreAction + FlatDuration)
                    xml += `    <Calibration>\n`;
                    xml += `      <PreAction>\n        <Type>0</Type>\n      </PreAction>\n`;
                    xml += `      <FlatDuration dark='false'>\n        <Type>Manual</Type>\n      </FlatDuration>\n`;
                    xml += `    </Calibration>\n`;
                    xml += '  </Job>\n';
                });
            }
        });
        
        xml += '</SequenceQueue>\n';
        
        Utils.log(`✅ Convertite ${sequences.length} sequenze in formato EKOS .esq`, 'success');
        
        return xml;
    }
    
    /**
     * Parsa tempo esposizione (es. "1/1000" → 0.001, "2s" → 2)
     * @param {string} exposure - Tempo esposizione
     * @returns {number} Secondi
     */
    parseExposureTime(exposure) {
        if (!exposure) return 1.0;
        
        const expStr = exposure.toString().trim().toLowerCase();
        
        // Frazione (es. "1/1000")
        if (expStr.includes('/')) {
            const parts = expStr.split('/');
            const num = parseFloat(parts[0]);
            const den = parseFloat(parts[1]);
            return num / den;
        }
        
        // Con "s" (es. "2s")
        if (expStr.endsWith('s')) {
            return parseFloat(expStr.replace('s', ''));
        }
        
        // Numero semplice
        return parseFloat(expStr);
    }
    
    /**
     * Export sequenze come file .esq scaricabile
     * @param {Array} sequences - Sequenze da esportare
     */
    exportToFile(sequences) {
        try {
            Utils.log('Export EKOS .esq file...');
            
            // Converti in XML
            const xmlContent = this.convertToEkosFormat(sequences);
            
            // Crea Blob
            const blob = new Blob([xmlContent], { type: 'application/xml' });
            
            // Genera nome file con timestamp
            const timestamp = new Date().getTime();
            const filename = `ekos_eclipse_sequence_${timestamp}.esq`;
            
            // Scarica file
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            Utils.log(`✅ File EKOS esportato: ${filename}`, 'success');
            
            return {
                success: true,
                filename: filename,
                size: blob.size
            };
            
        } catch (error) {
            Utils.log(`❌ Errore export EKOS: ${error.message}`, 'error');
            throw error;
        }
    }
}

// Export singleton
const ekosConnector = new EkosConnector();

// Rendi disponibile globalmente
if (typeof window !== 'undefined') {
    window.ekosConnector = ekosConnector;
}
