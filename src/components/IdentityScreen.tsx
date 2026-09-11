import React, { useState, useEffect } from "react";
import { Eye, EyeOff, Shield, Skull, CheckCircle, Clock } from "lucide-react";
import { PlayerSecret, Team } from "../types/game.js";
import { audio } from "../utils/audio.js";

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

  useEffect(() => {
    audio.playReveal();
  }, []);

  useEffect(() => {
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((phaseEndsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [phaseEndsAt]);

  const isSpy = secret.team === Team.SPY;

  return (
    <div className="flex-1 flex flex-col justify-between p-5 pt-8">
      {/* 顶部警示条 */}
      <div>
        <div className="flex items-center justify-between bg-neutral-950/80 border border-neutral-800 px-3 py-1.5 rounded-full text-xs text-neutral-400 mb-4">
          <div className="flex items-center gap-1.5 text-rose-400 font-semibold">
            <EyeOff className="w-3.5 h-3.5" />
            <span>【绝密档案】仅限本人查阅</span>
          </div>
          <div className="flex items-center gap-1 text-amber-400 font-mono">
            <Clock className="w-3.5 h-3.5" />
            <span>{timeLeft}s 后自动进入现场</span>
          </div>
        </div>

        {/* 身份大卡片 */}
        <div
          className={`rounded-3xl p-5 border relative overflow-hidden shadow-2xl transition-all ${
            isSpy
              ? "bg-gradient-to-b from-neutral-900 via-rose-950/40 to-neutral-950 border-rose-600/50 ring-1 ring-rose-500/20"
              : "bg-gradient-to-b from-neutral-900 via-sky-950/30 to-neutral-950 border-sky-600/50 ring-1 ring-sky-500/20"
          }`}
        >
          {/* 阵营徽章 */}
          <div className="flex items-center justify-between pb-3 border-b border-neutral-800/80">
            <div className="flex items-center gap-2">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  isSpy ? "bg-rose-500/20 text-rose-400" : "bg-sky-500/20 text-sky-400"
                }`}
              >
                {isSpy ? <Skull className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-[11px] text-neutral-400 font-medium">真实隐藏阵营</div>
                <div
                  className={`text-lg font-black tracking-wider ${
                    isSpy ? "text-rose-400" : "text-sky-400"
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
              className="px-2.5 py-1 bg-neutral-800 text-neutral-300 rounded-lg text-xs flex items-center gap-1 hover:text-white"
            >
              {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{revealed ? "隐藏" : "查看"}</span>
            </button>
          </div>

          {/* 公开角色职务 */}
          <div className="py-3 border-b border-neutral-800/80">
            <span className="text-[11px] text-neutral-400 block mb-0.5">你的公开伪装职务</span>
            <div className="text-xl font-bold text-neutral-100 flex items-center gap-2">
              <span>{secret.roleName}</span>
              <span className="text-[11px] font-normal px-2 py-0.5 bg-neutral-800 text-amber-300 rounded-full">
                所有人都知道你担任此职
              </span>
            </div>
          </div>

          {/* 秘密与任务正文 */}
          {revealed ? (
            <div className="pt-3 space-y-3.5 text-xs">
              <div>
                <span className="text-amber-400/90 font-bold block mb-1">
                  🤫 你的个人秘密（不可轻易透露）：
                </span>
                <p className="bg-neutral-950/70 p-2.5 rounded-xl border border-neutral-800/80 text-neutral-200 leading-relaxed">
                  {secret.secret}
                </p>
              </div>

              <div>
                <span className="text-emerald-400/90 font-bold block mb-1">
                  🎯 本局核心胜利任务：
                </span>
                <p className="bg-neutral-950/70 p-2.5 rounded-xl border border-neutral-800/80 text-neutral-200 leading-relaxed">
                  {secret.mission}
                </p>
              </div>

              {secret.knownInformation && secret.knownInformation.length > 0 && (
                <div>
                  <span className="text-sky-400/90 font-bold block mb-1">
                    🔍 你独家掌握的关键情报：
                  </span>
                  <div className="space-y-1.5">
                    {secret.knownInformation.map((info, idx) => (
                      <div
                        key={idx}
                        className="bg-neutral-950/70 p-2 rounded-xl border border-neutral-800/60 text-neutral-300 text-[11px] leading-relaxed flex items-start gap-1.5"
                      >
                        <span className="text-sky-400 font-bold">▪</span>
                        <span>{info}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-neutral-500 text-xs flex flex-col items-center gap-2">
              <EyeOff className="w-8 h-8 opacity-40" />
              <span>信息已隐藏，防止他人偷看屏幕</span>
              <button
                onClick={() => setRevealed(true)}
                className="mt-2 text-amber-400 underline font-medium"
              >
                点击点亮屏幕查阅
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 底部按钮 */}
      <div className="pt-4">
        <button
          onClick={() => {
            audio.playClick();
            onProceed();
          }}
          className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-neutral-950 font-bold text-sm rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 active:scale-[0.99] transition"
        >
          <CheckCircle className="w-4 h-4" />
          <span>我已记住身份 · 立即进入现场</span>
        </button>
      </div>
    </div>
  );
};
