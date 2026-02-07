/**
 * EXPOSURE OPTIMIZER MODULE v2.0
 * Calcolo fotometrico avanzato per eclissi e fotografia solare
 * 
 * Modello basato sulla tabella di Fred Espenak (NASA/GSFC)
 * con scaling per f/ratio, sensibilità sensore (ISO/Gain) e QE.
 *
 * REFERENCE SETUP: f/10, ISO 100 (DSLR) 
 * Le esposizioni di riferimento vengono scalate per l'equipment reale.
 *
 * Formula: t_actual = t_ref × (f_actual / f_ref)² × (ISO_ref / ISO_actual)
 * Per CMOS: ISO equivalente calcolato dal gain e unity gain della camera
 */

class ExposureOptimizer {

    constructor() {
        // Setup di riferimento (base Espenak/Xavier Jubier)
        this.REF_FRATIO = 10;
        this.REF_ISO = 100;

        /**
         * Tabella esposizioni di riferimento per f/10, ISO 100
         * Ogni fase ha un range di esposizioni in secondi pensato per catturare
         * la luminosità superficiale di quella feature dell'eclissi.
         * 
         * I valori sono derivati dalla Fred Espenak Exposure Guide:
         * https://www.mreclipse.com/SEphoto/image/SE-Exposure2.GIF
         * e dall'esperienza pratica di Xavier Jubier.
         */
        this.REFERENCE_EXPOSURES = {
            // Parziale con filtro ND5 (densità 5 = 100,000x riduzione)
            'partial': {
                bracket: [1/1000, 1/500, 1/250],
                description: 'Fase parziale con filtro solare ND5',
                notes: 'Filtro OBBLIGATORIO! Esposizioni corte per granulazione'
            },
            // Perle di Baily - transizione rapidissima, luminosità estrema
            'baily': {
                bracket: [1/4000, 1/2000, 1/1000, 1/500],
                description: 'Perle di Baily - transizione C2/C3',
                notes: 'Scatti rapidi, fenomeno dura 1-2 secondi'
            },
            // Cromosfera - strato rosso molto luminoso
            'chromosphere': {
                bracket: [1/2000, 1/1000, 1/500, 1/250],
                description: 'Cromosfera - strato rosso sottile',
                notes: 'Visibile solo per pochi secondi dopo C2 e prima C3'
            },
            // Protuberanze - strutture rosse, luminose ma meno della cromosfera
            'prominences': {
                bracket: [1/500, 1/250, 1/125, 1/60],
                description: 'Protuberanze solari',
                notes: 'Strutture rosse ai bordi, simili a cromosfera ma più deboli'
            },
            // Corona interna - alone brillante vicino al bordo solare (~1.1-1.5 R☉)
            'inner-corona': {
                bracket: [1/1000, 1/500, 1/250, 1/125, 1/60, 1/30],
                description: 'Corona interna brillante',
                notes: 'Strutture fini vicine al bordo, buona per HDR'
            },
            // Corona media - strutture e streamer (~1.5-3 R☉)  
            'mid-corona': {
                bracket: [1/60, 1/30, 1/15, 1/8, 1/4, 1/2],
                description: 'Corona media - strutture coronali',
                notes: 'Streamer e strutture a media distanza dal bordo'
            },
            // Corona esterna - estensioni deboli (>3 R☉)
            'outer-corona': {
                bracket: [1/4, 1/2, 1, 2, 4],
                description: 'Corona esterna - streamer lontani',
                notes: 'Esposizioni lunghe, attenzione al trailing'
            },
            // Totalità generica - range completo per chi vuole un solo bracketing
            'totality': {
                bracket: [1/2000, 1/1000, 1/500, 1/250, 1/125, 1/60, 1/30, 1/15, 1/8, 1/4, 1/2, 1, 2, 4],
                description: 'Totalità - range completo',
                notes: 'HDR completo dalla cromosfera alla corona esterna'
            }
        };

        /**
         * Standard shutter speeds (valori reali delle camere)
         * Usati per arrotondare le esposizioni calcolate a valori realistici
         */
        this.STANDARD_SHUTTERS = [
            1/8000, 1/6400, 1/5000, 1/4000, 1/3200, 1/2500, 1/2000, 1/1600,
            1/1250, 1/1000, 1/800, 1/640, 1/500, 1/400, 1/320, 1/250,
            1/200, 1/160, 1/125, 1/100, 1/80, 1/60, 1/50, 1/40,
            1/30, 1/25, 1/20, 1/15, 1/13, 1/10, 1/8, 1/6,
            1/5, 1/4, 0.3, 0.4, 1/2, 0.6, 0.8, 1,
            1.3, 1.6, 2, 2.5, 3.2, 4, 5, 6,
            8, 10, 13, 15, 20, 25, 30
        ];
    }

    // ================================================================
    //  METODO PRINCIPALE: Calcola esposizioni ottimizzate per una fase
    // ================================================================

    /**
     * Calcola esposizioni ottimizzate per una fase dell'eclissi.
     * 
     * @param {string} phase - Fase eclissi
     * @param {Object} equipment - Oggetto equipment da equipmentPanel.getCurrentEquipment()
     * @param {Object} params - Parametri aggiuntivi (iso, gain, offset, etc.)
     * @returns {Array<number>} Array di esposizioni in secondi, scalate e arrotondate
     */
    getOptimizedExposures(phase, equipment, params) {
        params = params || {};
        
        // Se non c'è equipment, ritorna esposizioni di default
        if (!equipment || !equipment.telescope || !equipment.camera) {
            Utils.log('⚠️ Equipment non disponibile, uso esposizioni default', 'warn');
            return this.getDefaultExposures(phase);
        }

        // 1. Recupera esposizioni di riferimento per la fase
        var refData = this.REFERENCE_EXPOSURES[phase];
        if (!refData) {
            Utils.log('⚠️ Fase "' + phase + '" non riconosciuta, uso totality', 'warn');
            return this.getDefaultExposures('totality');
        }

        var refExposures = refData.bracket;

        // 2. Calcola fattore di scala
        var scaleFactor = this.calculateScaleFactor(equipment, params);

        Utils.log('📐 Scala esposizioni per "' + phase + '": fattore = ' + scaleFactor.total.toFixed(3) +
            ' (f/ratio: ×' + scaleFactor.fRatio.toFixed(2) +
            ', sensibilità: ×' + scaleFactor.sensitivity.toFixed(2) + ')');

        // 3. Applica scala e arrotonda a shutter speeds standard
        var optimized = [];
        for (var i = 0; i < refExposures.length; i++) {
            var scaled = refExposures[i] * scaleFactor.total;
            optimized.push(this.snapToStandardShutter(scaled));
        }

        // 4. Rimuovi duplicati (dopo arrotondamento possono coincidere)
        var unique = [];
        for (var j = 0; j < optimized.length; j++) {
            if (unique.indexOf(optimized[j]) === -1) {
                unique.push(optimized[j]);
            }
        }

        // 5. Ordina dal più corto al più lungo
        unique.sort(function(a, b) { return a - b; });

        // 6. Limita esposizioni per trailing (focale lunga = max exposure minore)
        var maxExposure = this.calculateMaxExposure(equipment);
        var limited = [];
        for (var k = 0; k < unique.length; k++) {
            if (unique[k] <= maxExposure || phase === 'outer-corona') {
                limited.push(unique[k]);
            }
        }

        // Se abbiamo filtrato troppo, prendi almeno le prime 3
        if (limited.length < 2 && unique.length >= 2) {
            return unique.slice(0, Math.min(unique.length, 3));
        }

        var result = limited.length > 0 ? limited : unique;
        
        Utils.log('✅ Esposizioni "' + phase + '": [' + 
            result.map(function(e) { return exposureOptimizer.formatExposure(e); }).join(', ') + ']');

        return result;
    }

    // ================================================================
    //  CALCOLO FATTORE DI SCALA
    // ================================================================

    /**
     * Calcola il fattore di scala combinato rispetto al setup di riferimento.
     * 
     * Formula: scaleFactor = (f_actual/f_ref)² × (ISO_ref/ISO_actual)
     */
    calculateScaleFactor(equipment, params) {
        params = params || {};
        var fRatio = parseFloat(equipment.telescope.fRatio) || this.REF_FRATIO;

        // Fattore f/ratio: proporzionale al quadrato
        var fRatioFactor = Math.pow(fRatio / this.REF_FRATIO, 2);

        // Fattore sensibilità
        var effectiveISO = this.getEffectiveISO(equipment.camera, params);
        var sensitivityFactor = this.REF_ISO / effectiveISO;

        return {
            fRatio: fRatioFactor,
            sensitivity: sensitivityFactor,
            total: fRatioFactor * sensitivityFactor,
            effectiveISO: effectiveISO,
            actualFRatio: fRatio
        };
    }

    /**
     * Converte i parametri della camera in un ISO equivalente.
     * 
     * Per DSLR: usa direttamente il valore ISO impostato.
     * Per CMOS astronomiche: converte gain in ISO equivalente usando il unity gain.
     */
    getEffectiveISO(camera, params) {
        params = params || {};
        var cameraType = (camera.type || '').toLowerCase();

        if (cameraType === 'dslr') {
            return params.iso || 400;

        } else if (cameraType === 'cmos') {
            var gain = params.gain !== undefined ? params.gain : (camera.unityGain || 120);
            var unityGain = camera.unityGain || 120;

            var isBSI = this.isBSISensor(camera);
            var isoAtUnity = isBSI ? 800 : 400;

            var gainPerStop = this.getGainPerStop(camera);
            var stopsFromUnity = (gain - unityGain) / gainPerStop;
            var effectiveISO = isoAtUnity * Math.pow(2, stopsFromUnity);

            return Math.max(50, Math.min(25600, effectiveISO));

        } else {
            // Camera custom
            return params.iso || (params.gain ? this.gainToISOApprox(params.gain) : 400);
        }
    }

    /**
     * Determina se un sensore è BSI (Back-Side Illuminated)
     */
    isBSISensor(camera) {
        var sensor = (camera.sensor || '').toUpperCase();
        var bsiSensors = [
            'IMX294', 'IMX571', 'IMX455', 'IMX410', 'IMX533',
            'IMX585', 'IMX678', 'IMX662', 'IMX482', 'IMX464',
            'IMX290', 'IMX291', 'IMX185', 'IMX178', 'IMX183',
            'IMX432', 'IMX472'
        ];
        for (var i = 0; i < bsiSensors.length; i++) {
            if (sensor.indexOf(bsiSensors[i]) >= 0) return true;
        }
        return false;
    }

    /**
     * Gain per stop tipico per manufacturer
     */
    getGainPerStop(camera) {
        var manufacturer = (camera.manufacturer || '').toLowerCase();
        if (manufacturer.indexOf('zwo') >= 0 || manufacturer.indexOf('asi') >= 0) {
            return 33;
        }
        if (manufacturer.indexOf('qhy') >= 0) {
            return 25;
        }
        return 30;
    }

    /**
     * Approssimazione gain → ISO per camere non categorizzate
     */
    gainToISOApprox(gain) {
        return 100 * Math.pow(2, gain / 40);
    }

    // ================================================================
    //  TRAILING & LIMITI ESPOSIZIONE
    // ================================================================

    /**
     * Calcola esposizione massima prima che il trailing sia visibile (>1 pixel)
     */
    calculateMaxExposure(equipment) {
        if (!equipment || !equipment.telescope || !equipment.camera) {
            return 4;
        }

        var focalLength = parseFloat(equipment.telescope.focalLength) || 600;
        var pixelSize = parseFloat(equipment.camera.pixelSize) || 4;

        // Image scale in arcsec/pixel
        var imageScale = (pixelSize / focalLength) * 206.265;

        // Tracking residuo tipico: ~1 arcsec/s
        var trackingResidual = 1;
        var maxExpTracking = imageScale / trackingResidual;

        return Math.min(30, maxExpTracking);
    }

    // ================================================================
    //  ARROTONDAMENTO A SHUTTER STANDARD
    // ================================================================

    /**
     * Arrotonda un'esposizione calcolata al valore standard più vicino
     */
    snapToStandardShutter(seconds) {
        if (seconds <= 0) return 1/4000;

        var closest = this.STANDARD_SHUTTERS[0];
        var minDiff = Math.abs(Math.log(seconds) / Math.LN2 - Math.log(closest) / Math.LN2);

        for (var i = 0; i < this.STANDARD_SHUTTERS.length; i++) {
            var shutter = this.STANDARD_SHUTTERS[i];
            var diff = Math.abs(Math.log(seconds) / Math.LN2 - Math.log(shutter) / Math.LN2);
            if (diff < minDiff) {
                minDiff = diff;
                closest = shutter;
            }
        }

        return closest;
    }

    // ================================================================
    //  FORMATTAZIONE
    // ================================================================

    /**
     * Formatta un'esposizione in secondi come stringa leggibile
     */
    formatExposure(seconds, cameraType) {
        if (seconds >= 1) {
            if (seconds === Math.floor(seconds)) {
                return seconds + 's';
            }
            return seconds.toFixed(1) + 's';
        }

        var denominator = Math.round(1 / seconds);

        if (cameraType === 'cmos') {
            if (seconds >= 0.01) {
                return seconds.toFixed(3) + 's';
            }
            return (seconds * 1000).toFixed(1) + 'ms';
        }

        // DSLR: mostra come frazione
        return '1/' + denominator;
    }

    /**
     * Formatta per display UI
     */
    formatForUI(seconds, cameraType) {
        return this.formatExposure(seconds, cameraType || 'dslr');
    }

    /**
     * Formatta array di esposizioni
     */
    formatExposureArray(exposures, cameraType) {
        var self = this;
        return exposures.map(function(exp) { 
            return self.formatExposure(exp, cameraType); 
        });
    }

    // ================================================================
    //  ESPOSIZIONI DEFAULT (fallback senza equipment)
    // ================================================================

    getDefaultExposures(phase) {
        var defaults = {
            'partial':       [1/4000, 1/2000, 1/1000],
            'baily':         [1/4000, 1/2000, 1/1000, 1/500],
            'chromosphere':  [1/2000, 1/1000, 1/500, 1/250],
            'prominences':   [1/1000, 1/500, 1/250, 1/125, 1/60],
            'inner-corona':  [1/1000, 1/500, 1/250, 1/125, 1/60, 1/30],
            'mid-corona':    [1/60, 1/30, 1/15, 1/8, 1/4, 1/2],
            'outer-corona':  [1/4, 1/2, 1, 2, 4],
            'totality':      [1/4000, 1/2000, 1/1000, 1/500, 1/250, 1/125, 1/60, 1/30, 1/15, 1/8, 1/4, 1/2, 1, 2]
        };

        return defaults[phase] || defaults['totality'];
    }

    // ================================================================
    //  REPORT COMPLETO
    // ================================================================

    generateFullReport(equipment, params) {
        params = params || {};
        var phases = [
            'partial', 'baily', 'chromosphere', 'prominences',
            'inner-corona', 'mid-corona', 'outer-corona'
        ];

        var scale = this.calculateScaleFactor(equipment, params);
        var cameraType = this.detectCameraType(equipment.camera);
        var maxExp = this.calculateMaxExposure(equipment);
        var self = this;

        var report = {
            equipment: {
                telescope: equipment.telescope.diameter + 'mm f/' + equipment.telescope.fRatio,
                focalLength: equipment.telescope.focalLength + 'mm',
                camera: equipment.camera.name,
                cameraType: cameraType,
                effectiveISO: Math.round(scale.effectiveISO),
                maxExposure: maxExp.toFixed(1) + 's'
            },
            scaleFactor: {
                fRatio: scale.fRatio.toFixed(3),
                sensitivity: scale.sensitivity.toFixed(3),
                total: scale.total.toFixed(3),
                description: self.describeScale(scale)
            },
            phases: {}
        };

        phases.forEach(function(phase) {
            var exposures = self.getOptimizedExposures(phase, equipment, params);
            var refData = self.REFERENCE_EXPOSURES[phase];

            report.phases[phase] = {
                name: refData.description,
                notes: refData.notes,
                exposures: exposures,
                exposuresFormatted: self.formatExposureArray(exposures, cameraType),
                count: exposures.length,
                rangeMin: self.formatExposure(Math.min.apply(null, exposures), cameraType),
                rangeMax: self.formatExposure(Math.max.apply(null, exposures), cameraType),
                totalTime: exposures.reduce(function(sum, e) { return sum + e; }, 0).toFixed(3) + 's'
            };
        });

        var totalSeriesTime = 0;
        Object.keys(report.phases).forEach(function(key) {
            var p = report.phases[key];
            totalSeriesTime += p.exposures.reduce(function(sum, e) { return sum + e; }, 0);
            totalSeriesTime += p.count * 0.5;
        });
        report.totalSeriesTime = totalSeriesTime.toFixed(1) + 's';

        return report;
    }

    describeScale(scale) {
        var desc = '';

        if (scale.fRatio < 0.5) {
            desc = 'Ottica molto veloce (f/' + scale.actualFRatio + ') → esposizioni molto più corte';
        } else if (scale.fRatio < 0.9) {
            desc = 'Ottica veloce (f/' + scale.actualFRatio + ') → esposizioni più corte';
        } else if (scale.fRatio <= 1.1) {
            desc = 'Ottica simile al riferimento (f/' + scale.actualFRatio + ')';
        } else if (scale.fRatio <= 2) {
            desc = 'Ottica moderata (f/' + scale.actualFRatio + ') → esposizioni più lunghe';
        } else {
            desc = 'Ottica lenta (f/' + scale.actualFRatio + ') → esposizioni significativamente più lunghe';
        }

        if (scale.sensitivity > 1.5) {
            desc += '. Sensibilità bassa → compensa con esposizioni più lunghe';
        } else if (scale.sensitivity < 0.5) {
            desc += '. Sensibilità alta → esposizioni più corte';
        }

        return desc;
    }

    detectCameraType(camera) {
        if (camera.type) {
            if (camera.type === 'dslr') return 'dslr';
            if (camera.type === 'cmos') return 'cmos';
        }
        var manufacturer = (camera.manufacturer || '').toLowerCase();
        if (manufacturer.indexOf('canon') >= 0 || manufacturer.indexOf('nikon') >= 0 || manufacturer.indexOf('sony') >= 0) {
            return 'dslr';
        }
        return camera.cooling ? 'cmos' : 'dslr';
    }

    // ================================================================
    //  LEGACY API (compatibilità)
    // ================================================================

    optimizeEclipseSequences(telescope, camera, totalityDuration) {
        if (!telescope || !camera) {
            return this.getDefaultEclipseSequences();
        }

        var equipment = {
            telescope: {
                diameter: telescope.diameter,
                focalLength: telescope.focalLength,
                fRatio: telescope.fRatio || (telescope.focalLength / telescope.diameter)
            },
            camera: camera
        };

        var phases = ['chromosphere', 'inner-corona', 'mid-corona', 'outer-corona', 'prominences'];
        var optimized = {};
        var self = this;

        phases.forEach(function(phase) {
            var exposures = self.getOptimizedExposures(phase, equipment);
            var refData = self.REFERENCE_EXPOSURES[phase];
            optimized[phase.replace('-', '')] = {
                name: refData.description,
                exposures: exposures.map(function(e) { return e * 1000; }),
                count: exposures.length,
                description: refData.notes
            };
        });

        optimized.totalFrames = 0;
        Object.keys(optimized).forEach(function(key) {
            optimized.totalFrames += optimized[key].count || 0;
        });

        return optimized;
    }

    getDefaultEclipseSequences() {
        return {
            chromosphere: { name: 'Cromosfera', exposures: [0.5, 1, 2, 4, 8], count: 5 },
            innercorona: { name: 'Corona Interna', exposures: [4, 8, 16, 32, 63], count: 5 },
            midcorona: { name: 'Corona Media', exposures: [63, 125, 250, 500, 1000], count: 5 },
            outercorona: { name: 'Corona Esterna', exposures: [1000, 2000, 4000, 8000], count: 4 },
            prominence: { name: 'Protuberanze', exposures: [1, 2, 4], count: 3 },
            note: 'Sequenze default - configura equipment per ottimizzazione'
        };
    }

    optimizeSolarExposure(telescope, camera, filterType) {
        filterType = filterType || 'nd5';
        if (!telescope || !camera) {
            return this.getDefaultSolarExposure();
        }

        var equipment = {
            telescope: {
                diameter: telescope.diameter,
                focalLength: telescope.focalLength,
                fRatio: telescope.fRatio || (telescope.focalLength / telescope.diameter)
            },
            camera: camera
        };

        var exposures = this.getOptimizedExposures('partial', equipment);

        return {
            filterType: filterType,
            exposure: {
                optimal: exposures[Math.floor(exposures.length / 2)],
                min: Math.min.apply(null, exposures),
                max: Math.max.apply(null, exposures),
                unit: 's'
            },
            camera: camera.type === 'cmos' ? {
                gain: camera.unityGain || 120,
                offset: 10,
                binning: 1
            } : {
                iso: 400,
                quality: 'RAW'
            }
        };
    }

    getDefaultSolarExposure() {
        return {
            filterType: 'nd5',
            exposure: { optimal: 1/1000, min: 1/4000, max: 1/250, unit: 's' },
            camera: { gain: 120, iso: 400 },
            note: 'Parametri default - configura equipment per ottimizzazione'
        };
    }

    /**
     * Arrotonda esposizione a valori standard (LEGACY - ms)
     */
    roundExposure(ms) {
        return this.snapToStandardShutter(ms / 1000) * 1000;
    }
}

// Export singleton
var exposureOptimizer = new ExposureOptimizer();
