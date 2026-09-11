import React, { useState, useEffect } from "react";
import { Volume2, VolumeX, RefreshCw, Wrench, ChevronDown, ChevronUp, UserCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { audio } from "../utils/audio.js";
import { RoomPlayer } from "../types/game.js";

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

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-0 sm:p-4 select-none font-sans">
      {/* 微信小游戏仿真容器：全面适配 Safe Area */}
      <div 
        className="w-full max-w-md h-screen sm:h-[880px] sm:max-h-[95vh] bg-neutral-900 sm:rounded-[36px] border border-neutral-800 shadow-2xl flex flex-col overflow-hidden relative sm:ring-8 sm:ring-neutral-950/60"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {/* 顶部手机状态栏 */}
        <header className="h-11 px-5 flex items-center justify-between text-xs text-neutral-400 bg-neutral-950/80 backdrop-blur z-30 shrink-0 border-b border-neutral-800/60">
          <span className="font-semibold tracking-tight text-neutral-200">{timeStr}</span>

          {/* 开发/单人联调模式折叠切换器 */}
          {roomPlayers.length > 1 && onSwitchPlayer && activePlayer && (
            <div className="relative">
              <button
                onClick={() => setShowDevPanel(!showDevPanel)}
                className="flex items-center gap-1 bg-neutral-850 hover:bg-neutral-800 px-2.5 py-1 rounded-full border border-neutral-700/80 text-xs text-amber-300 transition"
                title="切换调试视角"
                aria-label="切换当前玩家视角"
                aria-expanded={showDevPanel}
              >
                <Wrench className="w-3 h-3 text-amber-400" />
                <span className="max-w-[70px] truncate">{activePlayer.nickname}</span>
                {showDevPanel ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              <AnimatePresence>
                {showDevPanel && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="absolute top-8 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 border border-neutral-700 rounded-2xl p-2 shadow-2xl w-48 space-y-1 backdrop-blur"
                  >
                    <div className="text-[11px] text-neutral-400 px-2 py-0.5 border-b border-neutral-800 mb-1 flex items-center justify-between">
                      <span>单人联调视角</span>
                      <span className="text-amber-400 font-bold">测试专用</span>
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
                                ? "bg-amber-500/20 text-amber-300 font-bold"
                                : "text-neutral-300 hover:bg-neutral-800"
                            }`}
                          >
                            <span className="truncate">
                              {p.nickname} {p.isOwner ? "👑" : ""}
                            </span>
                            {isCurrent && <UserCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* 右侧音效与电量 */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={toggleSound}
              className="p-1 text-neutral-400 hover:text-amber-400 transition"
              title={soundOn ? "静音" : "开启音效"}
              aria-label={soundOn ? "开启音效" : "静音"}
            >
              {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-neutral-600" />}
            </button>
            <div className="w-4 h-2 rounded-xs border border-neutral-400 flex items-center p-0.5" aria-hidden="true">
              <div className="w-full h-full bg-emerald-400 rounded-2xs" />
            </div>
          </div>
        </header>

        {/* 微信小游戏右上角胶囊按钮 (Capsule) */}
        <div className="absolute top-12 right-3 z-40 flex items-center bg-black/40 border border-neutral-700/70 backdrop-blur-md rounded-full px-2.5 py-1 text-neutral-300 space-x-2 shadow-md">
          <button
            onClick={() => {
              if (onRefresh) onRefresh();
              audio.playClick();
            }}
            title="刷新同步"
            aria-label="刷新对局数据"
            className="hover:text-white transition p-0.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-3 bg-neutral-700" aria-hidden="true" />
          <div className="flex space-x-0.5 items-center px-1" aria-hidden="true">
            <span className="w-1 h-1 bg-neutral-400 rounded-full" />
            <span className="w-1.5 h-1.5 bg-neutral-200 rounded-full" />
            <span className="w-1 h-1 bg-neutral-400 rounded-full" />
          </div>
          <div className="w-px h-3 bg-neutral-700" aria-hidden="true" />
          <div className="w-3 h-3 rounded-full border border-neutral-300 flex items-center justify-center" aria-hidden="true">
            <div className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
          </div>
        </div>

        {/* 主页面视口内容 */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col bg-gradient-to-b from-neutral-900 via-neutral-950 to-black">
          {children}
        </main>
      </div>
    </div>
  );
};
