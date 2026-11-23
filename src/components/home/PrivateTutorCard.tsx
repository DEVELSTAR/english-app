import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getProfileIconMeta } from '../../lib/profileIcons';
import { api } from '../../services/api';
import { LessonChatMessage } from '../../types/database';
import { MarkdownContent } from '../common/MarkdownContent';
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
  LogIn,
  UserPlus,
  HelpCircle,
} from 'lucide-react';

export default function PrivateTutorCard() {
  const { currentUser } = useAuth();
  const userIconMeta = getProfileIconMeta(currentUser?.profile_icon);

  const [messages, setMessages] = useState<LessonChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<number | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<AudioRecorder | null>(null);
  const recognizerRef = useRef<LiveSpeechRecognizer | null>(null);

  // Load chat history if authenticated
  useEffect(() => {
    if (!currentUser) return;

    async function loadHistory() {
      setIsHistoryLoading(true);
      try {
        const history = await api.getPrivateChatHistory();
        setMessages(history || []);
      } catch (err) {
        // ignore
      } finally {
        setIsHistoryLoading(false);
      }
    }
    loadHistory();
  }, [currentUser]);

  // Scroll to bottom of chat messages
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

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
        lesson_id: null, // Private general tutor mode
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
    if (!window.confirm('Are you sure you want to clear your private tutor chat history?')) return;
    try {
      await api.clearPrivateChatHistory();
      setMessages([]);
      stopSpeaking();
      setSpeakingMessageId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to clear chat history.');
    }
  };

  const handleDeleteMessage = async (msgId: number) => {
    try {
      await api.deleteChatMessage(msgId);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      if (speakingMessageId === msgId) {
        stopSpeaking();
        setSpeakingMessageId(null);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete message.');
    }
  };

  const handlePlayTTS = (msgId: number, content: string) => {
    if (speakingMessageId === msgId) {
      stopSpeaking();
      setSpeakingMessageId(null);
    } else {
      stopSpeaking();
      setSpeakingMessageId(msgId);
      speakText(content, () => {
        setSpeakingMessageId(null);
      });
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      setIsRecording(false);
      try {
        const audio = await recorderRef.current?.stop();
        recognizerRef.current?.stop();

        if (audio && audio.base64) {
          setIsLoading(true);
          const res = await api.sendAIChat({
            lesson_id: null,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
            audio_data: { base64: audio.base64, mimeType: audio.mimeType },
          });

          const aiMsg: LessonChatMessage = {
            id: Date.now() + 1,
            role: 'model',
            content: res.reply,
            created_at: new Date().toISOString(),
          };

          setMessages((prev) => [...prev, aiMsg]);
          speakText(res.reply, () => setSpeakingMessageId(null));
          setSpeakingMessageId(aiMsg.id);
        }
      } catch (err: any) {
        alert(err.message || 'Failed to process audio recording');
      } finally {
        setIsLoading(false);
      }
    } else {
      try {
        const recorder = new AudioRecorder();
        await recorder.start();
        recorderRef.current = recorder;

        const recognizer = new LiveSpeechRecognizer(
          (text) => setInputValue((prev) => (prev ? `${prev} ${text}` : text)),
          () => {}
        );
        recognizer.start();
        recognizerRef.current = recognizer;

        setIsRecording(true);
      } catch (err: any) {
        alert(err.message || 'Microphone access denied or not supported in this browser.');
      }
    }
  };

  const QUICK_PROMPTS = [
    '☕ Roleplay: Ordering coffee at a cafe',
    '💼 Practice a quick job interview',
    '✍️ Check my sentence: "I will revert back to you"',
    '🗣️ How to politely disagree with a colleague?',
    '💡 Explain "Since" vs "For" with everyday examples',
  ];

  return (
    <section className="bg-white rounded-3xl border border-slate-200/90 shadow-2xs overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-brand-50/30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-brand-500/20">
              🎓
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white ring-1 ring-emerald-500/30" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight">
                Private AI Tutor
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Online 24/7
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 leading-none">
              Your personal English speaking coach • Ask questions or practice dialogues
            </p>
          </div>
        </div>

        {currentUser && messages.length > 0 && (
          <button
            type="button"
            onClick={handleClearHistory}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200/60 rounded-xl transition cursor-pointer"
            title="Clear private chat history"
            aria-label="Clear chat"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Chat</span>
          </button>
        )}
      </div>

      {/* Body: Authenticated Chat OR Guest Login CTA */}
      {!currentUser ? (
        <div className="p-8 sm:p-12 text-center space-y-4 bg-gradient-to-b from-white to-slate-50">
          <div className="w-14 h-14 rounded-3xl bg-brand-50 border border-brand-100 text-brand-600 flex items-center justify-center text-2xl mx-auto shadow-xs">
            ✨
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-base sm:text-lg font-black text-slate-900">
              Meet Akib Sir, Your 1-on-1 English Coach
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Sign in to practice speaking anytime, get immediate grammatical corrections, translate Hindi thoughts into fluent English, and build natural confidence.
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              to="/auth/sign-in"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-brand-600 text-white font-bold text-xs shadow-md shadow-brand-500/20 hover:bg-brand-700 transition"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In to Chat</span>
            </Link>
            <Link
              to="/auth/sign-up"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-100 text-slate-800 font-bold text-xs hover:bg-slate-200 transition"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Join Free</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-[480px] sm:h-[520px]">
          {/* Scrollable Messages Thread */}
          <div ref={scrollContainerRef} className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/40">
            {isHistoryLoading ? (
              <div className="py-20 text-center text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-brand-600" />
                <span className="text-xs font-semibold">Connecting to Akib Sir...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="py-6 px-2 space-y-5">
                <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs space-y-2 max-w-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-base">👋</span>
                    <span className="text-xs font-black text-slate-900">Namaste {currentUser.name}!</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    I am your 1-on-1 private English tutor. You can speak with me in English or Hinglish! Ask any grammar question, ask me to roleplay a real conversation, or tap one of the ideas below:
                  </p>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    Quick Practice Ideas
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => handleSend(prompt)}
                        className="text-left text-xs bg-white hover:bg-brand-50 hover:text-brand-700 text-slate-700 p-2.5 rounded-2xl border border-slate-200/90 hover:border-brand-300 transition-all cursor-pointer shadow-2xs active:scale-95"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === 'user';
                const isSpeakingNow = speakingMessageId === msg.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 items-start ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-2xs border border-slate-200/60 ${
                        isUser ? userIconMeta.color : 'bg-brand-600 text-white'
                      }`}
                      title={isUser ? currentUser.name : 'Akib Sir'}
                    >
                      {isUser ? (
                        <span className="leading-none">{userIconMeta.emoji}</span>
                      ) : (
                        <Bot className="w-3.5 h-3.5" />
                      )}
                    </div>

                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 text-xs leading-relaxed ${
                        isUser
                          ? 'bg-brand-600 text-white shadow-xs'
                          : 'bg-white text-slate-800 border border-slate-200/90 shadow-2xs'
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <MarkdownContent content={msg.content} />
                      )}

                      {isUser && (
                        <div className="pt-1.5 mt-1.5 border-t border-brand-500/40 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="inline-flex items-center gap-1 text-[10px] text-brand-200 hover:text-white transition cursor-pointer"
                            title="Delete this message"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}

                      {!isUser && (
                        <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                          <span className="font-semibold text-slate-500">Akib Sir</span>
                          <div className="flex items-center gap-2">
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
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="inline-flex items-center gap-1 text-slate-400 hover:text-rose-600 transition cursor-pointer"
                              title="Delete this message"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-brand-600 font-medium p-2.5 bg-brand-50 rounded-2xl w-fit border border-brand-200/60">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Akib Sir is typing...</span>
              </div>
            )}
          </div>

          {/* Input Bar */}
          <div className="p-3 bg-white border-t border-slate-200/80 space-y-2 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              {/* Mic Audio Button */}
              <button
                type="button"
                onClick={toggleRecording}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center text-xs transition cursor-pointer shrink-0 border ${
                  isRecording
                    ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                }`}
                title={isRecording ? 'Stop Recording' : 'Speak via Microphone'}
                aria-label="Microphone"
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask Akib Sir in English or Hinglish..."
                disabled={isLoading}
                className="flex-1 bg-slate-50 border border-slate-200/90 rounded-2xl px-3.5 py-2 sm:py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-brand-500 focus:bg-white transition"
              />

              {/* Send Button */}
              <button
                type="submit"
                disabled={isLoading || !inputValue.trim()}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white flex items-center justify-center transition cursor-pointer shadow-xs shrink-0"
                aria-label="Send message"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
