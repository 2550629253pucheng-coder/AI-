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
  Compass,
  ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User } from "../types/game.js";
import { audio } from "../utils/audio.js";

interface HomeScreenProps {
  user: User;
  onCreateRoom: () => void;
  onJoinRoom: (roomCode: string) => void;
  onUpdateNickname?: (nickname: string) => void;
  onUpdateUser?: (user: User) => void;
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
  onUpdateUser,
  loading,
}) => {
  const [code, setCode] = useState("");
  const [isEditingName, setIsEditingName] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(user.nickname);
  const [showRules, setShowRules] = useState(false);
  const [showCompliance, setShowCompliance] = useState(false);
  const [selectedThemeIndex, setSelectedThemeIndex] = useState(0);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim().length === 6) {
      audio.playClick();
      onJoinRoom(code.trim());
    }
  };

  const handleSaveNickname = () => {
    const trimmed = nicknameInput.trim();
    if (trimmed) {
      if (onUpdateNickname) {
        onUpdateNickname(trimmed);
      } else if (onUpdateUser) {
        onUpdateUser({ ...user, nickname: trimmed });
      }
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
        className="flex items-center justify-between bg-white/95 dark:bg-cyber-card/90 border border-slate-200 dark:border-cyber-border rounded-2xl p-3 shadow-xs"
      >
        <div className="flex items-center space-x-3 flex-1 min-w-0 mr-2">
          <img
            src={user.avatarUrl}
            alt={user.nickname}
            className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-cyber-mid border border-indigo-200 dark:border-neon-purple/50 p-0.5 object-cover shrink-0 shadow-2xs"
          />
          <div className="flex-1 min-w-0">
            {isEditingName ? (
              <div className="flex items-center space-x-1.5 w-full">
                <input
                  type="text"
                  value={nicknameInput}
                  maxLength={12}
                  onChange={(e) => setNicknameInput(e.target.value)}
                  className="bg-slate-100 dark:bg-cyber-deep text-xs text-slate-900 dark:text-white px-2.5 py-1 rounded-xl border border-indigo-300 dark:border-neon-lightpurple focus:outline-none flex-1 min-w-0"
                  autoFocus
                />
                <button
                  onClick={handleSaveNickname}
                  className="text-xs bg-gradient-to-r from-indigo-600 to-pink-500 text-white px-2.5 py-1 rounded-xl font-bold shrink-0 shadow-xs"
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
                <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-neutral-100 group-hover:text-indigo-600 dark:group-hover:text-neon-lightpurple transition truncate">
                  {user.nickname}
                </span>
                <span className="text-[11px] bg-slate-100 dark:bg-cyber-deep/80 text-slate-500 dark:text-neutral-400 hover:text-indigo-600 dark:hover:text-neon-cyan px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shrink-0 border border-slate-200 dark:border-cyber-border-subtle">
                  <Edit2 className="w-2.5 h-2.5" /> 改名
                </span>
              </div>
            )}
            <div className="text-xs text-slate-500 dark:text-neutral-400 flex items-center gap-1 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-neon-teal animate-pulse shadow-xs" />
              <span>微信联机就绪 · 随时开黑</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setShowRules(true);
            audio.playClick();
          }}
          className="p-2 text-slate-400 hover:text-indigo-600 dark:text-neutral-400 dark:hover:text-neon-cyan transition shrink-0 rounded-xl hover:bg-slate-100 dark:hover:bg-cyber-card-hover"
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
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-neon-purple/15 border border-indigo-200 dark:border-neon-purple/35 text-indigo-700 dark:text-neon-lightpurple text-xs font-bold mb-2 shadow-xs"
        >
          <Sparkles className="w-3.5 h-3.5 text-pink-500 animate-spin" />
          <span>Google Gemini AI 实时驱动推理</span>
        </motion.div>

        <h1 className="text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-slate-900 via-indigo-600 to-pink-600 dark:from-white dark:via-neon-lightpurple dark:to-neon-pink drop-shadow-xs">
          AI 局中局
        </h1>
        <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 max-w-[280px] leading-relaxed font-medium">
          4～8人熟人社交解谜 · AI 导演实时推演突发反转
        </p>

        {/* 预留多主题切换卡槽 */}
        <div className="w-full mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-neutral-400 px-1">
            <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-neutral-300">
              <Compass className="w-3.5 h-3.5 text-indigo-600 dark:text-neon-cyan" /> 选择剧本主题
            </span>
            <span className="text-xs text-slate-400 dark:text-neutral-400">{selectedThemeIndex + 1} / {THEMES.length}</span>
          </div>

          <div className="bg-white dark:bg-gradient-to-br dark:from-cyber-card dark:via-cyber-mid dark:to-cyber-deep border border-slate-200 dark:border-cyber-border rounded-2xl p-4 text-left shadow-xs relative overflow-hidden neon-glow-purple">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="flex items-center gap-1 text-indigo-600 dark:text-neon-cyan font-bold">
                <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-neon-cyan" /> {currentTheme.players}
              </span>
              <span className="bg-slate-100 dark:bg-cyber-deep/80 text-slate-700 dark:text-neutral-300 px-2 py-0.5 rounded-full border border-slate-200 dark:border-cyber-border text-xs flex items-center gap-1 font-medium">
                <Clock className="w-3 h-3 text-indigo-600 dark:text-neon-cyan" /> {currentTheme.duration}
              </span>
            </div>

            <div className="text-sm font-black text-slate-900 dark:text-neutral-100 mt-1 flex items-center justify-between">
              <span>{currentTheme.title}</span>
              <span className="text-xs bg-purple-100 dark:bg-neon-purple/20 text-purple-700 dark:text-neon-lightpurple px-2 py-0.5 rounded-md border border-purple-200 dark:border-neon-purple/40 font-bold">
                {currentTheme.badge}
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-neutral-300 mt-2 leading-relaxed bg-slate-50 dark:bg-cyber-deep/80 p-2.5 rounded-xl border border-slate-100 dark:border-cyber-border-subtle">
              {currentTheme.desc}
            </p>

            {/* 主题横向切换圆点 */}
            <div className="flex items-center justify-center gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-cyber-border-subtle">
              {THEMES.map((t, idx) => (
                <button
                  key={t.id}
                  onClick={() => {
                    audio.playClick();
                    setSelectedThemeIndex(idx);
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    selectedThemeIndex === idx ? "w-6 bg-gradient-to-r from-indigo-600 to-pink-500 dark:from-neon-purple dark:to-neon-pink shadow-xs" : "w-1.5 bg-slate-200 dark:bg-cyber-border"
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
          className="w-full py-3.5 btn-primary-neon active:scale-[0.99] text-white font-extrabold text-sm rounded-2xl flex items-center justify-center gap-2 transition disabled:opacity-50 shadow-md"
        >
          <PlayCircle className="w-5 h-5 text-white" />
          <span>{loading ? "正在创建房间..." : "创建房间 (当房主)"}</span>
        </button>

        {/* 房间码加入表单 */}
        <form onSubmit={handleJoin} className="flex items-center space-x-2 bg-white/95 dark:bg-cyber-card/90 border border-slate-200 dark:border-cyber-border rounded-2xl p-1.5 pl-3 shadow-xs">
          <KeyRound className="w-4 h-4 text-indigo-600 dark:text-neon-cyan shrink-0" />
          <input
            type="text"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="输入6位房间数字口令"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="flex-1 bg-transparent text-xs sm:text-sm text-slate-900 dark:text-neutral-100 placeholder:text-slate-400 dark:placeholder:text-neutral-500 focus:outline-none tracking-widest font-mono font-bold"
          />
          <button
            type="submit"
            disabled={code.length !== 6 || loading}
            className="btn-secondary-cyan px-4 py-2 rounded-xl text-xs font-bold transition disabled:opacity-40"
          >
            进入
          </button>
        </form>

        {/* 微信小程序合规公示栏 (适龄提示 16+ · 深度合成备案 · 内容安全) */}
        <div className="pt-2 pb-1 text-center">
          <button
            type="button"
            onClick={() => setShowCompliance(true)}
            className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-600 dark:text-neutral-500 dark:hover:text-neutral-300 transition"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>适龄提示 16+ · AI算法备案与合规公示</span>
          </button>
        </div>
      </div>

      {/* 小程序合规与算法备案弹窗 */}
      <AnimatePresence>
        {showCompliance && (
          <div
            className="fixed inset-0 z-50 bg-black/60 dark:bg-black/85 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowCompliance(false)}
            role="dialog"
            aria-modal="true"
            aria-label="合规与算法备案说明"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border-bright rounded-3xl p-5 max-w-sm w-full space-y-3.5 shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-cyber-border-subtle pb-2.5">
                <span className="text-slate-800 dark:text-neutral-100 font-bold text-sm flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  小程序上架与合规公示
                </span>
                <button
                  onClick={() => setShowCompliance(false)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-full hover:bg-slate-100 dark:hover:bg-cyber-card-hover"
                  aria-label="关闭公示"
                >
                  ✕
                </button>
              </div>

              <div className="text-xs text-slate-600 dark:text-neutral-300 space-y-3 max-h-80 overflow-y-auto pr-1 leading-relaxed">
                <div className="bg-slate-50 dark:bg-cyber-card/50 p-2.5 rounded-xl border border-slate-200/60 dark:border-cyber-border">
                  <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                    <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">CADPA 16+</span>
                    <span>适龄提示与防沉迷说明</span>
                  </div>
                  <p className="text-[11px]">本产品适合年满 16 周岁及以上用户使用。游戏涉及多人语言与逻辑推理互动，未成年人请在监护人指导下体验，并接入微信健康防沉迷系统。</p>
                </div>

                <div>
                  <strong className="text-sky-700 dark:text-sky-400 block mb-0.5">一、深度合成与算法备案公示</strong>
                  <p className="text-[11px]">
                    本小程序剧情推进与复盘由境内已完成算法备案的深度合成大语言模型提供技术支持。依照《生成式人工智能服务管理暂行办法》，所有 AI 生成剧情均已嵌入专属防伪防混淆标识。
                  </p>
                </div>

                <div>
                  <strong className="text-indigo-700 dark:text-indigo-400 block mb-0.5">二、内容安全与言论合规</strong>
                  <p className="text-[11px]">
                    已全面接入敏感词合规过滤及微信内容安全接口 (security.msgSecCheck)。严禁利用本工具传播违法违规、辱骂攻击或不当言论，违规行为将触发即时拦截并保留审计日志。
                  </p>
                </div>

                <div>
                  <strong className="text-teal-700 dark:text-teal-400 block mb-0.5">三、个人信息与隐私保护</strong>
                  <p className="text-[11px]">
                    本产品仅在用户授权后获取必要的基础公开资料（头像、昵称用于游戏名牌渲染）。语音互动仅限当剧本推演传输，未经授权绝不用于商业推广或第三方画像。
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowCompliance(false)}
                className="w-full py-2.5 btn-primary-neon text-white font-bold text-xs rounded-xl transition"
              >
                已悉知并确认
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 规则说明模态框 */}
      <AnimatePresence>
        {showRules && (
          <div 
            className="fixed inset-0 z-50 bg-black/60 dark:bg-black/85 backdrop-blur-xs flex items-center justify-center p-4"
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
              className="bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border-bright rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-xl neon-glow-purple"
            >
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-cyber-border-subtle pb-2.5">
                <span className="text-indigo-700 dark:text-neon-lightpurple font-bold text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-pink-500" /> 《AI局中局》玩法指南
                </span>
                <button
                  onClick={() => setShowRules(false)}
                  className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-full hover:bg-slate-100 dark:hover:bg-cyber-card-hover"
                  aria-label="关闭指南"
                >
                  ✕
                </button>
              </div>

              <div className="text-xs text-slate-700 dark:text-neutral-300 space-y-2.5 max-h-72 overflow-y-auto pr-1 leading-relaxed">
                <div>
                  <strong className="text-sky-700 dark:text-neon-cyan block mb-0.5">1. 身份分配与隐秘任务</strong>
                  <p>开局每人分配一个公开职务（如技术总监、财务总监）与绝密个人身份（普通员工 vs 商业内鬼）。</p>
                </div>
                <div>
                  <strong className="text-indigo-700 dark:text-neon-lightpurple block mb-0.5">2. 三轮博弈与陈述</strong>
                  <p>共进行 3 轮推演。每轮中玩家可进行质询、辩护或披露情报，全场公开记录。</p>
                </div>
                <div>
                  <strong className="text-pink-700 dark:text-neon-magenta block mb-0.5">3. AI导演第3轮突发反转</strong>
                  <p>在第 3 轮，Gemini AI 导演将通盘分析前两轮各人言论矛盾，抛出颠覆性的突发证据！</p>
                </div>
                <div>
                  <strong className="text-teal-700 dark:text-neon-teal block mb-0.5">4. 终极投票指认与AI复盘</strong>
                  <p>全员无记名指认真凶。投票结束后 AI 实时输出毒舌复盘报告与全员幽默封号！</p>
                </div>
              </div>

              <button
                onClick={() => setShowRules(false)}
                className="w-full py-2.5 btn-primary-neon text-white font-bold text-xs rounded-xl transition"
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
