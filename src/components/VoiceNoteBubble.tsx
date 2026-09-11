import React, { useState, useEffect } from "react";
import { Volume2, VolumeX, Play, Square } from "lucide-react";
import { voiceRecorder } from "../utils/voiceRecorder.js";
import { speech } from "../utils/speech.js";

interface VoiceNoteBubbleProps {
  audioData?: string;
  audioDuration?: number;
  content?: string;
  className?: string;
  isSelf?: boolean;
}

export const VoiceNoteBubble: React.FC<VoiceNoteBubbleProps> = ({
  audioData,
  audioDuration = 3,
  content,
  className = "",
  isSelf = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);

  // 当外部停止或结束时同步状态
  useEffect(() => {
    return () => {
      if (isPlaying) {
        voiceRecorder.stopCurrentVoice();
      }
    };
  }, [isPlaying]);

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isPlaying) {
      voiceRecorder.stopCurrentVoice();
      setIsPlaying(false);
      return;
    }

    if (audioData) {
      setIsPlaying(true);
      setHasPlayed(true);
      voiceRecorder.playVoiceAudio(
        audioData,
        () => setIsPlaying(false),
        () => {
          setIsPlaying(false);
          // 播放异常时回退到合成朗读
          if (content) {
            speech.speak(content);
          }
        }
      );
    } else if (content) {
      // 若无音频数据但有文字，使用 TTS 语音朗读
      setIsPlaying(true);
      setHasPlayed(true);
      speech.speak(content);
      setTimeout(() => {
        setIsPlaying(false);
      }, Math.max(1500, content.length * 220));
    }
  };

  // 根据时长计算气泡宽度 (60px ~ 170px)
  const durationSec = Math.max(1, Math.min(60, Math.round(audioDuration)));
  const widthPercent = Math.min(100, 35 + durationSec * 4);

  return (
    <div className={`flex flex-col gap-1 ${isSelf ? "items-end" : "items-start"} ${className}`}>
      {/* 微信风格语音气泡条 */}
      <button
        type="button"
        onClick={handleTogglePlay}
        style={{ width: `${Math.max(88, Math.min(210, widthPercent * 2))}px` }}
        className={`group relative flex items-center justify-between px-3 py-2 rounded-2xl transition cursor-pointer active:scale-98 shadow-xs select-none ${
          isSelf
            ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-600/50"
            : "bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 dark:bg-cyber-deep dark:text-neon-cyan dark:border-cyber-border"
        }`}
        title={isPlaying ? "点击暂停" : "点击播放语音"}
      >
        <div className="flex items-center gap-2">
          {isPlaying ? (
            <Square className="w-3.5 h-3.5 fill-current text-rose-500 animate-pulse" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current text-current" />
          )}

          {/* 模拟微信语音条动态三段式波纹 */}
          <div className="flex items-center gap-0.5 h-3">
            <span
              className={`w-0.5 rounded-full transition-all ${
                isPlaying
                  ? "h-3 bg-emerald-600 dark:bg-neon-teal animate-bounce"
                  : "h-1.5 bg-slate-400 dark:bg-neutral-500"
              }`}
              style={{ animationDelay: "0ms" }}
            />
            <span
              className={`w-0.5 rounded-full transition-all ${
                isPlaying
                  ? "h-4 bg-emerald-600 dark:bg-neon-teal animate-bounce"
                  : "h-2.5 bg-slate-400 dark:bg-neutral-500"
              }`}
              style={{ animationDelay: "150ms" }}
            />
            <span
              className={`w-0.5 rounded-full transition-all ${
                isPlaying
                  ? "h-2.5 bg-emerald-600 dark:bg-neon-teal animate-bounce"
                  : "h-2 bg-slate-400 dark:bg-neutral-500"
              }`}
              style={{ animationDelay: "300ms" }}
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs font-mono font-bold">{durationSec}"</span>
          {!hasPlayed && (
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
          )}
        </div>
      </button>

      {/* 语音转文字内容对照 (满足不想打字但需要阅读/推理的场景) */}
      {content && (
        <div
          className={`text-xs px-2.5 py-1.5 rounded-xl leading-relaxed max-w-[280px] break-words font-medium ${
            isSelf
              ? "bg-slate-100 dark:bg-cyber-deep/80 text-slate-800 dark:text-neutral-200 border border-slate-200 dark:border-cyber-border-subtle"
              : "bg-white dark:bg-cyber-card text-slate-800 dark:text-neutral-200 border border-slate-200 dark:border-cyber-border-subtle"
          }`}
        >
          <span className="text-slate-400 dark:text-neutral-500 text-[10px] mr-1">“</span>
          {content}
          <span className="text-slate-400 dark:text-neutral-500 text-[10px] ml-1">”</span>
        </div>
      )}
    </div>
  );
};
