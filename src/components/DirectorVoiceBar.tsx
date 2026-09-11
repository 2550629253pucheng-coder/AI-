import React, { useEffect, useState } from "react";
import { Volume2, VolumeX, Radio, Settings2, Sparkles, Check, Play } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { speech, VoiceOption } from "../utils/speech";

interface DirectorVoiceBarProps {
  className?: string;
  autoPosition?: boolean;
}

export const DirectorVoiceBar: React.FC<DirectorVoiceBarProps> = ({
  className = "",
  autoPosition = true,
}) => {
  const [enabled, setEnabled] = useState<boolean>(speech.isEnabled());
  const [isSpeaking, setIsSpeaking] = useState<boolean>(speech.isSpeaking);
  const [currentText, setCurrentText] = useState<string>(speech.currentText);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(speech.getSelectedVoiceURI());
  const [rate, setRate] = useState<number>(speech.getRate());

  useEffect(() => {
    const unsub = speech.subscribe((speaking, text) => {
      setIsSpeaking(speaking);
      setCurrentText(text);
    });

    const updateVoices = () => {
      const v = speech.getAvailableVoices();
      setAvailableVoices(v);
      setSelectedVoiceURI(speech.getSelectedVoiceURI());
    };

    updateVoices();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    return unsub;
  }, []);

  const handleToggle = () => {
    const next = speech.toggle();
    setEnabled(next);
  };

  const handleSelectVoice = (uri: string) => {
    speech.setSelectedVoice(uri);
    setSelectedVoiceURI(uri);
  };

  const handleSetRate = (newRate: number) => {
    speech.setRate(newRate);
    setRate(newRate);
  };

  const handleTestSpeech = () => {
    speech.speak("当前声音已调试完毕，音质自然流畅，欢迎体验剧场播报。");
  };

  // 格式化展示发音人名称，友好易读
  const formatVoiceName = (v: VoiceOption) => {
    const n = v.name;
    if (n.includes("Xiaoxiao") || n.includes("晓晓")) return "🎙️ 晓晓 (知性自然·推荐)";
    if (n.includes("Yunxi") || n.includes("云希")) return "🎭 云希 (悬疑解说·推荐)";
    if (n.includes("Yunjian") || n.includes("云健")) return "🎬 云健 (影视剧场)";
    if (n.includes("Xiaoyi") || n.includes("晓伊")) return "✨ 晓伊 (活泼自然)";
    if (n.includes("Ting-Ting") || n.includes("婷婷")) return "🍎 婷婷 (优质普通话)";
    if (n.includes("Sin-ji")) return "🌟 粤/国人声";
    if (n.includes("Google") || n.includes("cmn")) return "🤖 Google 标准普通话";
    return v.name.replace(/(Microsoft|Desktop|Online|Natural|- Chinese.*)/gi, "").trim() || v.name;
  };

  return (
    <div
      className={`${
        autoPosition ? "sticky top-2 z-40 px-3 py-1" : ""
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md border border-indigo-200 dark:border-cyan-500/30 rounded-xl px-3 py-1.5 shadow-xs text-xs">
        {/* 左侧状态与字幕 */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="relative flex items-center justify-center w-5 h-5 rounded-full bg-indigo-50 dark:bg-cyan-950/60 border border-indigo-200 dark:border-cyan-400/40 text-indigo-600 dark:text-cyan-400 shrink-0">
            <Radio className={`w-3 h-3 ${isSpeaking ? "animate-pulse text-indigo-600 dark:text-cyan-300" : "text-slate-400"}`} />
            {isSpeaking && (
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 dark:bg-emerald-400 rounded-full animate-ping" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            {isSpeaking ? (
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-indigo-600 dark:text-cyan-300 whitespace-nowrap">AI 广播:</span>
                <span className="text-slate-800 dark:text-slate-200 truncate font-medium">{currentText}</span>
              </div>
            ) : (
              <span className="text-slate-500 dark:text-slate-400 truncate">AI 导演声控就绪 · 神经网络自然人声</span>
            )}
          </div>
        </div>

        {/* 右侧：音色调谐入口与开关 */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg border transition ${
              showSettings
                ? "bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-cyan-500/30 dark:text-cyan-300 dark:border-cyan-400"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
            }`}
            title="调节音色与语速"
            aria-label="调节音色与语速"
          >
            <Settings2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleToggle}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border transition-all font-medium ${
              enabled
                ? "bg-indigo-50 dark:bg-cyan-500/20 text-indigo-700 dark:text-cyan-300 border-indigo-200 dark:border-cyan-500/40 hover:bg-indigo-100"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-750"
            }`}
            title={enabled ? "点击静音AI语音播报" : "点击开启AI语音播报"}
          >
            {enabled ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-indigo-600 dark:text-cyan-400" />
                <span className="font-mono text-[10px]">语音 ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-mono text-[10px]">语音 OFF</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 音色与语速微调抽屉 */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-1.5 p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-indigo-200 dark:border-cyan-500/40 rounded-2xl shadow-lg space-y-2.5 text-xs text-slate-700 dark:text-slate-200"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1 text-indigo-700 dark:text-cyan-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI 音色与语速调优</span>
              </span>
              <button
                type="button"
                onClick={handleTestSpeech}
                className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-cyan-950/60 dark:hover:bg-cyan-900/60 dark:text-cyan-300 border border-indigo-200 dark:border-cyan-500/40 rounded-lg text-[11px] font-bold flex items-center gap-1 transition"
              >
                <Play className="w-3 h-3" />
                <span>试听当前声音</span>
              </button>
            </div>

            {/* 发音人选择 */}
            <div className="space-y-1">
              <label className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                推荐发音人 (已自动剔除机械杂音)：
              </label>
              <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                {availableVoices.length === 0 ? (
                  <div className="text-slate-400 text-[11px] py-1">
                    使用浏览器默认发音人（已开启智能平滑润色）
                  </div>
                ) : (
                  availableVoices.map((v) => {
                    const isSelected =
                      selectedVoiceURI === v.uri ||
                      (!selectedVoiceURI && v === availableVoices[0]);
                    return (
                      <button
                        key={v.uri}
                        type="button"
                        onClick={() => handleSelectVoice(v.uri)}
                        className={`w-full text-left p-1.5 rounded-lg border text-[11px] flex items-center justify-between transition ${
                          isSelected
                            ? "bg-indigo-50 dark:bg-cyan-500/20 border-indigo-300 dark:border-cyan-400 text-indigo-900 dark:text-cyan-200 font-bold"
                            : "bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-indigo-200"
                        }`}
                      >
                        <span className="truncate">{formatVoiceName(v)}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-cyan-400 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* 语速微调 */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">播报语速:</span>
              <div className="flex items-center gap-1">
                {[
                  { label: "较慢 0.9x", val: 0.9 },
                  { label: "标准 1.0x", val: 1.0 },
                  { label: "稍快 1.1x", val: 1.1 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => handleSetRate(item.val)}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition ${
                      Math.abs(rate - item.val) < 0.05
                        ? "bg-indigo-600 text-white border-indigo-600 dark:bg-cyan-500 dark:text-black dark:border-cyan-500"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
