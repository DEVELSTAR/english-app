import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { getProfileIconMeta } from '../../lib/profileIcons';
import { api } from '../../services/api';
import { Lesson, LessonChatMessage } from '../../types/database';
import {
  speakText,
  stopSpeaking,
  AudioRecorder,
  LiveSpeechRecognizer,
} from '../../lib/voice';
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Trash2,
  Loader2,
  Bot,
  User,
  HelpCircle,
  Check,
} from 'lucide-react';

interface AiTutorProps {
  lesson: Lesson;
}

export default function AiTutor({ lesson }: AiTutorProps) {
  const { currentUser } = useAuth();
  const userIconMeta = getProfileIconMeta(currentUser?.profile_icon);

  const [messages, setMessages] = useState<LessonChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLiveListening, setIsLiveListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<number | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const recognizerRef = useRef<LiveSpeechRecognizer | null>(null);

  // Load chat history
  useEffect(() => {
    async function loadHistory() {
      try {
        const history = await api.getChatHistory(lesson.id);
        setMessages(history);
      } catch (err) {
        // user may not be signed in
      }
    }
    loadHistory();
  }, [lesson.id]);

  // Scroll chat messages container (never scrolls the main window)
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages.length, isLoading]);

  const handleSend = async (customMessage?: string) => {
    const textToSend = customMessage || inputValue.trim();
    if (!textToSend || isLoading) return;

    const userMsg: LessonChatMessage = {
      id: Date.now(),
      role: 'user',
      content: textToSend,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customMessage) setInputValue('');
    setIsLoading(true);

    try {
      const res = await api.sendAIChat({
        lesson_id: lesson.id,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        user_message: textToSend,
      });

      const aiMsg: LessonChatMessage = {
        id: Date.now() + 1,
        role: 'model',
        content: res.reply,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMsg]);

      // Auto speak response
      speakText(res.reply, () => {
        setSpeakingMessageId(null);
      });
      setSpeakingMessageId(aiMsg.id);
    } catch (err: any) {
      alert(err.message || 'Failed to communicate with AI Tutor. Please verify Gemini API settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm('Clear all conversation history with Akib Sir for this lesson?')) return;
    try {
      await api.clearChatHistory(lesson.id);
      setMessages([]);
      stopSpeaking();
    } catch (err: any) {
      alert(err.message || 'Failed to clear chat history');
    }
  };

  const handlePlayTTS = (id: number, text: string) => {
    if (speakingMessageId === id) {
      stopSpeaking();
      setSpeakingMessageId(null);
    } else {
      stopSpeaking();
      setSpeakingMessageId(id);
      speakText(text, () => {
        setSpeakingMessageId(null);
      });
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      try {
        const audio = await recorderRef.current?.stop();
        setIsRecording(false);
        if (audio?.base64) {
          setIsLoading(true);
          const res = await api.sendAIChat({
            lesson_id: lesson.id,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            audio_data: { base64: audio.base64, mimeType: audio.mimeType },
          });

          const aiMsg: LessonChatMessage = {
            id: Date.now(),
            role: 'model',
            content: res.reply,
            created_at: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, aiMsg]);
          speakText(res.reply);
        }
      } catch (e) {
        setIsRecording(false);
      } finally {
        setIsLoading(false);
      }
    } else {
      try {
        const recorder = new AudioRecorder();
        await recorder.start();
        recorderRef.current = recorder;
        setIsRecording(true);
      } catch (err) {
        alert('Could not access microphone. Please grant browser permissions.');
      }
    }
  };

  const quickPrompts = [
    'Explain in easy Hinglish',
    'Give me 2 real-life examples',
    'Test my grammar on this',
    'How do native speakers say this?',
  ];

  return (
    <div className="flex flex-col h-full bg-slate-50/50">
      {/* Header Info Banner */}
      <div className="p-3 bg-gradient-to-r from-brand-600/10 via-indigo-500/10 to-transparent border-b border-slate-200/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-brand-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
            👨‍🏫
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 leading-tight">Ask Akib Sir</h4>
            <p className="text-[10px] font-medium text-slate-500">Bilingual English & Hinglish AI Coach</p>
          </div>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={handleClearHistory}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            title="Clear Chat History"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div ref={scrollContainerRef} className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[300px]">
        {messages.length === 0 ? (
          <div className="text-center py-8 px-4 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-600 flex items-center justify-center mx-auto text-xl shadow-xs">
              ✨
            </div>
            <h5 className="text-xs font-bold text-slate-800">Hello! Namaste! How can I help you?</h5>
            <p className="text-[11px] text-slate-500 leading-relaxed max-w-xs mx-auto">
              Ask any question about this lesson, speak into your mic to test your accent, or click a quick prompt below!
            </p>

            <div className="flex flex-wrap gap-1.5 justify-center pt-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => handleSend(prompt)}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium bg-white border border-slate-200 text-slate-700 hover:border-brand-500 hover:text-brand-600 shadow-2xs transition cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isSpeakingNow = speakingMessageId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex gap-2 items-start ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-2xs border border-slate-200/50 ${
                    isUser ? userIconMeta.color : 'bg-brand-600 text-white'
                  }`}
                  title={isUser ? currentUser?.name || 'You' : 'Akib Sir (AI Tutor)'}
                >
                  {isUser ? (
                    <span className="text-xs leading-none">{userIconMeta.emoji}</span>
                  ) : (
                    <Bot className="w-3.5 h-3.5" />
                  )}
                </div>

                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-brand-600 text-white shadow-2xs'
                      : 'bg-white text-slate-800 border border-slate-200/90 shadow-2xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>

                  {!isUser && (
                    <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Akib Sir</span>
                      <button
                        type="button"
                        onClick={() => handlePlayTTS(msg.id, msg.content)}
                        className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 font-semibold cursor-pointer"
                      >
                        {isSpeakingNow ? (
                          <>
                            <VolumeX className="w-3 h-3 text-rose-500" />
                            <span className="text-rose-500">Stop</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3" />
                            <span>Listen</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-brand-600 font-medium p-2 bg-brand-50 rounded-xl w-fit">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Akib Sir is thinking...</span>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-white border-t border-slate-200/80 space-y-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-1.5"
        >
          {/* Audio Mic Button */}
          <button
            type="button"
            onClick={toggleRecording}
            className={`p-2 rounded-xl transition cursor-pointer border ${
              isRecording
                ? 'bg-rose-600 text-white border-rose-600 animate-pulse'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
            title={isRecording ? 'Click to stop recording and send' : 'Speak to Akib Sir'}
          >
            {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-brand-600" />}
          </button>

          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask Akib Sir in English or Hinglish..."
            className="flex-1 px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600 transition"
          />

          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="p-2 rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
