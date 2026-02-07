/**
 * SOLAR TRACKER MODULE
 * Visualizza mappa geografica con path eclisse e posizione sole real-time
 * Usa Leaflet per mappa interattiva
 */

class SolarTracker {
    constructor() {
        this.updateInterval = null;
        this.basicTrackingInterval = null;
        this.currentLocation = null;
        this.currentEclipse = null;
        this.map = null;
        this.pathLayer = null;
        this.sunMarker = null;
        this.umbralPathLayer = null;
    }
    
    /**
     * Inizializza il tracker
     */
    async initialize() {
        Utils.log('=== SOLAR TRACKER INITIALIZE ===');
        console.log('>>> SOLAR TRACKER INITIALIZE <<<');
        
        // Avvia subito l'aggiornamento dell'ora e dati base
        this.startBasicTracking();
        
        // Carica Leaflet e aspetta che sia pronto
        try {
            await this.loadLeaflet();
            Utils.log('✅ Solar Tracker pronto con Leaflet');
            console.log('✅ Solar Tracker completamente inizializzato');
        } catch (err) {
            Utils.log('❌ Errore caricamento Leaflet: ' + err, 'error');
            console.error('❌ Errore init Solar Tracker:', err);
        }
    }
    
    /**
     * Avvia tracking base (ora e dati solari) anche senza mappa
     */
    startBasicTracking() {
        console.log('>>> AVVIO BASIC TRACKING <<<');
        
        // Update immediato
        this.updateCurrentPosition();
        
        // Update ogni secondo per l'ora
        if (!this.basicTrackingInterval) {
            this.basicTrackingInterval = setInterval(() => {
                this.updateCurrentPosition();
            }, 1000);
        }
        
        console.log('✅ Basic tracking avviato (aggiornamento ogni secondo)');
    }
    
    /**
     * Carica libreria Leaflet (con Promise per attendere caricamento)
     */
    loadLeaflet() {
        return new Promise((resolve, reject) => {
            console.log('>>> CARICAMENTO LEAFLET <<<');
            
            // Se già caricato, risolvi subito
            if (window.L) {
                console.log('✅ Leaflet già disponibile');
                resolve();
                return;
            }
            
            // CSS
            if (!document.getElementById('leaflet-css')) {
                console.log('📄 Carico Leaflet CSS...');
                const link = document.createElement('link');
                link.id = 'leaflet-css';
                link.rel = 'stylesheet';
                link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
                link.onload = () => console.log('✅ Leaflet CSS caricato');
                link.onerror = () => console.error('❌ Errore Leaflet CSS');
                document.head.appendChild(link);
            } else {
                console.log('✅ Leaflet CSS già presente');
            }
            
            // JS
            if (!document.getElementById('leaflet-js')) {
                console.log('📜 Carico Leaflet JS da CDN...');
                const script = document.createElement('script');
                script.id = 'leaflet-js';
                script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
                
                script.onload = () => {
                    console.log('✅✅✅ Leaflet.js CARICATO! ✅✅✅');
                    console.log('window.L disponibile:', !!window.L);
                    if (window.L) {
                        Utils.log('✅ Leaflet caricato');
                        resolve();
                    } else {
                        console.error('❌ Leaflet script caricato ma window.L non disponibile!');
                        reject(new Error('Leaflet loaded but L not available'));
                    }
                };
                
                script.onerror = (err) => {
                    console.error('❌❌❌ ERRORE caricamento Leaflet.js ❌❌❌');
                    console.error('Errore:', err);
                    Utils.log('❌ Errore caricamento Leaflet', 'error');
                    reject(err);
                };
                
                document.head.appendChild(script);
                console.log('Script Leaflet aggiunto al DOM');
            } else {
                console.log('⏳ Script Leaflet già nel DOM, attendo caricamento...');
                // Script già presente, aspetta che carichi
                const checkInterval = setInterval(() => {
                    if (window.L) {
                        clearInterval(checkInterval);
                        console.log('✅ Leaflet disponibile (polling)');
                        resolve();
                    }
                }, 100);
                
                // Timeout dopo 10 secondi
                setTimeout(() => {
                    clearInterval(checkInterval);
                    if (!window.L) {
                        console.error('❌ TIMEOUT caricamento Leaflet (10s)');
                        reject(new Error('Timeout loading Leaflet'));
                    }
                }, 10000);
            }
        });
    }
    
    /**
     * Aggiorna con nuova eclisse
     */
    async updateEclipse(eclipse, location) {
        console.log('');
        console.log('═══════════════════════════════════════════');
        console.log('>>> SOLAR TRACKER UPDATE ECLIPSE <<<');
        console.log('═══════════════════════════════════════════');
        console.log('Eclipse ricevuta:', eclipse);
        console.log('Location ricevuta:', location);
        
        Utils.log(`=== SOLAR TRACKER UPDATE ===`);
        
        this.currentEclipse = eclipse;
        this.currentLocation = location;
        
        if (!eclipse) {
            console.error('❌ NESSUNA ECLISSE FORNITA!');
            Utils.log('❌ Nessuna eclisse fornita');
            return;
        }
        
        console.log('✅ Eclisse valida:', eclipse.name);
        
        if (!location) {
            console.warn('⚠️ Nessuna location, uso coordinate eclisse o default');
            Utils.log('⚠️ Nessuna location fornita, uso default');
            this.currentLocation = {
                lat: eclipse.lat || 0, 
                lon: eclipse.lon || 0, 
                name: 'Default'
            };
            console.log('Location default:', this.currentLocation);
        }
        
        // Verifica Leaflet
        console.log('Verifica Leaflet...');
        console.log('window.L disponibile?', !!window.L);
        
        if (!window.L) {
            console.warn('⏳ Leaflet NON ANCORA caricato, attendo...');
            Utils.log('⏳ Attendo caricamento Leaflet...');
            
            // Aspetta fino a 10 secondi
            let attempts = 0;
            const maxAttempts = 20; // 20 x 500ms = 10 secondi
            
            const checkLeaflet = async () => {
                attempts++;
                console.log(`Tentativo ${attempts}/${maxAttempts} - window.L:`, !!window.L);
                
                if (window.L) {
                    console.log('✅ Leaflet ORA disponibile, procedo!');
                    await this.createMap();
                } else if (attempts < maxAttempts) {
                    setTimeout(checkLeaflet, 500);
                } else {
                    console.error('❌❌❌ TIMEOUT! Leaflet non caricato dopo 10 secondi');
                    console.error('Possibili cause:');
                    console.error('1. CDN unpkg.com bloccato o lento');
                    console.error('2. Connessione internet assente');
                    console.error('3. Firewall blocca caricamento esterno');
                    Utils.log('❌ Timeout Leaflet', 'error');
                }
            };
            
            setTimeout(checkLeaflet, 500);
            return;
        }
        
        console.log('✅ Leaflet GIÀ disponibile, procedo subito!');
        await this.createMap();
    }
    
    /**
     * Crea la mappa (metodo separato per evitare duplicazione)
     */
    async createMap() {
        console.log('>>> CREAZIONE MAPPA <<<');
        
        try {
            // Inizializza mappa
            console.log('Step 1: Inizializza mappa Leaflet...');
            this.initializeMap();
            
            console.log('Step 2: Disegna path eclisse...');
            this.drawEclipsePath();
            
            console.log('Step 3: Avvia tracking real-time...');
            this.startRealTimeTracking();
            
            console.log('✅✅✅ SOLAR TRACKER SETUP COMPLETATO! ✅✅✅');
            console.log('═══════════════════════════════════════════');
            Utils.log('✅ Solar Tracker attivo');
            
        } catch (error) {
            console.error('❌❌❌ ERRORE SETUP SOLAR TRACKER ❌❌❌');
            console.error('Errore:', error);
            console.error('Stack:', error.stack);
            Utils.log('❌ Errore Solar Tracker: ' + error.message, 'error');
        }
    }
    
    /**
     * Inizializza mappa Leaflet
     */
    initializeMap() {
        console.log('=== INITIALIZE MAP ===');
        
        const container = document.getElementById('solarPathCanvas');
        console.log('Container solarPathCanvas:', container);
        
        if (!container) {
            console.error('❌ Container solarPathCanvas NON TROVATO!');
            Utils.log('❌ Container solarPathCanvas non trovato');
            return;
        }
        
        console.log('✅ Container trovato');
        
        // Rimuovi contenuto esistente
        container.innerHTML = '';
        container.style.height = '400px';
        container.style.width = '100%';
        container.style.background = '#a0d2eb';
        
        console.log('Container preparato:', {
            height: container.style.height,
            width: container.style.width,
            background: container.style.background
        });
        
        // Distruggi mappa esistente
        if (this.map) {
            console.log('Rimuovo mappa esistente...');
            this.map.remove();
            this.map = null;
        }
        
        // Crea nuova mappa centrata sull'eclisse o location
        const centerLat = this.currentEclipse.lat || this.currentLocation.lat || 0;
        const centerLon = this.currentEclipse.lon || this.currentLocation.lon || 0;
        
        console.log('Centro mappa:', {lat: centerLat, lon: centerLon});
        
        try {
            console.log('Creo mappa Leaflet...');
            this.map = L.map(container).setView([centerLat, centerLon], 3);
            
            console.log('✅ Mappa creata, aggiungo tile layer...');
            
            // Aggiungi tile layer OpenStreetMap
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 18
            }).addTo(this.map);
            
            console.log('✅ Tile layer aggiunto');
            Utils.log('✅ Mappa Leaflet creata');
            
        } catch (error) {
            console.error('❌ Errore creazione mappa:', error);
            Utils.log('❌ Errore creazione mappa: ' + error.message, 'error');
        }
    }
    
    /**
     * Disegna path eclisse sulla mappa
     */
    drawEclipsePath() {
        if (!this.map || !this.currentEclipse) {
            console.log('❌ Mappa o eclisse mancante per drawEclipsePath');
            return;
        }
        
        console.log('>>> DISEGNO PATH ECLISSE <<<');
        console.log('Eclipse path data:', this.currentEclipse.path);
        console.log('Path width:', this.currentEclipse.pathWidthKm);
        
        // Rimuovi layer precedenti
        if (this.pathLayer) {
            this.map.removeLayer(this.pathLayer);
        }
        if (this.umbralPathLayer) {
            this.map.removeLayer(this.umbralPathLayer);
        }
        
        // Usa path dal database se disponibile
        if (this.currentEclipse.path && this.currentEclipse.path.length > 0) {
            console.log(`✅ Path database trovato: ${this.currentEclipse.path.length} punti`);
            
            // Crea array coordinate per polyline
            const pathCoords = this.currentEclipse.path.map(p => [p.lat, p.lon]);
            
            // Disegna path centerline (linea centrale totalità)
            this.pathLayer = L.polyline(pathCoords, {
                color: '#ff0000',
                weight: 2,
                opacity: 0.8,
                dashArray: '5, 10'
            }).addTo(this.map);
            
            // Disegna banda totalità (umbra) se abbiamo larghezza
            if (this.currentEclipse.pathWidthKm) {
                console.log(`Disegno banda totalità: ${this.currentEclipse.pathWidthKm}km`);
                
                // Crea corridor (banda) usando geodesicBuffer approssimato
                const corridor = this.createEclipseCoordinate(
                    pathCoords, 
                    this.currentEclipse.pathWidthKm
                );
                
                this.umbralPathLayer = L.polygon(corridor, {
                    color: '#0066ff',
                    fillColor: '#0066ff',
                    fillOpacity: 0.3,
                    weight: 2,
                    opacity: 0.7
                }).addTo(this.map);
                
                // Popup con info
                this.umbralPathLayer.bindPopup(`
                    <strong>${this.currentEclipse.name}</strong><br>
                    Banda totalità: ${this.currentEclipse.pathWidthKm}km<br>
                    Durata max: ${this.currentEclipse.maxDuration}s
                `);
            }
            
            // Aggiungi markers per punti chiave del path
            this.currentEclipse.path.forEach((point, i) => {
                const marker = L.circleMarker([point.lat, point.lon], {
                    radius: 5,
                    fillColor: '#ff6600',
                    color: '#ffffff',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                }).addTo(this.map);
                
                const popupContent = `
                    <strong>Punto ${i + 1}</strong><br>
                    ${point.location || 'Path eclisse'}<br>
                    Durata: ${point.duration}s
                `;
                marker.bindPopup(popupContent);
            });
            
            // Fit map bounds to path
            const bounds = L.latLngBounds(pathCoords);
            this.map.fitBounds(bounds, {padding: [50, 50]});
            
            console.log('✅ Path eclisse disegnato sulla mappa');
            
        } else {
            console.log('⚠️ Path database non disponibile, calcolo approssimato');
            
            // Fallback: calcola path approssimato
            const calculatedPath = this.calculateEclipseGroundPath();
            
            if (calculatedPath.length > 0) {
                const pathCoords = calculatedPath.map(p => [p.lat, p.lon]);
                
                this.umbralPathLayer = L.polyline(pathCoords, {
                    color: '#0066ff',
                    weight: 8,
                    opacity: 0.7
                }).addTo(this.map);
                
                console.log(`✅ Path calcolato: ${calculatedPath.length} punti`);
            }
        }
        
        // Aggiungi markers contatti C1, C2, C3, C4
        this.addContactMarkers();
    }
    
    /**
     * Crea corridor (banda) attorno al path centerline
     */
    createEclipseCoordinate(centerline, widthKm) {
        console.log('Creo corridor per path...');
        
        const corridor = [];
        const halfWidth = widthKm / 2;
        
        // Lato superiore (offset a nord)
        centerline.forEach(coord => {
            const offsetLat = coord[0] + (halfWidth / 111); // ~111km per grado lat
            corridor.push([offsetLat, coord[1]]);
        });
        
        // Lato inferiore (offset a sud) - reverse per chiudere poligono
        for (let i = centerline.length - 1; i >= 0; i--) {
            const coord = centerline[i];
            const offsetLat = coord[0] - (halfWidth / 111);
            corridor.push([offsetLat, coord[1]]);
        }
        
        console.log(`Corridor creato: ${corridor.length} punti`);
        return corridor;
    }
    
    /**
     * Calcola path dell'ombra dell'eclisse sulla Terra
     */
    calculateEclipseGroundPath() {
        if (!this.currentEclipse) return [];
        
        const eclipse = this.currentEclipse;
        const path = [];
        
        // Se l'eclisse ha già coordinate path nel database, usale
        if (eclipse.pathCoordinates && eclipse.pathCoordinates.length > 0) {
            return eclipse.pathCoordinates;
        }
        
        // Altrimenti calcola path approssimato
        // Usa le coordinate dell'eclisse se disponibili
        const centerLat = eclipse.lat || 0;
        const centerLon = eclipse.lon || 0;
        
        // Calcola path da C1 a C4
        const startTime = new Date(eclipse.c1);
        const endTime = new Date(eclipse.c4);
        const duration = (endTime - startTime) / 1000; // secondi
        const steps = Math.min(Math.floor(duration / 60), 200); // Un punto al minuto, max 200
        
        for (let i = 0; i <= steps; i++) {
            const time = new Date(startTime.getTime() + (duration * 1000 * i / steps));
            
            // Calcola posizione sole
            const sunPos = astronomyCalc.calculateSunPosition(time, centerLat, centerLon);
            
            // Calcola subsolar point (punto sulla Terra dove il sole è allo zenith)
            const subsolarLat = this.calculateSubsolarLatitude(time);
            const subsolarLon = this.calculateSubsolarLongitude(time);
            
            path.push({
                time: time,
                lat: subsolarLat,
                lon: subsolarLon,
                altitude: sunPos.altitude
            });
        }
        
        return path;
    }
    
    /**
     * Calcola latitudine subsolar (declinazione solare)
     */
    calculateSubsolarLatitude(date) {
        // Formula semplificata declinazione solare
        const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
        const declination = 23.45 * Math.sin((360/365) * (dayOfYear - 81) * Math.PI / 180);
        return declination;
    }
    
    /**
     * Calcola longitudine subsolar
     */
    calculateSubsolarLongitude(date) {
        // Longitudine subsolar basata su ora UTC
        const hours = date.getUTCHours();
        const minutes = date.getUTCMinutes();
        const seconds = date.getUTCSeconds();
        
        const timeDecimal = hours + minutes/60 + seconds/3600;
        const longitude = (timeDecimal - 12) * 15; // 15° per ora
        
        return longitude;
    }
    
    /**
     * Aggiungi markers per estremi path e punto massimo
     */
    addContactMarkers() {
        if (!this.map || !this.currentEclipse) return;
        
        console.log('>>> AGGIUNGO MARKERS PATH <<<');
        
        // Se abbiamo path dal database, usa quello
        if (this.currentEclipse.path && this.currentEclipse.path.length > 0) {
            const path = this.currentEclipse.path;
            
            // Marker inizio path (primo punto)
            const start = path[0];
            const startMarker = L.circleMarker([start.lat, start.lon], {
                radius: 8,
                fillColor: '#00ff00',
                color: '#ffffff',
                weight: 3,
                opacity: 1,
                fillOpacity: 0.9
            }).addTo(this.map);
            
            startMarker.bindPopup(`
                <strong>🌑 Inizio Totalità</strong><br>
                ${start.location || 'Primo punto'}<br>
                Durata: ${start.duration}s
            `);
            
            // Marker fine path (ultimo punto)
            const end = path[path.length - 1];
            const endMarker = L.circleMarker([end.lat, end.lon], {
                radius: 8,
                fillColor: '#ff0000',
                color: '#ffffff',
                weight: 3,
                opacity: 1,
                fillOpacity: 0.9
            }).addTo(this.map);
            
            endMarker.bindPopup(`
                <strong>🌑 Fine Totalità</strong><br>
                ${end.location || 'Ultimo punto'}<br>
                Durata: ${end.duration}s
            `);
            
            // Marker punto massima durata
            const maxPoint = path.reduce((max, p) => 
                p.duration > max.duration ? p : max, path[0]
            );
            
            const maxMarker = L.circleMarker([maxPoint.lat, maxPoint.lon], {
                radius: 10,
                fillColor: '#ffff00',
                color: '#ff6600',
                weight: 3,
                opacity: 1,
                fillOpacity: 0.9
            }).addTo(this.map);
            
            maxMarker.bindPopup(`
                <strong>⭐ Massima Durata</strong><br>
                ${maxPoint.location || 'Punto ottimale'}<br>
                <strong>Durata: ${maxPoint.duration}s</strong><br>
                (${Math.floor(maxPoint.duration / 60)}m ${maxPoint.duration % 60}s)
            `);
            
            console.log('✅ Markers path aggiunti');
            
        } else {
            console.log('⚠️ Path non disponibile, uso contatti temporali');
            
            // Fallback: usa calcolo subsolar per contatti temporali
            if (!this.currentEclipse.c1 || !this.currentEclipse.c2 || 
                !this.currentEclipse.c3 || !this.currentEclipse.c4) {
                return;
            }
            
            const contacts = [
                {time: this.currentEclipse.c1, label: 'C1', color: 'orange'},
                {time: this.currentEclipse.c2, label: 'C2', color: 'red'},
                {time: this.currentEclipse.c3, label: 'C3', color: 'red'},
                {time: this.currentEclipse.c4, label: 'C4', color: 'orange'}
            ];
            
            contacts.forEach(contact => {
                const time = new Date(contact.time);
                const lat = this.calculateSubsolarLatitude(time);
                const lon = this.calculateSubsolarLongitude(time);
                
                const marker = L.circleMarker([lat, lon], {
                    radius: 6,
                    fillColor: contact.color,
                    color: 'white',
                    weight: 2,
                    opacity: 1,
                    fillOpacity: 0.8
                }).addTo(this.map);
                
                marker.bindPopup(`<strong>${contact.label}</strong><br>${time.toLocaleString('it-IT')}`);
            });
        }
    }
    
    /**
     * Avvia tracking real-time
     */
    startRealTimeTracking() {
        // Stop timer esistente
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        // Update immediato
        this.updateCurrentPosition();
        
        // Update ogni 10 secondi
        this.updateInterval = setInterval(() => {
            this.updateCurrentPosition();
        }, 10000);
        
        Utils.log('✅ Real-time solar tracking avviato');
    }
    
    /**
     * Aggiorna posizione sole corrente
     */
    updateCurrentPosition() {
        const now = new Date();
        
        // SEMPRE aggiorna l'ora locale
        const timeEl = document.getElementById('currentSolarTime');
        if (timeEl) timeEl.textContent = now.toLocaleTimeString('it-IT');
        
        // Determina la location da usare per i calcoli
        let calcLat, calcLon;
        
        if (this.currentLocation && this.currentLocation.lat !== undefined) {
            // Usa location utente se disponibile
            calcLat = this.currentLocation.lat;
            calcLon = this.currentLocation.lon;
        } else if (this.currentEclipse && this.currentEclipse.path && this.currentEclipse.path.length > 0) {
            // Altrimenti usa punto centrale del path eclissi
            const midIndex = Math.floor(this.currentEclipse.path.length / 2);
            calcLat = this.currentEclipse.path[midIndex].lat;
            calcLon = this.currentEclipse.path[midIndex].lon;
        } else if (this.currentEclipse && this.currentEclipse.greatestEclipse) {
            // Oppure usa punto di massima eclisse
            calcLat = this.currentEclipse.greatestEclipse.lat;
            calcLon = this.currentEclipse.greatestEclipse.lon;
        } else {
            // Default: usa Greenwich
            calcLat = 51.48;
            calcLon = 0;
        }
        
        // Calcola posizione sole per la location
        try {
            const sunPos = astronomyCalc.calculateSunPosition(now, calcLat, calcLon);
            
            // Update UI info
            const altEl = document.getElementById('currentSolarAltitude');
            const azEl = document.getElementById('currentSolarAzimuth');
            
            if (altEl) altEl.textContent = `${sunPos.altitude.toFixed(1)}°`;
            if (azEl) azEl.textContent = `${sunPos.azimuth.toFixed(1)}°`;
        } catch (err) {
            console.warn('Errore calcolo posizione sole:', err);
        }
        
        // Se non c'è mappa, fermati qui
        if (!this.map) return;
        
        // Verifica se siamo durante l'eclisse
        const isEclipseDay = this.isEclipseDay(now);
        
        let sunLat, sunLon;
        
        if (isEclipseDay && this.currentEclipse && this.currentEclipse.path && this.currentEclipse.path.length > 0) {
            console.log('☀️ Eclisse in corso! Sole lungo il path');
            
            // Calcola posizione lungo il path dell'eclisse
            const eclipseProgress = this.getEclipseProgress(now);
            const pathPosition = this.getPositionOnPath(eclipseProgress);
            
            sunLat = pathPosition.lat;
            sunLon = pathPosition.lon;
            
            console.log(`Sole al ${(eclipseProgress * 100).toFixed(1)}% del path`);
            console.log(`Posizione: ${sunLat.toFixed(2)}°, ${sunLon.toFixed(2)}°`);
            
        } else {
            // Calcola subsolar point normale
            sunLat = this.calculateSubsolarLatitude(now);
            sunLon = this.calculateSubsolarLongitude(now);
        }
        
        // Aggiorna marker sole sulla mappa
        this.updateSunMarker(sunLat, sunLon, now);
    }
    
    /**
     * Verifica se siamo nel giorno dell'eclisse
     */
    isEclipseDay(date) {
        if (!this.currentEclipse || !this.currentEclipse.c1) return false;
        
        const eclipseDate = new Date(this.currentEclipse.c1);
        
        return (
            date.getFullYear() === eclipseDate.getFullYear() &&
            date.getMonth() === eclipseDate.getMonth() &&
            date.getDate() === eclipseDate.getDate()
        );
    }
    
    /**
     * Calcola progresso eclisse (0.0 = C1, 1.0 = C4)
     */
    getEclipseProgress(now) {
        if (!this.currentEclipse) return 0;
        
        const c1Time = new Date(this.currentEclipse.c1).getTime();
        const c4Time = new Date(this.currentEclipse.c4).getTime();
        const nowTime = now.getTime();
        
        if (nowTime < c1Time) return 0;
        if (nowTime > c4Time) return 1;
        
        const progress = (nowTime - c1Time) / (c4Time - c1Time);
        return Math.max(0, Math.min(1, progress));
    }
    
    /**
     * Ottieni posizione sul path dato il progresso (0-1)
     */
    getPositionOnPath(progress) {
        if (!this.currentEclipse.path || this.currentEclipse.path.length === 0) {
            return {lat: 0, lon: 0};
        }
        
        const path = this.currentEclipse.path;
        
        // Calcola indice nel path
        const index = progress * (path.length - 1);
        const lowerIndex = Math.floor(index);
        const upperIndex = Math.ceil(index);
        
        // Se siamo esattamente su un punto
        if (lowerIndex === upperIndex) {
            return {
                lat: path[lowerIndex].lat,
                lon: path[lowerIndex].lon
            };
        }
        
        // Interpola tra due punti
        const t = index - lowerIndex;
        const lat = path[lowerIndex].lat + (path[upperIndex].lat - path[lowerIndex].lat) * t;
        const lon = path[lowerIndex].lon + (path[upperIndex].lon - path[lowerIndex].lon) * t;
        
        return {lat, lon};
    }
    
    /**
     * Aggiorna marker sole sulla mappa
     */
    updateSunMarker(lat, lon, time) {
        if (!this.map) return;
        
        // Rimuovi marker precedente
        if (this.sunMarker) {
            this.map.removeLayer(this.sunMarker);
        }
        
        // Crea icona sole personalizzata
        const sunIcon = L.divIcon({
            className: 'sun-marker',
            html: '<div style="background: radial-gradient(circle, #ffeb3b 0%, #ffc107 50%, #ff9800 100%); width: 30px; height: 30px; border-radius: 50%; border: 3px solid #ff6f00; box-shadow: 0 0 20px rgba(255,235,59,0.8); animation: pulse 2s infinite;"></div>',
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        
        // Aggiungi marker sole
        this.sunMarker = L.marker([lat, lon], {icon: sunIcon}).addTo(this.map);
        
        // Popup con info
        const popup = `
            <div style="text-align: center;">
                <strong>☀️ Posizione Sole</strong><br>
                <small>${time.toLocaleString('it-IT')}</small><br>
                Lat: ${lat.toFixed(2)}°<br>
                Lon: ${lon.toFixed(2)}°
            </div>
        `;
        this.sunMarker.bindPopup(popup);
    }
    
    /**
     * Stop tracking
     */
    stop() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
        
        if (this.basicTrackingInterval) {
            clearInterval(this.basicTrackingInterval);
            this.basicTrackingInterval = null;
        }
        
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        
        Utils.log('Solar tracking fermato');
    }
}

// Istanza globale
const solarTracker = new SolarTracker();

// Export globale
if (typeof window !== 'undefined') {
    window.solarTracker = solarTracker;
}

// CSS per animazione pulse
if (typeof document !== 'undefined') {
    const style = document.createElement('style');
    style.textContent = `
        @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
        }
        .sun-marker {
            background: none !important;
            border: none !important;
        }
    `;
    document.head.appendChild(style);
}
