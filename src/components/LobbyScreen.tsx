import React, { useState } from "react";
import { Copy, Check, Users, Bot, Crown, ArrowLeft, Play, UserPlus } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
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
    <div className="flex-1 flex flex-col justify-between p-4 sm:p-5 pt-6 overflow-hidden">
      {/* 顶部导航与房间码 */}
      <div className="shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              audio.playClick();
              onLeaveRoom();
            }}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition py-1 px-2 rounded-xl hover:bg-neutral-800"
            aria-label="退出房间"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>退出</span>
          </button>
          <div className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/30">
            <Users className="w-3.5 h-3.5 text-amber-400" />
            <span>就绪席位：{playerCount} / {room.maxPlayers} (最少4人)</span>
          </div>
        </div>

        {/* 房间码大横幅 */}
        <div className="bg-gradient-to-r from-neutral-900 via-neutral-850 to-neutral-900 border border-neutral-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
          <div>
            <div className="text-xs text-neutral-400">房间专属口令</div>
            <div className="text-2xl font-mono font-bold text-amber-400 tracking-widest mt-0.5">
              {room.roomCode}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyRoomCode}
              className="flex items-center gap-1 px-3 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold rounded-xl transition border border-neutral-700"
              aria-label="复制房间暗号"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "已复制" : "复制房号"}</span>
            </button>
            <button
              onClick={() => {
                audio.playClick();
                setInviteModalOpen(true);
              }}
              className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold rounded-xl transition border border-amber-500/40"
            >
              邀请好友
            </button>
          </div>
        </div>
      </div>

      {/* 中间玩家席位列表 */}
      <div className="my-3 flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between text-xs text-neutral-400 mb-2 px-1 shrink-0">
          <span>玩家入席状态</span>
          {!canStartCount ? (
            <span className="text-rose-400 text-xs font-medium">
              还需 {room.minPlayers - playerCount} 人满足开局人数
            </span>
          ) : !allReady ? (
            <span className="text-amber-400 text-xs font-medium">
              等待未准备的玩家准备就绪
            </span>
          ) : (
            <span className="text-emerald-400 text-xs font-bold">
              全员就绪，房主可开局
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2.5 overflow-y-auto flex-1 pr-0.5">
          {room.players.map((p) => {
            const isMe = p.playerId === currentPlayer.playerId;
            return (
              <motion.div
                key={p.playerId}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`p-3 rounded-2xl border flex items-center space-x-2.5 transition relative overflow-hidden ${
                  isMe
                    ? "bg-neutral-850/90 border-amber-500/50 shadow-md ring-1 ring-amber-500/20"
                    : "bg-neutral-900/80 border-neutral-800"
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={p.avatarUrl}
                    alt={p.nickname}
                    className="w-10 h-10 rounded-xl bg-neutral-800 object-cover border border-neutral-700"
                  />
                  {p.isOwner && (
                    <div className="absolute -top-1.5 -right-1.5 bg-amber-500 text-neutral-950 p-0.5 rounded-full shadow" title="房主">
                      <Crown className="w-3 h-3 fill-neutral-950" />
                    </div>
                  )}
                  {p.isBot && (
                    <div className="absolute -bottom-1 -right-1 bg-sky-500 text-neutral-950 px-1.5 py-0.2 rounded-full text-xs font-bold">
                      BOT
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-xs text-neutral-200 truncate">
                      {p.nickname}
                    </span>
                    {isMe && (
                      <span className="text-xs bg-amber-500/30 text-amber-300 px-1 rounded font-normal shrink-0">
                        我
                      </span>
                    )}
                  </div>

                  <div className="mt-1">
                    {p.isOwner ? (
                      <span className="text-xs text-amber-400 font-semibold flex items-center gap-0.5">
                        👑 房主
                      </span>
                    ) : p.isReady ? (
                      <span className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> 已准备
                      </span>
                    ) : (
                      <span className="text-xs text-neutral-500 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" /> 未准备
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* 空席位占位：支持直接点击唤起邀请口令 */}
          {Array.from({ length: Math.max(0, room.maxPlayers - playerCount) }).map((_, idx) => (
            <div
              key={`empty_${idx}`}
              role="button"
              tabIndex={0}
              onClick={() => {
                audio.playClick();
                setInviteModalOpen(true);
              }}
              className="p-3 rounded-2xl border border-dashed border-neutral-800/90 bg-neutral-900/30 hover:border-amber-500/50 flex items-center space-x-2.5 text-neutral-500 cursor-pointer transition group"
              title="点击邀请好友填补空位"
            >
              <div className="w-10 h-10 rounded-xl bg-neutral-800/40 border border-neutral-800 flex items-center justify-center text-xs group-hover:text-amber-400 group-hover:border-amber-500/40 transition">
                <UserPlus className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs text-neutral-400 block group-hover:text-amber-300">点击邀请好友</span>
                <span className="text-xs text-neutral-500 block">微信即点即玩</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 底部功能栏 */}
      <div className="space-y-2.5 pt-2 shrink-0">
        {/* 单人联调极速入口 */}
        {playerCount < room.maxPlayers && isOwner && (
          <button
            onClick={() => {
              audio.playClick();
              onAddBots();
            }}
            disabled={loading}
            className="w-full py-2 bg-neutral-850 hover:bg-neutral-800 text-neutral-300 border border-neutral-700/80 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition"
          >
            <Bot className="w-4 h-4 text-sky-400" />
            <span>一键补齐AI好友席位 (直接凑齐体验)</span>
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
                  ? `还差 ${room.minPlayers - playerCount} 人 (最少4人)`
                  : !allReady
                  ? "等待其他成员全部就绪"
                  : loading
                  ? "AI 正在量身编写身份档案..."
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
            <span>{currentPlayer.isReady ? "已准备 (点击取消准备)" : "我准备好了"}</span>
          </button>
        )}
      </div>

      {/* 邀请卡片弹窗 */}
      <AnimatePresence>
        {inviteModalOpen && (
          <div 
            className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setInviteModalOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-label="微信邀请口令"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-neutral-900 border border-neutral-700 rounded-3xl p-6 max-w-xs w-full space-y-4 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-100 text-base">房间暗号已就绪</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  微信好友直接打开小程序或网页，输入此口令即可秒速加入：
                </p>
              </div>
              <div className="bg-neutral-950 p-3 rounded-2xl border border-neutral-800 text-2xl font-mono font-bold text-amber-400 tracking-widest">
                {room.roomCode}
              </div>
              <p className="text-xs text-neutral-400 leading-normal">
                也可以在不同浏览器标签页中分别输入此房号模拟多设备联机开黑！
              </p>
              <button
                onClick={() => {
                  copyRoomCode();
                  setInviteModalOpen(false);
                }}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs rounded-xl shadow transition"
              >
                复制房间口令并关闭
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
