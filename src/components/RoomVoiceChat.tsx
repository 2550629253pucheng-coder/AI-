import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  MessageSquare,
  X,
  Volume2,
  ChevronUp,
  ChevronDown,
  Smile,
  Radio,
  Square
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { RoomPlayer, RoomVoiceMessage } from "../types/game.js";
import { voiceRecorder, QUICK_VOICE_PHRASES } from "../utils/voiceRecorder.js";
import { VoiceNoteBubble } from "./VoiceNoteBubble.js";
import { audio } from "../utils/audio.js";

interface RoomVoiceChatProps {
  roomId: string;
  currentPlayer: RoomPlayer;
  roomPlayers: RoomPlayer[];
  voiceMessages?: RoomVoiceMessage[];
  onSendVoice: (content: string, audioData?: string, audioDuration?: number) => Promise<void>;
  isOpen: boolean;
  onClose: () => void;
}

export const RoomVoiceChat: React.FC<RoomVoiceChatProps> = ({
  roomId,
  currentPlayer,
  roomPlayers,
  voiceMessages = [],
  onSendVoice,
  isOpen,
  onClose,
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [interimText, setInterimText] = useState("");
  const [inputText, setInputText] = useState("");
  const [showQuickPhrases, setShowQuickPhrases] = useState(false);
  const [recordMode, setRecordMode] = useState<"HOLD" | "TAP">("HOLD");
  const [sending, setSending] = useState(false);

  const timerRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到最新消息
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [voiceMessages.length, isOpen]);

  // 录音计时器
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const handleStartRecord = async () => {
    if (isRecording) return;
    try {
      audio.playClick();
      setInterimText("");
      setIsRecording(true);
      await voiceRecorder.startRecording({
        onInterimTranscript: (text) => {
          setInterimText(text);
        },
        onError: (err) => {
          console.warn("[VoiceChat] record error", err);
          setIsRecording(false);
        },
      });
    } catch (e) {
      console.warn("[VoiceChat] startRecord exception", e);
      setIsRecording(false);
    }
  };

  const handleStopAndSend = async () => {
    if (!isRecording) return;
    setIsRecording(false);
    audio.playClick();
    setSending(true);
    try {
      const res = await voiceRecorder.stopRecording();
      const content = (res.transcript || interimText || "").trim();
      await onSendVoice(content, res.audioData, res.audioDuration);
      setInterimText("");
    } catch (e) {
      console.warn("[VoiceChat] send record failed", e);
    } finally {
      setSending(false);
    }
  };

  const handleCancelRecord = () => {
    if (!isRecording) return;
    setIsRecording(false);
    voiceRecorder.cancelRecording();
    setInterimText("");
  };

  const handleSendText = async () => {
    if (!inputText.trim() || sending) return;
    audio.playClick();
    setSending(true);
    try {
      await onSendVoice(inputText.trim());
      setInputText("");
    } finally {
      setSending(false);
    }
  };

  const handleSendQuickPhrase = async (text: string) => {
    setShowQuickPhrases(false);
    audio.playClick();
    setSending(true);
    try {
      await onSendVoice(text);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 dark:bg-black/85 backdrop-blur-xs flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%", opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: "100%", opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-md bg-white dark:bg-cyber-card border-t sm:border border-slate-200 dark:border-cyber-border-bright rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[85vh] h-[540px] shadow-2xl overflow-hidden neon-glow-purple"
      >
        {/* 顶部标题栏 */}
        <div className="shrink-0 p-3.5 px-4 bg-slate-50 dark:bg-cyber-deep border-b border-slate-200 dark:border-cyber-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-neon-teal/20 text-emerald-700 dark:text-neon-teal flex items-center justify-center border border-emerald-300 dark:border-neon-teal/40">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>房间开黑语音条</span>
                <span className="text-[10px] px-1.5 py-0.2 bg-indigo-100 text-indigo-700 dark:bg-neon-purple/20 dark:text-neon-lightpurple rounded-full font-bold">
                  {roomPlayers.length} 人在线
                </span>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-neutral-400">
                支持按住说话录音、语音转文字，免去打字烦恼
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-200/70 hover:bg-slate-300 dark:bg-cyber-card-hover text-slate-600 dark:text-neutral-300 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 快捷开黑短语折叠抽屉 */}
        <AnimatePresence>
          {showQuickPhrases && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-purple-50/80 dark:bg-cyber-deep border-b border-purple-200 dark:border-cyber-border-subtle p-3 overflow-hidden shrink-0"
            >
              <div className="text-xs font-bold text-purple-900 dark:text-neon-lightpurple mb-2 flex items-center justify-between">
                <span>⚡ 一键快捷开黑发言（免打字）</span>
                <button
                  onClick={() => setShowQuickPhrases(false)}
                  className="text-slate-400 hover:text-slate-600 text-xs"
                >
                  收起
                </button>
              </div>
              <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
                {QUICK_VOICE_PHRASES.map((phrase) => (
                  <button
                    key={phrase.id}
                    onClick={() => handleSendQuickPhrase(phrase.text)}
                    className="text-left text-xs bg-white dark:bg-cyber-card p-2 rounded-xl border border-slate-200 dark:border-cyber-border hover:border-purple-400 dark:hover:border-neon-purple/70 text-slate-800 dark:text-neutral-200 transition flex items-center gap-2 shadow-2xs group active:scale-98"
                  >
                    <span className="text-sm shrink-0">{phrase.icon}</span>
                    <span className="truncate flex-1 font-medium group-hover:text-indigo-600 dark:group-hover:text-neon-cyan">
                      {phrase.text}
                    </span>
                    <Send className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-neon-cyan shrink-0" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 消息滚动区 */}
        <div className="flex-1 p-3.5 overflow-y-auto space-y-3">
          {voiceMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 dark:text-neutral-500 space-y-2">
              <Mic className="w-10 h-10 text-slate-300 dark:text-neutral-600 stroke-[1.5]" />
              <div className="text-xs font-bold text-slate-600 dark:text-neutral-400">
                房间里还没有人说话
              </div>
              <p className="text-[11px] max-w-xs leading-relaxed">
                不想打字？按住下方“按住说话”或点击“快捷发言”，直接用声音和队友开黑！
              </p>
            </div>
          ) : (
            voiceMessages.map((msg) => {
              const isSelf = msg.playerId === currentPlayer.playerId;
              return (
                <div
                  key={msg.messageId}
                  className={`flex gap-2.5 ${isSelf ? "flex-row-reverse" : "flex-row"}`}
                >
                  <img
                    src={msg.avatarUrl}
                    alt={msg.playerName}
                    className="w-8 h-8 rounded-xl object-cover shrink-0 border border-slate-200 dark:border-cyber-border shadow-2xs mt-0.5"
                  />
                  <div className={`space-y-1 ${isSelf ? "items-end text-right" : "items-start text-left"}`}>
                    <div className="text-[11px] text-slate-500 dark:text-neutral-400 flex items-center gap-1">
                      <span className="font-bold text-slate-700 dark:text-neutral-300">
                        {msg.playerName}
                      </span>
                      {isSelf && <span className="text-indigo-600 dark:text-neon-cyan">(我)</span>}
                    </div>

                    <VoiceNoteBubble
                      audioData={msg.audioData}
                      audioDuration={msg.audioDuration}
                      content={msg.content}
                      isSelf={isSelf}
                    />
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 正在录音中的全屏/浮动指示条 */}
        <AnimatePresence>
          {isRecording && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="bg-emerald-50 dark:bg-emerald-950/80 border-t border-emerald-300 dark:border-emerald-600 p-3 flex items-center justify-between shrink-0"
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
                </span>
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  正在录音中... {recordingSeconds}s
                </span>
                {interimText && (
                  <span className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[160px] italic">
                    “{interimText}”
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelRecord}
                  className="px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-rose-600 dark:text-neutral-400 rounded-lg"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleStopAndSend}
                  className="px-3 py-1 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-xs hover:bg-emerald-700"
                >
                  完成发送
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 底部输入与麦克风操作区 */}
        <div className="shrink-0 p-3 bg-slate-50 dark:bg-cyber-deep border-t border-slate-200 dark:border-cyber-border space-y-2">
          {/* 功能模式切换行 */}
          <div className="flex items-center justify-between px-1">
            <button
              type="button"
              onClick={() => setShowQuickPhrases(!showQuickPhrases)}
              className="text-xs font-bold text-indigo-700 dark:text-neon-lightpurple flex items-center gap-1 hover:underline"
            >
              <Smile className="w-3.5 h-3.5" />
              <span>{showQuickPhrases ? "收起常用语" : "快捷常用语"}</span>
            </button>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-neutral-400">
              <span>开麦方式：</span>
              <button
                type="button"
                onClick={() => setRecordMode("HOLD")}
                className={`px-1.5 py-0.5 rounded font-bold transition ${
                  recordMode === "HOLD"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-neon-teal/20 dark:text-neon-teal"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                按住说话
              </button>
              <span>/</span>
              <button
                type="button"
                onClick={() => setRecordMode("TAP")}
                className={`px-1.5 py-0.5 rounded font-bold transition ${
                  recordMode === "TAP"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-neon-teal/20 dark:text-neon-teal"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                点击录音
              </button>
            </div>
          </div>

          {/* 麦克风核心交互栏 */}
          <div className="flex items-center gap-2">
            {recordMode === "HOLD" ? (
              <button
                type="button"
                onMouseDown={handleStartRecord}
                onMouseUp={handleStopAndSend}
                onMouseLeave={handleCancelRecord}
                onTouchStart={(e) => {
                  e.preventDefault();
                  handleStartRecord();
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  handleStopAndSend();
                }}
                disabled={sending}
                className={`flex-1 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition select-none shadow-xs active:scale-[0.98] ${
                  isRecording
                    ? "bg-rose-500 text-white animate-pulse"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                <Mic className="w-4 h-4" />
                <span>{isRecording ? "松开 结束并发送" : "按住 说话开黑"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={isRecording ? handleStopAndSend : handleStartRecord}
                disabled={sending}
                className={`flex-1 py-2.5 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 transition select-none shadow-xs ${
                  isRecording
                    ? "bg-rose-500 hover:bg-rose-600 text-white animate-pulse"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                {isRecording ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4" />}
                <span>{isRecording ? "正在录音，点击完成发送" : "点击开麦说话"}</span>
              </button>
            )}

            {/* 键盘文字备用输入 */}
            <div className="flex items-center gap-1.5 flex-1">
              <input
                type="text"
                placeholder="或打字发言..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSendText();
                }}
                className="w-full bg-white dark:bg-cyber-card text-xs text-slate-900 dark:text-white px-3 py-2.5 rounded-2xl border border-slate-200 dark:border-cyber-border focus:outline-none focus:border-indigo-400 placeholder:text-slate-400"
              />
              {inputText && (
                <button
                  type="button"
                  onClick={handleSendText}
                  disabled={sending}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl shrink-0 transition shadow-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
