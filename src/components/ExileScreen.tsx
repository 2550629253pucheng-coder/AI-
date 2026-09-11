import React, { useEffect, useRef } from "react";
import { Skull, AlertTriangle, ArrowRight, ShieldAlert, CheckCircle2, Clock, Volume2 } from "lucide-react";
import { motion } from "motion/react";
import { Game, RoomPlayer, Team } from "../types/game.js";
import { audio } from "../utils/audio.js";
import { speech } from "../utils/speech.js";
import { DirectorVoiceBar } from "./DirectorVoiceBar.js";

interface ExileScreenProps {
  game: Game;
  currentPlayer: RoomPlayer;
  roomPlayers: RoomPlayer[];
  onProceed: () => void;
  canProceed: boolean;
}

export const ExileScreen: React.FC<ExileScreenProps> = ({
  game,
  currentPlayer,
  roomPlayers,
  onProceed,
  canProceed,
}) => {
  const exiled = game.exiledPlayer;
  const isSpy = exiled?.team === Team.SPY;
  const hasSpokenRef = useRef(false);

  const [timeLeft, setTimeLeft] = React.useState(15);

  useEffect(() => {
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((game.phaseEndsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [game.phaseEndsAt]);

  const speechText =
    game.aiComments?.find((c) => c.phase === game.phase)?.text ||
    (isSpy
      ? `全场决议！${exiled?.name}被投票放逐！经系统生物核验……他的真正身份是——【潜伏内鬼】！恭喜好人阵营旗开得胜！`
      : `全场决议！${exiled?.name}被投票放逐！经系统核验……他的真正身份竟然是——【无辜好人】！全场误判，内鬼正在暗中狂喜！`);

  useEffect(() => {
    if (hasSpokenRef.current) return;
    hasSpokenRef.current = true;

    audio.playVoteLock();
    speech.speak(speechText);

    return () => {
      speech.stop();
    };
  }, [speechText]);

  const exiledPlayerObj = roomPlayers.find((p) => p.playerId === exiled?.playerId);

  return (
    <div className="flex-1 flex flex-col justify-between p-4 sm:p-5 relative overflow-hidden bg-gradient-to-b from-slate-900 via-purple-950/40 to-slate-950 text-white">
      <DirectorVoiceBar autoPosition={false} className="mb-2 shrink-0" />

      {/* 顶部标题与倒计时 */}
      <div className="flex items-center justify-between pb-3 border-b border-purple-500/30 shrink-0">
        <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
          <Skull className="w-4 h-4 text-rose-400 animate-pulse" />
          <span>首轮放逐公投 · 裁决揭晓</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-300 bg-slate-800/80 px-3 py-1 rounded-full border border-cyan-500/30">
          <Clock className="w-3.5 h-3.5" />
          <span>{timeLeft}s 后进入决赛轮</span>
        </div>
      </div>

      {/* 核心宣判卡片 */}
      <div className="my-auto py-4 flex flex-col items-center text-center space-y-4">
        {/* 放逐者头像与标记 */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="relative"
        >
          <div className="w-24 h-24 rounded-3xl overflow-hidden border-4 border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.4)] relative bg-slate-800">
            <img
              src={exiledPlayerObj?.avatarUrl || "https://api.dicebear.com/7.x/personas/svg?seed=exiled"}
              alt={exiled?.name}
              className="w-full h-full object-cover grayscale contrast-125"
            />
            <div className="absolute inset-0 bg-rose-950/40 flex items-center justify-center">
              <span className="bg-rose-600 text-white text-[11px] font-black px-2 py-0.5 rounded -rotate-12 uppercase tracking-wider shadow">
                OUT 放逐淘汰
              </span>
            </div>
          </div>
        </motion.div>

        <div>
          <h2 className="text-xl font-black text-white flex items-center justify-center gap-2">
            <span>{exiled?.name || "嫌疑人"}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-purple-300 border border-purple-500/40 font-normal">
              {exiled?.roleName}
            </span>
          </h2>
          <p className="text-xs text-rose-300/80 mt-1">{exiled?.reason || "以最高得票数被全场指认放逐出局！"}</p>
        </div>

        {/* 身份核验大揭秘 */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={`w-full max-w-sm p-4 rounded-2xl border flex items-center gap-3 text-left shadow-lg ${
            isSpy
              ? "bg-emerald-950/40 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
              : "bg-rose-950/40 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.2)]"
          }`}
        >
          <div className="p-3 rounded-2xl bg-black/40 shrink-0">
            {isSpy ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-rose-400" />
            )}
          </div>
          <div>
            <div className="text-xs text-slate-300 font-medium">系统生物特征核验真实身份：</div>
            <div
              className={`text-lg font-black tracking-wide ${
                isSpy ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              {isSpy ? "【 真正的内鬼 (SPY) 】" : "【 无辜好人 (NORMAL) 】"}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              {isSpy
                ? "🎯 漂亮！好人成功除掉一颗毒瘤，内鬼阵营元气大伤！"
                : "⚠️ 糟糕！全场误杀忠良，真正的潜伏者仍在幸存者之中！"}
            </div>
          </div>
        </motion.div>

        {/* AI 导演判词语音条 */}
        <div className="w-full max-w-sm bg-purple-950/60 border border-purple-500/30 rounded-2xl p-3 text-left text-xs leading-relaxed space-y-1.5 shadow-inner">
          <div className="flex items-center justify-between text-purple-300 font-bold">
            <span className="flex items-center gap-1.5">
              <span>🎙️</span>
              <span>AI导演现场宣判：</span>
            </span>
            <button
              onClick={() => speech.speak(speechText)}
              className="text-purple-400 hover:text-cyan-300 transition"
              title="重听宣判"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <p className="text-slate-200 font-medium italic">“{speechText}”</p>
        </div>
      </div>

      {/* 底部推进按钮 */}
      <div className="shrink-0 pt-2 border-t border-purple-500/20">
        <button
          onClick={() => {
            audio.playClick();
            onProceed();
          }}
          className="w-full py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg active:scale-[0.99] transition"
        >
          <span>进入决胜对质 (决赛轮激辩)</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
