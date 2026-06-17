/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export class AudioEngine {
  private ctx: AudioContext | null = null;
  public analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array = new Uint8Array(0);
  private isSynthesizing = false;
  private synthInterval: any = null;
  private currentStep = 0;
  private activeUploadSource: AudioBufferSourceNode | null = null;
  private uploadedBuffer: AudioBuffer | null = null;
  private isUploadedPlaying = false;
  private uploadedStartTime = 0;
  private uploadedOffset = 0;

  // Synthesizer variables
  private bpm = 120;
  private synthNodes: AudioNode[] = [];

  constructor() {
    // Lazy setup on user gesture to meet browser policy
  }

  public init() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 256;
      this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    } catch (e) {
      console.error("Web Audio API not supported", e);
    }
  }

  public getContext(): AudioContext | null {
    return this.ctx;
  }

  public resumeContextIfNeeded() {
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public getAnalyserData(): Uint8Array {
    if (this.analyser && this.dataArray.length > 0) {
      this.analyser.getByteFrequencyData(this.dataArray);
      return this.dataArray;
    }
    // Return mock static noise if context isn't running or is silent
    const mock = new Uint8Array(64);
    for (let i = 0; i < mock.length; i++) {
      mock[i] = Math.random() * 10;
    }
    return mock;
  }

  // File Upload Player
  public async loadUploadedFile(file: File): Promise<AudioBuffer> {
    this.init();
    if (!this.ctx) throw new Error("AudioContext failed to initialize.");
    
    const arrayBuffer = await file.arrayBuffer();
    // Decode audio
    const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
    this.uploadedBuffer = audioBuffer;
    this.uploadedOffset = 0;
    this.stop();
    return audioBuffer;
  }

  public playUploaded(offset: number = 0, onEnded: () => void) {
    this.init();
    if (!this.ctx || !this.uploadedBuffer || !this.analyser) return;

    this.resumeContextIfNeeded();
    this.stopActiveUploadSource();

    const source = this.ctx.createBufferSource();
    source.buffer = this.uploadedBuffer;
    
    // Connect to analyser and then destination
    source.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    this.uploadedStartTime = this.ctx.currentTime;
    this.uploadedOffset = offset;
    
    source.start(0, offset);
    source.onended = () => {
      // Check if it ended naturally
      if (this.isUploadedPlaying && this.ctx && (this.ctx.currentTime - this.uploadedStartTime >= this.uploadedBuffer!.duration - parseFloat(offset.toFixed(2)))) {
        this.isUploadedPlaying = false;
        onEnded();
      }
    };

    this.activeUploadSource = source;
    this.isUploadedPlaying = true;
  }

  public pauseUploaded() {
    if (!this.ctx || !this.isUploadedPlaying || !this.uploadedBuffer) return;
    this.uploadedOffset += this.ctx.currentTime - this.uploadedStartTime;
    this.stopActiveUploadSource();
    this.isUploadedPlaying = false;
  }

  private stopActiveUploadSource() {
    if (this.activeUploadSource) {
      try {
        this.activeUploadSource.disconnect();
        this.activeUploadSource.stop();
      } catch (e) {
        // Already stopped
      }
      this.activeUploadSource = null;
    }
  }

  public getUploadedPlayProgress(): number {
    if (!this.isUploadedPlaying || !this.ctx || !this.uploadedBuffer) {
      return this.uploadedOffset;
    }
    const current = this.uploadedOffset + (this.ctx.currentTime - this.uploadedStartTime);
    return Math.min(current, this.uploadedBuffer.duration);
  }

  // Synthesizer Beat Generator
  public startSynth() {
    this.init();
    if (!this.ctx || !this.analyser || this.isSynthesizing) return;
    this.resumeContextIfNeeded();
    this.isSynthesizing = true;
    this.currentStep = 0;

    const stepDuration = 60 / this.bpm / 2; // Eighth notes
    this.synthInterval = setInterval(() => {
      if (this.ctx && this.isSynthesizing) {
        this.triggerSynthStep(this.ctx.currentTime);
        this.currentStep = (this.currentStep + 1) % 16;
      }
    }, stepDuration * 1000);
  }

  public stopSynth() {
    this.isSynthesizing = false;
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
    // Disconnect active notes
    this.synthNodes.forEach(node => {
      try { node.disconnect(); } catch (e) {}
    });
    this.synthNodes = [];
  }

  public stop() {
    this.stopSynth();
    this.stopActiveUploadSource();
    this.isUploadedPlaying = false;
  }

  private triggerSynthStep(time: number) {
    if (!this.ctx || !this.analyser) return;

    const step = this.currentStep;

    // Beats Layout (Kick on 0, 4, 8, 12, Hihat on odd, Bass trigger)
    if (step % 4 === 0) {
      this.playKick(time);
    }

    if (step % 2 === 1) {
      this.playHiHat(time);
    }

    // Melodic pulse
    const notes = [110, 130.81, 146.83, 164.81, 196.00, 220, 261.63, 293.66]; // G2, C3, D3, E3, G3, A3, C4, D4
    const note = notes[step % notes.length];
    
    if (step % 4 !== 1) {
      this.playSynthBass(time, note);
    }

    // Lead retro arpeggio
    if (step % 8 === 0 || step % 8 === 3 || step % 8 === 6) {
      const melodyNotes = [440, 523.25, 587.33, 659.25, 783.99, 880]; // A4 to A5 pentatonic
      const melodyNote = melodyNotes[(step * 3) % melodyNotes.length];
      this.playLeadSynth(time, melodyNote);
    }
  }

  private playKick(time: number) {
    if (!this.ctx || !this.analyser) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);

    gain.gain.setValueAtTime(0.8, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.15);

    osc.connect(gain);
    gain.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);

    osc.start(time);
    osc.stop(time + 0.16);

    this.synthNodes.push(osc);
  }

  private playHiHat(time: number) {
    if (!this.ctx || !this.analyser) return;

    // Clean white-noise formulation for hi-hats
    const bufferSize = this.ctx.sampleRate * 0.04;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(7000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.25, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.04);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.analyser);

    noise.start(time);
    noise.stop(time + 0.05);

    this.synthNodes.push(noise);
  }

  private playSynthBass(time: number, freq: number) {
    if (!this.ctx || !this.analyser) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, time);

    gain.gain.setValueAtTime(0.4, time);
    gain.gain.linearRampToValueAtTime(0.1, time + 0.15);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.22);

    osc.connect(gain);
    gain.connect(this.analyser);

    osc.start(time);
    osc.stop(time + 0.24);

    this.synthNodes.push(osc);
  }

  private playLeadSynth(time: number, freq: number) {
    if (!this.ctx || !this.analyser) return;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc1.type = "sawtooth";
    osc1.frequency.setValueAtTime(freq - 3, time);

    osc2.type = "sine";
    osc2.frequency.setValueAtTime(freq + 3, time);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2000, time);
    filter.frequency.exponentialRampToValueAtTime(500, time + 0.2);

    gain.gain.setValueAtTime(0.15, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.35);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.analyser);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + 0.38);
    osc2.stop(time + 0.38);

    this.synthNodes.push(osc1);
    this.synthNodes.push(osc2);
  }
}
export const globalAudioEngine = new AudioEngine();
