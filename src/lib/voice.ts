/**
 * Voice & Audio utilities for FluentEdge AI Tutor (Ask Akib Sir).
 * 1. Speech Synthesis (TTS) with sentence chunking & Hindi/Indian English voice prioritization.
 * 2. MediaRecorder for microphone audio recording.
 * 3. Web Speech API for real-time live voice transcription.
 */

interface IWindowWithSpeech extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export function cleanTextForSpeech(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/#{1,6}\s+/g, '')
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/^\s*>\s+/gm, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function chunkTextIntoSentences(text: string): string[] {
  if (!text) return [];
  const clean = cleanTextForSpeech(text);
  const regex = /[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g;
  const matches = clean.match(regex);
  if (!matches) return [clean];
  return matches.map((s) => s.trim()).filter((s) => s.length > 0);
}

let activeUtterance: SpeechSynthesisUtterance | null = null;
let queue: string[] = [];
let queueIndex = 0;
let onDoneCallback: (() => void) | null = null;

function getPreferredVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  const indianEnglish = voices.find((v) => v.lang === 'en-IN');
  if (indianEnglish) return indianEnglish;
  const englishVoice = voices.find((v) => v.lang.startsWith('en-'));
  return englishVoice || voices[0] || null;
}

function playNextChunk() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;

  if (queueIndex >= queue.length) {
    activeUtterance = null;
    queue = [];
    queueIndex = 0;
    if (onDoneCallback) {
      onDoneCallback();
      onDoneCallback = null;
    }
    return;
  }

  const chunk = queue[queueIndex];
  queueIndex++;

  const utter = new SpeechSynthesisUtterance(chunk);
  const voice = getPreferredVoice();
  if (voice) utter.voice = voice;
  utter.rate = 0.98;
  utter.pitch = 1.0;

  utter.onend = () => {
    playNextChunk();
  };

  utter.onerror = () => {
    playNextChunk();
  };

  activeUtterance = utter;
  window.speechSynthesis.speak(utter);
}

export function speakText(text: string, onDone?: () => void) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  stopSpeaking();
  onDoneCallback = onDone || null;
  queue = chunkTextIntoSentences(text);
  queueIndex = 0;
  if (queue.length === 0) {
    if (onDone) onDone();
    return;
  }
  playNextChunk();
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    activeUtterance = null;
    queue = [];
    queueIndex = 0;
    if (onDoneCallback) {
      onDoneCallback();
      onDoneCallback = null;
    }
  }
}

export function isSpeaking(): boolean {
  if (typeof window === 'undefined' || !window.speechSynthesis) return false;
  return window.speechSynthesis.speaking;
}

export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];

  async start(): Promise<void> {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.audioChunks = [];
    this.mediaRecorder = new MediaRecorder(stream);
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.audioChunks.push(event.data);
    };
    this.mediaRecorder.start();
  }

  stop(): Promise<{ blob: Blob; base64: string; mimeType: string }> {
    return new Promise((resolve) => {
      if (!this.mediaRecorder) {
        throw new Error('Recorder not started');
      }
      this.mediaRecorder.onstop = async () => {
        const mimeType = this.mediaRecorder?.mimeType || 'audio/webm';
        const blob = new Blob(this.audioChunks, { type: mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1] || '';
          resolve({ blob, base64, mimeType });
        };
        reader.readAsDataURL(blob);

        this.mediaRecorder?.stream.getTracks().forEach((track) => track.stop());
      };
      this.mediaRecorder.stop();
    });
  }
}

export class LiveSpeechRecognizer {
  private recognition: any = null;

  constructor(onTranscript: (text: string) => void, onEnd?: () => void) {
    const win = window as unknown as IWindowWithSpeech;
    const SpeechClass = win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechClass) return;

    this.recognition = new SpeechClass();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-IN';

    this.recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = 0; i < event.results.length; i++) {
        finalTranscript += event.results[i][0].transcript + ' ';
      }
      onTranscript(finalTranscript.trim());
    };

    if (onEnd) {
      this.recognition.onend = onEnd;
    }
  }

  start() {
    this.recognition?.start();
  }

  stop() {
    this.recognition?.stop();
  }
}
