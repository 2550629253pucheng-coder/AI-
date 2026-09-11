import React, { useState } from "react";
import { Copy, Check, Users, Bot, Crown, ArrowLeft, Play, ShieldAlert } from "lucide-react";
import { Room, RoomPlayer } from "../types/game.js";
import { audio } from "../utils/audio.js";

interface LobbyScreenProps {
  room: Room;
  currentPlayer: RoomPlayer;
  onToggleReady: () => void;
  onStartGame: () => void;
  onAddBots: () => void;
  onLeaveRoom: () => void;
  loading: boolean;
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  room,
  currentPlayer,
  onToggleReady,
  onStartGame,
  onAddBots,
  onLeaveRoom,
  loading,
}) => {
  const [copied, setCopied] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const isOwner = currentPlayer.isOwner;
  const playerCount = room.players.length;
  const canStartCount = playerCount >= room.minPlayers;
  const allReady = room.players.every((p) => (p.isOwner ? true : p.isReady));
  const canStart = isOwner && canStartCount && allReady;

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.roomCode);
    setCopied(true);
    audio.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-5 pt-7">
      {/* 顶部导航与房间码 */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              audio.playClick();
              onLeaveRoom();
            }}
            className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-200 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>退出</span>
          </button>
          <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
            <Users className="w-3.5 h-3.5" />
            <span>房间人数：{playerCount} / {room.maxPlayers} (最少4人)</span>
          </div>
        </div>

        {/* 房间码大横幅 */}
        <div className="bg-gradient-to-r from-neutral-900 to-neutral-850 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <div className="text-[11px] text-neutral-400 tracking-wide">房间专属暗号</div>
            <div className="text-2xl font-mono font-bold text-amber-400 tracking-widest mt-0.5">
              {room.roomCode}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyRoomCode}
              className="flex items-center gap-1 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-xl transition border border-neutral-700"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "已复制" : "复制房号"}</span>
            </button>
            <button
              onClick={() => {
                audio.playClick();
                setInviteModalOpen(true);
              }}
              className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold rounded-xl transition border border-amber-500/40"
            >
              微信邀请
            </button>
          </div>
        </div>
      </div>

      {/* 中间玩家席位列表 */}
      <div className="my-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between text-xs text-neutral-400 mb-2 px-1">
          <span>准备就绪状态</span>
          {!canStartCount && (
            <span className="text-amber-400/90 text-[11px]">
              还差 {room.minPlayers - playerCount} 人可开局
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5 overflow-y-auto max-h-[380px] pr-0.5">
          {room.players.map((p) => {
            const isMe = p.playerId === currentPlayer.playerId;
            return (
              <div
                key={p.playerId}
                className={`p-2.5 rounded-2xl border flex items-center space-x-2.5 transition relative overflow-hidden ${
                  isMe
                    ? "bg-neutral-850/90 border-amber-500/50 shadow-md ring-1 ring-amber-500/20"
                    : "bg-neutral-900/80 border-neutral-800/80"
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={p.avatarUrl}
                    alt={p.nickname}
                    className="w-10 h-10 rounded-xl bg-neutral-800 object-cover border border-neutral-700"
                  />
                  {p.isOwner && (
                    <div className="absolute -top-1.5 -right-1.5 bg-amber-500 text-neutral-950 p-0.5 rounded-full shadow">
                      <Crown className="w-3 h-3 fill-neutral-950" />
                    </div>
                  )}
                  {p.isBot && (
                    <div className="absolute -bottom-1 -right-1 bg-sky-500 text-neutral-950 px-1 py-0.2 rounded-full text-[9px] font-bold">
                      BOT
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-xs text-neutral-200 truncate">
                      {p.nickname}
                    </span>
                    {isMe && (
                      <span className="text-[9px] bg-amber-500/30 text-amber-300 px-1 rounded">
                        我
                      </span>
                    )}
                  </div>

                  <div className="mt-1">
                    {p.isOwner ? (
                      <span className="text-[10px] text-amber-400 font-medium">
                        👑 房主 (主持大局)
                      </span>
                    ) : p.isReady ? (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> 已准备
                      </span>
                    ) : (
                      <span className="text-[10px] text-neutral-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" /> 未准备
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* 空席位占位 */}
          {Array.from({ length: Math.max(0, room.maxPlayers - playerCount) }).map((_, idx) => (
            <div
              key={`empty_${idx}`}
              className="p-2.5 rounded-2xl border border-dashed border-neutral-800/80 bg-neutral-900/30 flex items-center space-x-2.5 text-neutral-600"
            >
              <div className="w-10 h-10 rounded-xl bg-neutral-800/40 border border-neutral-800 flex items-center justify-center text-xs">
                {playerCount + idx + 1}
              </div>
              <span className="text-xs text-neutral-500">等待玩家加入...</span>
            </div>
          ))}
        </div>
      </div>

      {/* 底部功能栏 */}
      <div className="space-y-2.5 pt-2">
        {/* 单人极速测试入口：添加Bot凑齐6人 */}
        {playerCount < room.maxPlayers && (
          <button
            onClick={() => {
              audio.playClick();
              onAddBots();
            }}
            disabled={loading}
            className="w-full py-2 bg-neutral-850 hover:bg-neutral-800 text-neutral-300 border border-neutral-700/80 text-xs font-medium rounded-xl flex items-center justify-center gap-1.5 transition"
          >
            <Bot className="w-4 h-4 text-sky-400" />
            <span>一键添加测试好友 (凑齐6人即刻体验)</span>
          </button>
        )}

        {/* 准备 / 开局控制 */}
        {isOwner ? (
          <div>
            <button
              onClick={() => {
                audio.playClick();
                onStartGame();
              }}
              disabled={!canStart || loading}
              className={`w-full py-3.5 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg transition ${
                canStart
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-neutral-950 shadow-amber-500/20 active:scale-[0.99]"
                  : "bg-neutral-800 text-neutral-500 cursor-not-allowed border border-neutral-700/50"
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {playerCount < room.minPlayers
                  ? `人数不足 (至少4人，当前${playerCount}人)`
                  : !allReady
                  ? "等待其他玩家全部准备"
                  : loading
                  ? "正在生成专属身份..."
                  : "全员就绪 · 开启本局"}
              </span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              audio.playClick();
              onToggleReady();
            }}
            disabled={loading}
            className={`w-full py-3.5 font-bold text-sm rounded-2xl flex items-center justify-center gap-2 shadow-lg transition ${
              currentPlayer.isReady
                ? "bg-neutral-800 border border-emerald-500/50 text-emerald-400"
                : "bg-gradient-to-r from-emerald-500 to-emerald-600 text-neutral-950 shadow-emerald-500/20 active:scale-[0.99]"
            }`}
          >
            <Check className="w-4 h-4" />
            <span>{currentPlayer.isReady ? "已准备 (点击取消)" : "我准备好了"}</span>
          </button>
        )}
      </div>

      {/* 模拟微信分享卡片弹窗 */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-3xl p-6 max-w-xs w-full space-y-4 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-100 text-base">微信好友邀请已就绪</h3>
              <p className="text-xs text-neutral-400 mt-1">
                好友可在同一网络或直接输入以下房间码秒速进入：
              </p>
            </div>
            <div className="bg-neutral-950 p-3 rounded-2xl border border-neutral-800 text-2xl font-mono font-bold text-amber-400 tracking-widest">
              {room.roomCode}
            </div>
            <p className="text-[11px] text-neutral-500 leading-normal">
              也可在另一个浏览器标签页打开本页面，输入此房号模拟多设备联机！
            </p>
            <button
              onClick={() => {
                copyRoomCode();
                setInviteModalOpen(false);
              }}
              className="w-full py-2.5 bg-amber-500 text-black font-bold text-xs rounded-xl"
            >
              复制房号并关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
