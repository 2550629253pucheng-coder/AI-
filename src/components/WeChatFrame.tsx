import React, { useState, useEffect } from "react";
import { Volume2, VolumeX, RefreshCw, Wrench, ChevronDown, ChevronUp, UserCheck, Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { audio } from "../utils/audio.js";
import { RoomPlayer } from "../types/game.js";
import { themeManager, AppTheme } from "../utils/theme.js";

interface WeChatFrameProps {
  children: React.ReactNode;
  activePlayer?: RoomPlayer;
  roomPlayers?: RoomPlayer[];
  onSwitchPlayer?: (player: RoomPlayer) => void;
  onRefresh?: () => void;
}

export const WeChatFrame: React.FC<WeChatFrameProps> = ({
  children,
  activePlayer,
  roomPlayers = [],
  onSwitchPlayer,
  onRefresh,
}) => {
  const [soundOn, setSoundOn] = useState(true);
  const [timeStr, setTimeStr] = useState("09:41");
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<AppTheme>(themeManager.getTheme());

  useEffect(() => {
    return themeManager.subscribe((t) => setCurrentTheme(t));
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const h = d.getHours().toString().padStart(2, "0");
      const m = d.getMinutes().toString().padStart(2, "0");
      setTimeStr(`${h}:${m}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    audio.enabled = next;
    if (next) audio.playClick();
  };

  const isDark = currentTheme === "dark";

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-neutral-900 dark:text-neutral-100 flex flex-col items-center justify-center p-0 sm:p-4 select-none font-sans transition-colors duration-200">
      {/* 微信小游戏仿真容器：全面适配 Safe Area */}
      <div 
        className="w-full max-w-md h-screen sm:h-[880px] sm:max-h-[95vh] bg-[var(--frame-bg)] sm:rounded-[36px] border border-[var(--cyber-border)] shadow-2xl flex flex-col overflow-hidden relative sm:ring-8 sm:ring-black/5 dark:sm:ring-white/5"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* 顶部手机状态栏 */}
        <header className="h-11 px-5 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 bg-[var(--frame-bg)]/95 backdrop-blur z-30 shrink-0 border-b border-[var(--cyber-border)]">
          <span className="font-semibold tracking-tight text-neutral-800 dark:text-neutral-200">{timeStr}</span>

          {/* 开发/单人联调模式折叠切换器 */}
          {roomPlayers.length > 1 && onSwitchPlayer && activePlayer && (
            <div className="relative">
              <button
                onClick={() => setShowDevPanel(!showDevPanel)}
                className="flex items-center gap-1 bg-cyber-card hover:bg-cyber-card-hover px-2.5 py-1 rounded-full border border-cyber-border text-xs text-neon-cyan transition shadow-sm"
                title="切换调试视角"
                aria-label="切换当前玩家视角"
                aria-expanded={showDevPanel}
              >
                <Wrench className="w-3 h-3 text-neon-cyan" />
                <span className="max-w-[70px] truncate">{activePlayer.nickname}</span>
                {showDevPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              <AnimatePresence>
                {showDevPanel && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute top-8 left-1/2 -translate-x-1/2 z-50 bg-cyber-card border border-cyber-border-bright rounded-2xl p-2 shadow-2xl w-48 space-y-1 backdrop-blur neon-glow-purple"
                  >
                    <div className="text-[11px] text-neutral-400 px-2 py-0.5 border-b border-cyber-border-subtle mb-1 flex items-center justify-between">
                      <span>单人联调视角</span>
                      <span className="text-neon-cyan font-bold">测试专用</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-0.5">
                      {roomPlayers.map((p) => {
                        const isCurrent = p.playerId === activePlayer.playerId;
                        return (
                          <button
                            key={p.playerId}
                            onClick={() => {
                              onSwitchPlayer(p);
                              setShowDevPanel(false);
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition ${
                              isCurrent
                                ? "bg-neon-purple/25 text-neon-lightpurple font-bold border border-neon-purple/40"
                                : "text-neutral-300 hover:bg-cyber-card-hover"
                            }`}
                          >
                            <span className="truncate">
                              {p.nickname} {p.isOwner ? "👑" : ""}
                            </span>
                            {isCurrent && <UserCheck className="w-3.5 h-3.5 text-neon-lightpurple shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* 右侧：明亮/暗夜切换、音效与电量 */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => {
                themeManager.toggleTheme();
                audio.playClick();
              }}
              className="p-1 text-neutral-500 hover:text-neon-purple transition"
              title={isDark ? "切换为清爽明亮模式" : "切换为极客暗夜模式"}
              aria-label={isDark ? "切换为清爽明亮模式" : "切换为极客暗夜模式"}
            >
              {isDark ? (
                <Sun className="w-3.5 h-3.5 text-amber-400 hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-indigo-600 hover:-rotate-12 transition-transform" />
              )}
            </button>

            <button
              onClick={toggleSound}
              className="p-1 text-neutral-500 hover:text-neon-purple transition"
              title={soundOn ? "静音" : "开启音效"}
              aria-label={soundOn ? "开启音效" : "静音"}
            >
              {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-neutral-400" />}
            </button>
            <div className="w-4 h-2 rounded-xs border border-neutral-400 flex items-center p-0.5" aria-hidden="true">
              <div className="w-full h-full bg-emerald-500 rounded-2xs shadow-xs" />
            </div>
          </div>
        </header>

        {/* 微信小游戏右上角胶囊按钮 (Capsule) */}
        <div className="absolute top-12 right-3 z-40 flex items-center bg-[var(--cyber-card)]/90 border border-[var(--cyber-border)] backdrop-blur-md rounded-full px-2.5 py-1 text-neutral-700 dark:text-neutral-300 space-x-2 shadow-sm">
          <button
            onClick={() => {
              if (onRefresh) onRefresh();
              audio.playClick();
            }}
            title="刷新同步"
            aria-label="刷新对局数据"
            className="hover:text-neon-cyan transition p-0.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-3 bg-[var(--cyber-border)]" aria-hidden="true" />
          <div className="flex space-x-0.5 items-center px-1" aria-hidden="true">
            <span className="w-1 h-1 bg-neutral-400 rounded-full" />
            <span className="w-1.5 h-1.5 bg-neutral-600 dark:bg-neutral-200 rounded-full" />
            <span className="w-1 h-1 bg-neutral-400 rounded-full" />
          </div>
          <div className="w-px h-3 bg-[var(--cyber-border)]" aria-hidden="true" />
          <div className="w-3 h-3 rounded-full border border-neutral-400 flex items-center justify-center" aria-hidden="true">
            <div className="w-1.5 h-1.5 rounded-full bg-neutral-500 dark:bg-neutral-300" />
          </div>
        </div>

        {/* 主页面视口内容 */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col bg-gradient-to-b from-[var(--screen-bg-start)] via-[var(--screen-bg-mid)] to-[var(--screen-bg-end)] transition-colors duration-200">
          {children}
        </main>
      </div>
    </div>
  );
};

