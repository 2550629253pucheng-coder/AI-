import React, { useState } from "react";
import {
  PlayCircle,
  KeyRound,
  Users,
  Sparkles,
  HelpCircle,
  Clock,
  Edit2,
  Check,
  Compass
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User } from "../types/game.js";
import { audio } from "../utils/audio.js";

interface HomeScreenProps {
  user: User;
  onCreateRoom: () => void;
  onJoinRoom: (roomCode: string) => void;
  onUpdateNickname: (nickname: string) => void;
  loading: boolean;
}

const THEMES = [
  {
    id: "office_spy",
    title: "主题一：公司内鬼 · 消失的商业机密",
    badge: "MVP首发 · 推荐",
    players: "4~8人 (最佳6人)",
    duration: "单局约 8~10 分钟",
    desc: "融资路演前夕，S级底牌方案离奇泄密！门禁记录被物理销毁，现场高管中潜伏着收受竞品利益的商业间谍……",
    status: "active",
  },
  {
    id: "cruise_murder",
    title: "主题二：深海游轮 · 暴风雨夜宴",
    badge: "筹备中",
    players: "5~8人",
    duration: "单局约 12 分钟",
    desc: "狂风暴雨切断了所有外联通讯，船长在航海室内被发现昏迷，航海日志少了一整页……",
    status: "coming_soon",
  },
];

export const HomeScreen: React.FC<HomeScreenProps> = ({
  user,
  onCreateRoom,
  onJoinRoom,
  onUpdateNickname,
  loading,
}) => {
  const [code, setCode] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(user.nickname);
  const [showRules, setShowRules] = useState(false);
  const [selectedThemeIndex, setSelectedThemeIndex] = useState(0);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length === 6) {
      audio.playClick();
      onJoinRoom(code.trim());
    }
  };

  const handleSaveNickname = () => {
    if (nicknameInput.trim()) {
      onUpdateNickname(nicknameInput.trim());
    }
    setIsEditingName(false);
    audio.playClick();
  };

  const currentTheme = THEMES[selectedThemeIndex];

  return (
    <div className="flex-1 flex flex-col justify-between p-4 sm:p-5 pt-5 overflow-y-auto">
      {/* 顶部个人名片栏 */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between bg-neutral-900/90 border border-neutral-800 rounded-2xl p-3 shadow-lg"
      >
        <div className="flex items-center space-x-3 flex-1 min-w-0 mr-2">
          <img
            src={user.avatarUrl}
            alt={user.nickname}
            className="w-11 h-11 rounded-xl bg-neutral-800 border border-amber-500/40 p-0.5 object-cover shrink-0"
          />
          <div className="flex-1 min-w-0">
            {isEditingName ? (
              <div className="flex items-center space-x-1.5 w-full">
                <input
                  type="text"
                  value={nicknameInput}
                  maxLength={12}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  className="bg-neutral-800 text-xs text-white px-2.5 py-1 rounded-xl border border-amber-500 focus:outline-none flex-1 min-w-0"
                  autoFocus
                />
                <button
                  onClick={handleSaveNickname}
                  className="text-xs bg-amber-500 hover:bg-amber-400 text-neutral-950 px-2.5 py-1 rounded-xl font-bold shrink-0"
                  aria-label="确认修改昵称"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                role="button"
                tabIndex={0}
                aria-label="点击修改昵称"
                onClick={() => {
                  setIsEditingName(true);
                  audio.playClick();
                }}
                className="flex items-center space-x-1.5 cursor-pointer group truncate"
              >
                <span className="font-bold text-xs sm:text-sm text-neutral-100 group-hover:text-amber-300 transition truncate">
                  {user.nickname}
                </span>
                <span className="text-xs bg-neutral-800 text-neutral-400 hover:text-amber-300 px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shrink-0">
                  <Edit2 className="w-2.5 h-2.5" /> 改名
                </span>
              </div>
            )}
            <div className="text-xs text-neutral-400 flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>微信联机就绪 · 随时开黑</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setShowRules(true);
            audio.playClick();
          }}
          className="p-2 text-neutral-400 hover:text-amber-300 transition shrink-0 rounded-xl hover:bg-neutral-800"
          title="玩法说明"
          aria-label="查看玩法规则说明"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      </motion.div>

      {/* 视觉主视觉与剧本选择卡片 */}
      <div className="my-auto py-4 flex flex-col items-center text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold mb-2"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" />
          <span>Google Gemini AI 实时驱动推理</span>
        </motion.div>

        <h1 className="text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-100 via-amber-300 to-amber-500 drop-shadow-md">
          AI 局中局
        </h1>
        <p className="text-xs text-neutral-400 mt-1 max-w-[280px] leading-relaxed">
          4～8人熟人社交解谜 · AI 导演实时推演突发反转
        </p>

        {/* 预留多主题切换卡槽 */}
        <div className="w-full mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400 px-1">
            <span className="flex items-center gap-1 font-semibold text-neutral-300">
              <Compass className="w-3.5 h-3.5 text-amber-400" /> 选择剧本主题
            </span>
            <span className="text-xs text-neutral-400">{selectedThemeIndex + 1} / {THEMES.length}</span>
          </div>

          <div className="bg-gradient-to-br from-neutral-800/80 via-neutral-900/90 to-neutral-950 border border-neutral-700/70 rounded-2xl p-4 text-left shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="flex items-center gap-1 text-amber-300 font-semibold">
                <Users className="w-3.5 h-3.5" /> {currentTheme.players}
              </span>
              <span className="bg-neutral-800/90 text-neutral-300 px-2 py-0.5 rounded-full border border-neutral-700 text-xs flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" /> {currentTheme.duration}
              </span>
            </div>

            <div className="text-sm font-bold text-neutral-100 mt-1 flex items-center justify-between">
              <span>{currentTheme.title}</span>
              <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/40">
                {currentTheme.badge}
              </span>
            </div>

            <p className="text-xs text-neutral-300 mt-2 leading-relaxed bg-neutral-950/60 p-2.5 rounded-xl border border-neutral-800">
              {currentTheme.desc}
            </p>

            {/* 主题横向切换圆点 */}
            <div className="flex items-center justify-center gap-2 mt-3 pt-2 border-t border-neutral-800/60">
              {THEMES.map((t, idx) => (
                <button
                  key={t.id}
                  onClick={() => {
                    audio.playClick();
                    setSelectedThemeIndex(idx);
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    selectedThemeIndex === idx ? "w-6 bg-amber-400" : "w-1.5 bg-neutral-700"
                  }`}
                  aria-label={`切换到剧本：${t.title}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 底部交互区：创建房间 / 房间码快速加入 */}
      <div className="space-y-3 pb-2 shrink-0">
        <button
          onClick={() => {
            audio.playClick();
            onCreateRoom();
          }}
          disabled={loading}
          className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-[0.99] text-neutral-950 font-bold text-sm rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
        >
          <PlayCircle className="w-5 h-5 text-neutral-950" />
          <span>{loading ? "正在创建房间..." : "创建房间 (当房主)"}</span>
        </button>

        {/* 房间码加入表单 */}
        <form onSubmit={handleJoin} className="flex items-center space-x-2 bg-neutral-900/90 border border-neutral-800 rounded-2xl p-1.5 pl-3">
          <KeyRound className="w-4 h-4 text-neutral-400 shrink-0" />
          <input
            type="text"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="输入6位房间数字口令"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="flex-1 bg-transparent text-xs sm:text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none tracking-widest font-mono font-medium"
          />
          <button
            type="submit"
            disabled={code.length !== 6 || loading}
            className="bg-neutral-800 hover:bg-amber-500 hover:text-neutral-950 disabled:opacity-40 disabled:hover:bg-neutral-800 disabled:hover:text-neutral-400 text-neutral-300 px-4 py-2 rounded-xl text-xs font-bold transition"
          >
            进入
          </button>
        </form>
      </div>

      {/* 规则说明模态框 */}
      <AnimatePresence>
        {showRules && (
          <div 
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowRules(false)}
            role="dialog"
            aria-modal="true"
            aria-label="游戏规则说明"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-neutral-900 border border-neutral-700 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
                <span className="text-amber-400 font-bold text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> 《AI局中局》玩法指南
                </span>
                <button
                  onClick={() => setShowRules(false)}
                  className="text-neutral-400 hover:text-white p-1 rounded-full"
                  aria-label="关闭指南"
                >
                  ✕
                </button>
              </div>

              <div className="text-xs text-neutral-300 space-y-2.5 max-h-72 overflow-y-auto pr-1 leading-relaxed">
                <div>
                  <strong className="text-amber-300 block mb-0.5">1. 身份分配与隐秘任务</strong>
                  <p>开局每人分配一个公开职务（如技术总监、财务总监）与绝密个人身份（普通员工 vs 商业内鬼）。</p>
                </div>
                <div>
                  <strong className="text-amber-300 block mb-0.5">2. 三轮博弈与陈述</strong>
                  <p>共进行 3 轮推演。每轮中玩家可进行质询、辩护或披露情报，全场公开记录。</p>
                </div>
                <div>
                  <strong className="text-rose-400 block mb-0.5">3. AI导演第3轮突发反转</strong>
                  <p>在第 3 轮，Gemini AI 导演将通盘分析前两轮各人言论矛盾，抛出颠覆性的突发证据！</p>
                </div>
                <div>
                  <strong className="text-amber-300 block mb-0.5">4. 终极投票指认与AI复盘</strong>
                  <p>全员无记名指认真凶。投票结束后 AI 实时输出毒舌复盘报告与全员幽默封号！</p>
                </div>
              </div>

              <button
                onClick={() => setShowRules(false)}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl transition"
              >
                我已经明白规则
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
