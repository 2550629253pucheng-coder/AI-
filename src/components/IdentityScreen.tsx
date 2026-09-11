import React, { useState, useEffect, useRef } from "react";
import { Eye, EyeOff, Shield, Skull, CheckCircle, Clock, Loader2, Sparkles, Target } from "lucide-react";
import { motion } from "motion/react";
import { PlayerSecret, Team } from "../types/game.js";
import { audio } from "../utils/audio.js";
import { speech } from "../utils/speech.js";
import { DirectorVoiceBar } from "./DirectorVoiceBar.js";

interface IdentityScreenProps {
  secret: PlayerSecret;
  phaseEndsAt: number;
  onProceed: () => void;
  canProceed: boolean;
}

export const IdentityScreen: React.FC<IdentityScreenProps> = ({
  secret,
  phaseEndsAt,
  onProceed,
  canProceed,
}) => {
  const [revealed, setRevealed] = useState(true);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const hasSpokenRef = useRef(false);

  const isSpy = secret.team === Team.SPY;

  useEffect(() => {
    if (hasSpokenRef.current) return;
    hasSpokenRef.current = true;

    audio.playReveal();
    const introText = isSpy
      ? `请注意，你的隐秘阵营已确认。今晚你是潜伏内鬼，公开角色为【${secret.roleName}】。小心藏好身份，神不知鬼不觉执行你的专属暗令吧。`
      : `身份确认完毕，你是好人调查员【${secret.roleName}】。注意听每个人的言行举止，揪出潜伏在我们之中的内鬼！`;
    speech.speak(introText);

    return () => {
      // 离开身份卡界面时停止语音，避免与后续游戏轮次播报重叠
      speech.stop();
    };
  }, [isSpy, secret.roleName]);

  useEffect(() => {
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((phaseEndsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0 && !isTransitioning) {
        setIsTransitioning(true);
      }
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [phaseEndsAt, isTransitioning]);

  const handleProceedClick = () => {
    audio.playClick();
    setIsTransitioning(true);
    setTimeout(() => {
      onProceed();
    }, 400);
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-4 sm:p-5 pt-4 overflow-y-auto">
      {/* 顶部警示条与语音控制 */}
      <div>
        <DirectorVoiceBar autoPosition={false} className="mb-2" />

        <div className="flex items-center justify-between bg-white/90 dark:bg-cyber-deep/85 border border-slate-200 dark:border-cyber-border px-3.5 py-2 rounded-2xl text-xs text-slate-600 dark:text-neutral-400 mb-3 shadow-xs">
          <div className="flex items-center gap-1.5 text-rose-600 dark:text-neon-magenta font-bold">
            <EyeOff className="w-3.5 h-3.5" />
            <span>【绝密身份】仅限本人查阅</span>
          </div>
          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-neon-cyan font-mono font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>{timeLeft}s 后自动进入对局</span>
          </div>
        </div>

        {/* 身份大卡片 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`rounded-3xl p-5 border relative overflow-hidden shadow-lg transition-all ${
            isSpy
              ? "bg-gradient-to-b from-rose-50/90 via-white to-pink-50/90 dark:from-cyber-card dark:via-[#351228]/50 dark:to-cyber-deep border-rose-300 dark:border-neon-magenta/60 ring-1 ring-rose-200 dark:ring-neon-magenta/30"
              : "bg-gradient-to-b from-teal-50/90 via-white to-emerald-50/90 dark:from-cyber-card dark:via-[#0E2C33]/50 dark:to-cyber-deep border-teal-300 dark:border-neon-teal/60 ring-1 ring-teal-200 dark:ring-neon-teal/30"
          }`}
        >
          {/* 阵营徽章 */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-cyber-border-subtle">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                  isSpy ? "bg-rose-100 dark:bg-neon-magenta/20 text-rose-600 dark:text-neon-magenta border border-rose-300 dark:border-neon-magenta/40 shadow-xs" : "bg-teal-100 dark:bg-neon-teal/20 text-teal-700 dark:text-neon-teal border border-teal-300 dark:border-neon-teal/40 shadow-xs"
                }`}
              >
                {isSpy ? <Skull className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
              </div>
              <div>
                <div className="text-xs text-slate-500 dark:text-neutral-400 font-medium">绝密派系归属</div>
                <div
                  className={`text-lg font-black tracking-wider ${
                    isSpy ? "text-rose-600 dark:text-neon-magenta" : "text-teal-700 dark:text-neon-teal"
                  }`}
                >
                  {isSpy ? "🕵️ 内鬼阵营" : "🛡️ 普通员工阵营"}
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                audio.playClick();
                setRevealed(!revealed);
              }}
              className="px-3 py-1.5 bg-white dark:bg-cyber-deep hover:bg-slate-100 dark:hover:bg-cyber-card text-slate-700 dark:text-neutral-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-slate-200 dark:border-cyber-border shadow-xs"
              aria-label={revealed ? "隐藏身份防偷窥" : "点击查看身份"}
            >
              {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{revealed ? "防窥隐藏" : "点亮查看"}</span>
            </button>
          </div>

          {/* 公开角色职务 */}
          <div className="py-3 border-b border-slate-200 dark:border-cyber-border-subtle">
            <span className="text-xs text-slate-500 dark:text-neutral-400 block mb-0.5">你的公开职务</span>
            <div className="text-xl font-black text-slate-900 dark:text-neutral-100 flex items-center gap-2">
              <span>{secret.roleName}</span>
              <span className="text-xs font-bold px-2.5 py-0.5 bg-slate-100 dark:bg-cyber-deep text-indigo-700 dark:text-neon-cyan rounded-full border border-slate-200 dark:border-cyber-border shadow-2xs">
                全场公开透明
              </span>
            </div>
          </div>

          {/* 秘密与任务正文 */}
          {revealed ? (
            <div className="pt-3 space-y-3.5 text-xs">
              <div>
                <span className={`${isSpy ? "text-rose-700 dark:text-neon-magenta" : "text-indigo-700 dark:text-neon-lightpurple"} font-bold block mb-1`}>
                  🤫 你的隐秘档案（切勿直接自曝）：
                </span>
                <p className="bg-slate-50 dark:bg-cyber-deep/90 p-3 rounded-2xl border border-slate-200 dark:border-cyber-border text-slate-800 dark:text-neutral-200 leading-relaxed font-medium">
                  {secret.secret}
                </p>
              </div>

              <div>
                <span className="text-teal-700 dark:text-neon-teal font-bold block mb-1">
                  🎯 本局核心胜利任务：
                </span>
                <p className="bg-slate-50 dark:bg-cyber-deep/90 p-3 rounded-2xl border border-slate-200 dark:border-cyber-border text-slate-800 dark:text-neutral-200 leading-relaxed font-medium">
                  {secret.mission}
                </p>
              </div>

              {/* 钓鱼暗令 (内鬼隐藏高光任务) */}
              {isSpy && secret.trapMission && (
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 dark:from-amber-950/70 dark:via-rose-950/60 dark:to-purple-950/70 border border-amber-300 dark:border-amber-500/50 space-y-2 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-amber-800 dark:text-amber-300 font-extrabold flex items-center gap-1.5 text-xs">
                      <span>🎣 绝密钓鱼暗令</span>
                      <span className="text-[10px] bg-amber-200 dark:bg-amber-500/20 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-500/40 px-1.5 py-0.2 rounded font-mono font-bold">
                        高光加分
                      </span>
                    </span>
                    {secret.trapMission.achieved && (
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold text-[11px] bg-emerald-100 dark:bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-500/40">
                        ✓ 已触发中招
                      </span>
                    )}
                  </div>
                  <p className="text-slate-800 dark:text-neutral-200 text-xs leading-relaxed font-medium">
                    {secret.trapMission.description}
                  </p>
                  <div className="flex items-center gap-2 bg-white dark:bg-black/50 px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-500/40 text-xs shadow-2xs">
                    <span className="text-amber-800 dark:text-amber-400 font-bold">诱导暗号：</span>
                    <span className="font-mono font-black text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/80 px-2 py-0.5 rounded border border-rose-300 dark:border-rose-500/40 text-sm">
                      「{secret.trapMission.keyword}」
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-800 dark:text-amber-200/80 block leading-tight">
                    💡 秘籍：诱导任何好人在接下来的几轮自由发言或辩解中说出该词汇，即可触发全场广播并达成【绝命钓鱼王】成就！
                  </span>
                </div>
              )}

              {secret.knownInformation && secret.knownInformation.length > 0 && (
                <div>
                  <span className="text-sky-700 dark:text-neon-cyan font-bold block mb-1">
                    🔍 你独家掌握的关键情报：
                  </span>
                  <div className="space-y-1.5">
                    {secret.knownInformation.map((info, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-50 dark:bg-cyber-deep/90 p-2.5 rounded-xl border border-slate-200 dark:border-cyber-border text-slate-700 dark:text-neutral-300 text-xs leading-relaxed flex items-start gap-2 font-medium"
                      >
                        <span className="text-indigo-600 dark:text-neon-cyan font-bold">▪</span>
                        <span>{info}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 dark:text-neutral-500 text-xs flex flex-col items-center gap-2">
              <EyeOff className="w-8 h-8 opacity-40 text-indigo-600 dark:text-neon-cyan" />
              <span>绝密信息已隐藏，防止他人偷瞄屏幕</span>
              <button
                onClick={() => setRevealed(true)}
                className="mt-2 text-indigo-600 dark:text-neon-cyan underline font-bold hover:text-indigo-800"
              >
                点击解除遮罩并查阅
              </button>
            </div>
          )}
        </motion.div>
      </div>

      {/* 底部按钮与过渡反馈 */}
      <div className="pt-4">
        <button
          onClick={handleProceedClick}
          disabled={isTransitioning}
          className="w-full py-3.5 btn-primary-neon active:scale-[0.99] text-white font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 transition disabled:opacity-75 shadow-md"
        >
          {isTransitioning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>正在进入会议现场...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>我已记牢身份 · 立即进入现场</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
