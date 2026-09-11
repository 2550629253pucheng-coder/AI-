import React from "react";
import { Volume2, VolumeX, Users, RefreshCw } from "lucide-react";
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
  const [soundOn, setSoundOn] = React.useState(true);
  const [timeStr, setTimeStr] = React.useState("09:41");

  React.useEffect(() => {
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
      {/* 微信小游戏仿真容器 */}
      <div className="w-full max-w-md h-screen sm:h-[880px] sm:max-h-[95vh] bg-neutral-900 sm:rounded-[36px] border border-neutral-800 shadow-2xl flex flex-col overflow-hidden relative sm:ring-8 sm:ring-neutral-950/60">
        
        {/* 顶部手机状态栏 */}
        <div className="h-10 px-6 flex items-center justify-between text-xs text-neutral-400 bg-neutral-950/70 backdrop-blur z-30 shrink-0">
          <span className="font-semibold tracking-tight text-neutral-200">{timeStr}</span>
          
          {/* 多人测试视角切换器 (方便单人直接在浏览器内切换测试多席位) */}
          {roomPlayers.length > 1 && onSwitchPlayer && activePlayer && (
            <div className="flex items-center gap-1.5 bg-neutral-800/80 px-2 py-0.5 rounded-full border border-neutral-700/60 text-[10px] text-amber-300">
              <Users className="w-3 h-3 text-amber-400" />
              <span>当前视角:</span>
              <select
                className="bg-transparent text-amber-300 font-medium focus:outline-none cursor-pointer"
                value={activePlayer.playerId}
                onChange={(e) => {
                  const p = roomPlayers.find((item) => item.playerId === e.target.value);
                  if (p) onSwitchPlayer(p);
                }}
              >
                {roomPlayers.map((p) => (
                  <option key={p.playerId} value={p.playerId} className="bg-neutral-800 text-neutral-200">
                    {p.nickname} {p.isOwner ? "(房主)" : ""} {p.publicRoleName ? `[${p.publicRoleName}]` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <button
              onClick={toggleSound}
              className="p-1 text-neutral-400 hover:text-amber-400 transition"
              title={soundOn ? "静音" : "开启音效"}
            >
              {soundOn ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-neutral-600" />}
            </button>
            <div className="w-4 h-2 rounded-sm border border-neutral-400 flex items-center p-0.5">
              <div className="w-full h-full bg-emerald-400 rounded-2xs" />
            </div>
          </div>
        </div>

        {/* 微信小游戏右上角胶囊按钮 (Capsule) */}
        <div className="absolute top-11 right-3 z-40 flex items-center bg-black/40 border border-neutral-700/60 backdrop-blur-md rounded-full px-2.5 py-1 text-neutral-300 space-x-2 shadow-md">
          <button
            onClick={() => {
              if (onRefresh) onRefresh();
              audio.playClick();
            }}
            title="刷新同步"
            className="hover:text-white transition p-0.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-3 bg-neutral-700" />
          <div className="flex space-x-0.5 items-center px-1">
            <span className="w-1 h-1 bg-neutral-400 rounded-full" />
            <span className="w-1.5 h-1.5 bg-neutral-200 rounded-full" />
            <span className="w-1 h-1 bg-neutral-400 rounded-full" />
          </div>
          <div className="w-px h-3 bg-neutral-700" />
          <div className="w-3 h-3 rounded-full border border-neutral-300 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-neutral-300" />
          </div>
        </div>

        {/* 主页面视口内容 */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col bg-gradient-to-b from-neutral-900 via-neutral-950 to-black">
          {children}
        </div>
      </div>
    </div>
  );
};
