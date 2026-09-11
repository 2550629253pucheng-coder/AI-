import React, { useState } from "react";
import { Sparkles, Users, KeyRound, PlayCircle, ShieldCheck, HelpCircle } from "lucide-react";
import { UserSession } from "../services/api.js";
import { audio } from "../utils/audio.js";

interface HomeScreenProps {
  user: UserSession;
  onUpdateUser: (updated: UserSession) => void;
  onCreateRoom: () => void;
  onJoinRoom: (code: string) => void;
  loading: boolean;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  user,
  onUpdateUser,
  onCreateRoom,
  onJoinRoom,
  loading,
}) => {
  const [code, setCode] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(user.nickname);
  const [showRules, setShowRules] = useState(false);

  const handleSaveNickname = () => {
    if (nicknameInput.trim()) {
      onUpdateUser({
        ...user,
        nickname: nicknameInput.trim(),
        avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${nicknameInput.trim()}`,
      });
      setIsEditingName(false);
      audio.playClick();
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-5 pt-8">
      {/* 顶部个人名片 */}
      <div className="flex items-center justify-between bg-neutral-900/90 border border-neutral-800/80 rounded-2xl p-3 shadow-lg">
        <div className="flex items-center space-x-3">
          <img
            src={user.avatarUrl}
            alt="Avatar"
            className="w-11 h-11 rounded-xl bg-neutral-800 border border-amber-500/40 p-0.5 object-cover"
          />
          <div>
            {isEditingName ? (
              <div className="flex items-center space-x-1">
                <input
                  type="text"
                  value={nicknameInput}
                  maxLength={10}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  className="bg-neutral-800 text-sm text-white px-2 py-0.5 rounded border border-amber-500/60 focus:outline-none w-28"
                  autoFocus
                />
                <button
                  onClick={handleSaveNickname}
                  className="text-xs bg-amber-500 text-black px-2 py-1 rounded font-medium"
                >
                  确定
                </button>
              </div>
            ) : (
              <div
                onClick={() => {
                  setIsEditingName(true);
                  audio.playClick();
                }}
                className="flex items-center space-x-1.5 cursor-pointer group"
              >
                <span className="font-semibold text-sm text-neutral-200 group-hover:text-amber-400 transition">
                  {user.nickname}
                </span>
                <span className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded">
                  修改
                </span>
              </div>
            )}
            <div className="text-[11px] text-neutral-400 flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>微信就绪 · 支持多人联机</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setShowRules(true);
            audio.playClick();
          }}
          className="p-2 text-neutral-400 hover:text-amber-300 transition"
          title="玩法说明"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </div>

      {/* 视觉主标题与主题卡 */}
      <div className="my-auto py-6 flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-medium mb-3">
          <Sparkles className="w-3.5 h-3.5 animate-spin" />
          <span>MVP首发玩法 · AI内鬼局</span>
        </div>

        <h1 className="text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-amber-500 drop-shadow-md">
          AI 局中局
        </h1>
        <p className="text-xs text-neutral-400 mt-2 max-w-[280px] leading-relaxed">
          4～8人熟人社交解谜 · AI导演实时推演反转剧情
        </p>

        {/* 主题卡片 */}
        <div className="w-full mt-6 bg-gradient-to-br from-neutral-800/70 to-neutral-900/90 border border-neutral-700/60 rounded-2xl p-4 text-left shadow-xl relative overflow-hidden">
          <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-amber-400/90 font-medium mb-1">
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" /> 4~8人 (最佳6人)
            </span>
            <span className="text-[11px] bg-neutral-800/80 px-2 py-0.5 rounded text-neutral-300">
              单局约 8~10 分钟
            </span>
          </div>
          <div className="text-base font-bold text-neutral-100 mt-1">
            主题一：公司内鬼 · 消失的商业机密
          </div>
          <p className="text-xs text-neutral-400 mt-2 line-clamp-2 leading-normal">
            全员高层会议前10分钟，融资底牌企划案被盗。门禁损坏、监控中断，内鬼正在暗中带节奏诱导大家投错人……
          </p>
        </div>
      </div>

      {/* 底部交互区：创建房间 / 房间码加入 */}
      <div className="space-y-3 pb-2">
        <button
          onClick={() => {
            audio.playClick();
            onCreateRoom();
          }}
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.99] text-neutral-950 font-bold text-base rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
        >
          <PlayCircle className="w-5 h-5 text-neutral-950" />
          <span>{loading ? "创建中..." : "创建房间 (当房主)"}</span>
        </button>

        {/* 房间码快速加入 */}
        <div className="flex items-center space-x-2 bg-neutral-900/90 border border-neutral-800 rounded-2xl p-1.5 pl-3">
          <KeyRound className="w-4 h-4 text-neutral-400 shrink-0" />
          <input
            type="text"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="输入6位数字房间码"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="flex-1 bg-transparent text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none tracking-widest font-mono font-medium"
          />
          <button
            onClick={() => {
              if (code.length >= 4) {
                audio.playClick();
                onJoinRoom(code);
              }
            }}
            disabled={loading || code.length < 4}
            className="bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-200 text-xs font-semibold px-4 py-2.5 rounded-xl transition"
          >
            加入
          </button>
        </div>
      </div>

      {/* 玩法说明弹窗 */}
      {showRules && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
                <ShieldCheck className="w-5 h-5" />
                <span>《AI局中局》规则简明手册</span>
              </div>
              <button
                onClick={() => setShowRules(false)}
                className="text-neutral-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-neutral-300 space-y-3 leading-relaxed max-h-80 overflow-y-auto pr-1">
              <p>
                <strong className="text-amber-300">1. 身份分配：</strong>
                每名玩家拥有一套绝密档案（公开职位、隐藏阵营、个人秘密与任务）。内鬼只有1名（8人局2名）。
              </p>
              <p>
                <strong className="text-amber-300">2. 三轮互动：</strong>
                前两轮根据初始线索与追加证据进行质疑、辩护或调查；
                <span className="text-amber-400 font-medium"> 第3轮由 AI 导演结合前两轮全场行为，生成量身定制的反转剧情！</span>
              </p>
              <p>
                <strong className="text-amber-300">3. 最终投票：</strong>
                每人选出1名最怀疑的内鬼。如果最高票是内鬼，普通员工胜利！否则内鬼脱身胜利！
              </p>
              <p>
                <strong className="text-amber-300">4. AI 赛后复盘：</strong>
                由 AI 评选推理王、戏精大奖、爆笑名场面及专属个性称号。随时点击「再来一局」即可原班人马直接开新局！
              </p>
            </div>

            <button
              onClick={() => setShowRules(false)}
              className="w-full py-2.5 bg-amber-500 text-black font-bold text-xs rounded-xl"
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
