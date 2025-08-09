/**
 * Audio Feature Extractor for Voice Pattern Analysis
 * Extracts voice characteristics for anonymous patient fingerprinting
 * WITHOUT storing any identifiable information
 */

export interface AudioFeatures {
  frequencies: number[];
  amplitudes: number[];
  duration: number;
  silences: number[];
}

export class AudioFeatureExtractor {
  private audioContext: AudioContext;
  private analyser: AnalyserNode;

  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.analyser = this.audioContext.createAnalyser();
    this.analyser.fftSize = 2048;
  }

  /**
   * Extract voice features from an audio blob
   * Returns anonymized frequency and amplitude patterns
   */
  async extractFeatures(audioBlob: Blob): Promise<AudioFeatures> {
    try {
      // Convert blob to array buffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      // Get audio duration
      const duration = audioBuffer.duration;
      
      // Create offline context for processing
      const offlineContext = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        audioBuffer.length,
        audioBuffer.sampleRate
      );
      
      // Create source and analyser
      const source = offlineContext.createBufferSource();
      source.buffer = audioBuffer;
      
      const offlineAnalyser = offlineContext.createAnalyser();
      offlineAnalyser.fftSize = 2048;
      source.connect(offlineAnalyser);
      offlineAnalyser.connect(offlineContext.destination);
      
      // Start processing
      source.start();
      const renderedBuffer = await offlineContext.startRendering();
      
      // Extract frequency data
      const frequencies = this.extractFrequencies(audioBuffer);
      const amplitudes = this.extractAmplitudes(audioBuffer);
      const silences = this.detectSilences(audioBuffer);
      
      return {
        frequencies,
        amplitudes,
        duration,
        silences
      };
    } catch (error) {
      console.error('Error extracting audio features:', error);
      throw error;
    }
  }

  /**
   * Extract dominant frequencies from audio buffer
   * Used to create voice pitch pattern
   */
  private extractFrequencies(audioBuffer: AudioBuffer): number[] {
    const channelData = audioBuffer.getChannelData(0);
    const sampleRate = audioBuffer.sampleRate;
    const frequencies: number[] = [];
    
    // Sample every second
    const samplesPerSecond = sampleRate;
    const numSamples = Math.floor(audioBuffer.duration);
    
    for (let i = 0; i < numSamples; i++) {
      const start = i * samplesPerSecond;
      const end = Math.min(start + samplesPerSecond, channelData.length);
      const segment = channelData.slice(start, end);
      
      // Perform FFT to get frequency
      const frequency = this.getDominantFrequency(segment, sampleRate);
      if (frequency > 0) {
        frequencies.push(frequency);
      }
    }
    
    // Normalize to 100 samples for consistent fingerprinting
    return this.normalizeToLength(frequencies, 100);
  }

  /**
   * Extract amplitude patterns from audio buffer
   * Used to create speech rhythm pattern
   */
  private extractAmplitudes(audioBuffer: AudioBuffer): number[] {
    const channelData = audioBuffer.getChannelData(0);
    const amplitudes: number[] = [];
    
    // Sample amplitude every 100ms
    const sampleRate = audioBuffer.sampleRate;
    const samplesPerInterval = Math.floor(sampleRate / 10); // 100ms intervals
    
    for (let i = 0; i < channelData.length; i += samplesPerInterval) {
      const end = Math.min(i + samplesPerInterval, channelData.length);
      const segment = channelData.slice(i, end);
      
      // Calculate RMS amplitude
      let sum = 0;
      for (let j = 0; j < segment.length; j++) {
        sum += segment[j] * segment[j];
      }
      const rms = Math.sqrt(sum / segment.length);
      amplitudes.push(rms);
    }
    
    // Normalize to 100 samples
    return this.normalizeToLength(amplitudes, 100);
  }

  /**
   * Detect silence periods in audio
   * Used to analyze speech patterns and pauses
   */
  private detectSilences(audioBuffer: AudioBuffer): number[] {
    const channelData = audioBuffer.getChannelData(0);
    const silences: number[] = [];
    const threshold = 0.01; // Silence threshold
    
    let silenceStart = -1;
    const sampleRate = audioBuffer.sampleRate;
    
    for (let i = 0; i < channelData.length; i++) {
      const amplitude = Math.abs(channelData[i]);
      
      if (amplitude < threshold) {
        if (silenceStart === -1) {
          silenceStart = i;
        }
      } else {
        if (silenceStart !== -1) {
          const silenceDuration = (i - silenceStart) / sampleRate;
          if (silenceDuration > 0.1) { // Only count silences > 100ms
            silences.push(silenceDuration);
          }
          silenceStart = -1;
        }
      }
    }
    
    return silences;
  }

  /**
   * Get dominant frequency using autocorrelation
   * Returns frequency in Hz
   */
  private getDominantFrequency(segment: Float32Array, sampleRate: number): number {
    // Simple zero-crossing rate method for pitch detection
    let zeroCrossings = 0;
    
    for (let i = 1; i < segment.length; i++) {
      if ((segment[i] >= 0) !== (segment[i - 1] >= 0)) {
        zeroCrossings++;
      }
    }
    
    // Convert zero crossings to frequency
    const frequency = (zeroCrossings * sampleRate) / (2 * segment.length);
    
    // Filter out non-voice frequencies (typical voice is 85-255 Hz for men, 165-255 Hz for women)
    if (frequency >= 85 && frequency <= 400) {
      return frequency;
    }
    
    return 0;
  }

  /**
   * Normalize array to specific length
   * Used to create consistent-length patterns
   */
  private normalizeToLength(array: number[], targetLength: number): number[] {
    if (array.length === targetLength) {
      return array;
    }
    
    const result: number[] = [];
    const ratio = array.length / targetLength;
    
    for (let i = 0; i < targetLength; i++) {
      const sourceIndex = Math.floor(i * ratio);
      result.push(array[Math.min(sourceIndex, array.length - 1)]);
    }
    
    return result;
  }

  /**
   * Clean up audio context
   */
  dispose() {
    if (this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}