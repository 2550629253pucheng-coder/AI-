import React, { useState, useEffect } from "react";
import { Sparkles, Wand2, Check, X, BookOpen, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../services/api";
import { audio } from "../utils/audio";

interface CustomThemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentThemeId?: string;
  onSelectTheme: (theme: any) => Promise<void>;
  isOwner: boolean;
}

export const CustomThemeModal: React.FC<CustomThemeModalProps> = ({
  isOpen,
  onClose,
  currentThemeId,
  onSelectTheme,
  isOwner,
}) => {
  const [presets, setPresets] = useState<any[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [applying, setApplying] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (isOpen) {
      setErrorMessage("");
      setLoadingPresets(true);
      api
        .getPresetThemes()
        .then((list) => {
          setPresets(list);
        })
        .catch(() => {})
        .finally(() => setLoadingPresets(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectPreset = async (theme: any) => {
    if (!isOwner) return;
    try {
      setApplying(true);
      audio.playClick();
      await onSelectTheme(theme);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "设定剧本失败");
    } finally {
      setApplying(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!isOwner) return;
    if (!customPrompt.trim()) {
      setErrorMessage("请输入一句剧本灵感或背景！");
      return;
    }
    try {
      setGenerating(true);
      setErrorMessage("");
      audio.playClick();
      const newTheme = await api.generateCustomTheme(customPrompt.trim());
      await onSelectTheme(newTheme);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "AI 创作超时，请重试");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.92 }}
          className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-purple-500/40 rounded-3xl p-5 shadow-xl dark:shadow-2xl dark:shadow-purple-950/60 max-h-[90vh] flex flex-col overflow-hidden text-slate-800 dark:text-slate-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-xs">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">剧本定制与灵感工坊</h3>
                <p className="text-[11px] text-purple-700 dark:text-purple-300 font-medium">
                  {isOwner ? "房主可自由选用经典或让AI实时生成专属剧本" : "当前房间剧本预览"}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                audio.playClick();
                onClose();
              }}
              className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {errorMessage && (
            <div className="my-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-500/10 dark:border-rose-500/30 dark:text-rose-300 text-xs flex items-center gap-2 shrink-0 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-4 py-3 pr-0.5">
            {/* AI 灵感生成卡片 (仅房主可操作) */}
            {isOwner && (
              <div className="p-3.5 rounded-2xl bg-purple-50/70 dark:bg-gradient-to-br dark:from-purple-950/50 dark:via-slate-900 dark:to-pink-950/30 border border-purple-200 dark:border-purple-500/40 space-y-2.5 shadow-2xs">
                <div className="flex items-center gap-1.5 text-xs font-bold text-purple-800 dark:text-pink-300">
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>AI 编剧一键生成群友专属局</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400">
                  输入任意一句现实或恶搞灵感，AI 导演将自动编排专属角色、隐藏秘密与反转！
                </p>
                <div className="relative">
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="例：奶茶店绝密配方被偷卖给隔壁 / 决赛前电竞键盘被倒红牛"
                    maxLength={50}
                    disabled={generating || applying}
                    className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-purple-300 dark:border-purple-500/40 rounded-xl text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 transition"
                  />
                </div>
                <button
                  onClick={handleGenerateAI}
                  disabled={generating || applying || !customPrompt.trim()}
                  className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-xs ${
                    generating
                      ? "bg-purple-200 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 cursor-wait"
                      : "bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 text-white hover:opacity-90 active:scale-[0.99]"
                  }`}
                >
                  <Sparkles className={`w-3.5 h-3.5 ${generating ? "animate-spin" : ""}`} />
                  <span>{generating ? "AI 导演正在编排剧本细节..." : "生成并设为本局剧本"}</span>
                </button>
              </div>
            )}

            {/* 预设经典剧本库 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 font-medium">
                <span className="font-bold flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5 text-indigo-600 dark:text-cyan-400" />
                  经典预置剧本
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">点击即刻切换</span>
              </div>

              {loadingPresets ? (
                <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">加载剧本库中...</div>
              ) : (
                <div className="space-y-2.5">
                  {presets.map((t) => {
                    const isCurrent = t.themeId === currentThemeId;
                    return (
                      <div
                        key={t.themeId}
                        onClick={() => !applying && handleSelectPreset(t)}
                        className={`p-3 rounded-2xl border transition relative cursor-pointer shadow-2xs ${
                          isCurrent
                            ? "bg-purple-50 border-purple-400 ring-1 ring-purple-300 dark:bg-purple-950/40 dark:border-purple-400 dark:ring-purple-400/50 shadow-xs"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200 dark:bg-slate-800/60 dark:border-slate-700/80 dark:hover:bg-slate-800 dark:hover:border-slate-600"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                                {t.themeName}
                              </span>
                              {isCurrent && (
                                <span className="bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/40 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                                  使用中
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                              {t.background}
                            </p>
                            <div className="flex flex-wrap gap-1 mt-2">
                              {t.roles?.slice(0, 4).map((r: any, idx: number) => (
                                <span
                                  key={idx}
                                  className="text-[10px] bg-white border border-slate-200 text-slate-700 dark:bg-slate-900/80 dark:border-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-medium"
                                >
                                  {r.roleName}
                                </span>
                              ))}
                              {t.roles?.length > 4 && (
                                <span className="text-[10px] text-slate-400 dark:text-slate-500 px-1 py-0.5">
                                  +{t.roles.length - 4}职员
                                </span>
                              )}
                            </div>
                          </div>

                          {isOwner && (
                            <button
                              type="button"
                              disabled={applying || isCurrent}
                              className={`shrink-0 p-1.5 rounded-xl text-xs font-bold flex items-center gap-1 ${
                                isCurrent
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-purple-600/30 dark:text-purple-300 dark:hover:bg-purple-600/50"
                              }`}
                            >
                              {isCurrent ? <Check className="w-4 h-4" /> : "选用"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0 text-center">
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-300 text-xs font-bold rounded-xl transition shadow-2xs"
            >
              关闭
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
