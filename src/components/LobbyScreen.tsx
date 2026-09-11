import React, { useState } from "react";
import { Copy, Check, Users, Bot, Crown, ArrowLeft, Play, UserPlus, Sparkles, Radio } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Room, RoomPlayer, RoomVoiceMessage } from "../types/game.js";
import { audio } from "../utils/audio.js";
import { CustomThemeModal } from "./CustomThemeModal.js";
import { DirectorVoiceBar } from "./DirectorVoiceBar.js";
import { RoomVoiceChat } from "./RoomVoiceChat.js";
import { api } from "../services/api.js";

interface LobbyScreenProps {
  room: Room;
  currentPlayer: RoomPlayer;
  onToggleReady: () => void;
  onStartGame: () => void;
  onAddBots: () => void;
  onLeaveRoom: () => void;
  onUpdateRoom?: (room: Room) => void;
  loading: boolean;
  onSendVoice?: (content: string, audioData?: string, audioDuration?: number) => Promise<void>;
  voiceMessages?: RoomVoiceMessage[];
}

export const LobbyScreen: React.FC<LobbyScreenProps> = ({
  room,
  currentPlayer,
  onToggleReady,
  onStartGame,
  onAddBots,
  onLeaveRoom,
  onUpdateRoom,
  loading,
  onSendVoice,
  voiceMessages = [],
}) => {
  const [copied, setCopied] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [voiceChatOpen, setVoiceChatOpen] = useState(false);

  const isOwner = currentPlayer.isOwner;
  const playerCount = room.players.length;
  const canStartCount = playerCount >= room.minPlayers;
  const allReady = room.players.every((p) => (p.isOwner ? true : p.isReady));
  const canStart = isOwner && canStartCount && allReady;

  const copyRoomCode = () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(room.roomCode).catch(() => {});
      }
    } catch {}
    setCopied(true);
    audio.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSelectTheme = async (theme: any) => {
    const updated = await api.setRoomTheme(room.roomId, theme);
    if (onUpdateRoom) {
      onUpdateRoom(updated);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-4 sm:p-5 pt-4 overflow-hidden">
      {/* 顶部导航与房间码 */}
      <div className="shrink-0 space-y-2.5">
        <DirectorVoiceBar autoPosition={false} className="mb-1" />

        <div className="flex items-center justify-between">
          <button
            onClick={() => {
              audio.playClick();
              onLeaveRoom();
            }}
            className="flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neon-cyan transition py-1 px-2 rounded-xl hover:bg-cyber-card-hover"
            aria-label="退出房间"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>退出</span>
          </button>
          <div className="flex items-center gap-1.5 text-xs text-neon-lightpurple bg-neon-purple/15 px-3 py-1 rounded-full border border-neon-purple/35">
            <Users className="w-3.5 h-3.5 text-neon-pink" />
            <span>就绪席位：{playerCount} / {room.maxPlayers} (最少4人)</span>
          </div>
        </div>

        {/* 房间码大横幅 */}
        <div className="bg-white/90 dark:bg-gradient-to-r dark:from-cyber-card dark:via-cyber-mid dark:to-cyber-card border border-slate-200 dark:border-cyber-border rounded-2xl p-3.5 flex items-center justify-between shadow-sm neon-glow-purple">
          <div>
            <div className="text-xs text-slate-500 dark:text-neutral-400 font-medium">房间专属口令</div>
            <div className="text-2xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 dark:from-neon-lightpurple dark:to-neon-pink tracking-widest mt-0.5">
              {room.roomCode}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={copyRoomCode}
              className="btn-secondary-cyan px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs"
              aria-label="复制房间暗号"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-neon-teal" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? "已复制" : "复制房号"}</span>
            </button>
            <button
              onClick={() => {
                audio.playClick();
                setInviteModalOpen(true);
              }}
              className="px-3 py-2 bg-purple-100 hover:bg-purple-200 dark:bg-neon-purple/20 dark:hover:bg-neon-purple/30 text-purple-700 dark:text-neon-lightpurple text-xs font-bold rounded-xl transition border border-purple-200 dark:border-neon-purple/40 shadow-xs"
            >
              邀请好友
            </button>
          </div>
        </div>

        {/* 剧本展示与定制入口 */}
        <div className="bg-gradient-to-r from-purple-50/90 via-white to-pink-50/90 dark:from-slate-900/90 dark:via-purple-950/40 dark:to-slate-900/90 border border-purple-200 dark:border-purple-500/30 rounded-2xl p-3 flex items-center justify-between shadow-xs">
          <div className="min-w-0 flex-1 mr-2">
            <div className="flex items-center gap-1.5 text-[11px] text-purple-700 dark:text-purple-300 font-bold">
              <Sparkles className="w-3 h-3 text-pink-500 dark:text-pink-400" />
              <span>本局剧本设定</span>
            </div>
            <div className="text-xs font-black text-slate-900 dark:text-white truncate mt-0.5">
              {room.themeName || "公司内鬼 · 消失的商业机密"}
            </div>
            {room.themeBackground && (
              <div className="text-[11px] text-slate-600 dark:text-slate-400 truncate mt-0.5">
                {room.themeBackground}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              audio.playClick();
              setThemeModalOpen(true);
            }}
            className="px-2.5 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs font-bold rounded-xl transition shrink-0 flex items-center gap-1 shadow-xs"
          >
            <Sparkles className="w-3 h-3 text-pink-200" />
            <span>{isOwner ? "定制剧本" : "查看剧本"}</span>
          </button>
        </div>
      </div>

      {/* 中间玩家席位列表 */}
      <div className="my-3 flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between text-xs text-neutral-400 mb-2 px-1 shrink-0">
          <span>玩家入席状态</span>
          {!canStartCount ? (
            <span className="text-neon-magenta text-xs font-medium">
              还需 {room.minPlayers - playerCount} 人满足开局人数
            </span>
          ) : !allReady ? (
            <span className="text-neon-cyan text-xs font-medium">
              等待未准备的玩家准备就绪
            </span>
          ) : (
            <span className="text-neon-teal text-xs font-bold">
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
                    ? "bg-white dark:bg-cyber-card border-indigo-400 dark:border-neon-purple/60 shadow-sm ring-2 ring-indigo-200 dark:ring-neon-purple/30"
                    : "bg-white/90 dark:bg-cyber-card/75 border-slate-200 dark:border-cyber-border shadow-xs"
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={p.avatarUrl}
                    alt={p.nickname}
                    className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-cyber-mid object-cover border border-slate-200 dark:border-cyber-border shadow-xs"
                  />
                  {p.isOwner && (
                    <div className="absolute -top-1.5 -right-1.5 bg-gradient-to-r from-amber-500 to-amber-400 text-white p-0.5 rounded-full shadow-xs" title="房主">
                      <Crown className="w-3 h-3 fill-white" />
                    </div>
                  )}
                  {p.isBot && (
                    <div className="absolute -bottom-1 -right-1 bg-sky-500 text-white px-1.5 py-0.2 rounded-full text-[10px] font-black shadow-xs">
                      BOT
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-xs text-slate-900 dark:text-neutral-200 truncate">
                      {p.nickname}
                    </span>
                    {isMe && (
                      <span className="text-[10px] bg-purple-100 dark:bg-neon-purple/30 text-purple-700 dark:text-neon-lightpurple px-1 rounded font-bold shrink-0 border border-purple-200 dark:border-neon-purple/40">
                        我
                      </span>
                    )}
                  </div>

                  <div className="mt-1">
                    {p.isOwner ? (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-bold flex items-center gap-0.5">
                        👑 房主
                      </span>
                    ) : p.isReady ? (
                      <span className="text-xs text-emerald-600 dark:text-neon-teal flex items-center gap-1 font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-xs" /> 已准备
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-neutral-500 flex items-center gap-1 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-neutral-600" /> 未准备
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
              className="p-3 rounded-2xl border-2 border-dashed border-slate-300 dark:border-cyber-border bg-slate-50/80 dark:bg-cyber-deep/40 hover:border-indigo-400 dark:hover:border-neon-purple/50 hover:bg-indigo-50/40 flex items-center space-x-2.5 text-slate-500 dark:text-neutral-500 cursor-pointer transition group shadow-xs"
              title="点击邀请好友填补空位"
            >
              <div className="w-10 h-10 rounded-xl bg-white dark:bg-cyber-mid border border-slate-200 dark:border-cyber-border flex items-center justify-center text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-neon-cyan transition shadow-2xs">
                <UserPlus className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="text-xs text-slate-700 dark:text-neutral-400 font-bold block group-hover:text-indigo-600 dark:group-hover:text-neon-lightpurple">点击邀请好友</span>
                <span className="text-[11px] text-slate-400 dark:text-neutral-500 block">微信即点即玩</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 底部功能栏 */}
      <div className="space-y-2.5 pt-2 shrink-0">
        {/* 房间开黑语音对讲栏 (不想打字时直接按住说话或发语音玩) */}
        <button
          type="button"
          onClick={() => {
            audio.playClick();
            setVoiceChatOpen(true);
          }}
          className="w-full py-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-neon-teal/15 dark:hover:bg-neon-teal/25 border border-emerald-300 dark:border-neon-teal/40 text-emerald-800 dark:text-neon-teal text-xs font-bold rounded-xl flex items-center justify-between px-3.5 transition shadow-xs active:scale-[0.99]"
        >
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-600 dark:text-neon-teal animate-pulse" />
            <span>🎙️ 房间语音对讲 · 开黑免打字</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 dark:text-neon-teal/80">
            {voiceMessages && voiceMessages.length > 0 ? (
              <span className="bg-emerald-600 text-white dark:bg-neon-teal dark:text-black font-bold px-1.5 py-0.2 rounded-full">
                {voiceMessages.length}条对讲
              </span>
            ) : (
              <span>点击开麦畅聊</span>
            )}
          </div>
        </button>

        {/* 单人联调极速入口 */}
        {playerCount < room.maxPlayers && isOwner && (
          <button
            onClick={() => {
              audio.playClick();
              onAddBots();
            }}
            disabled={loading}
            className="w-full py-2.5 bg-sky-50 hover:bg-sky-100 dark:bg-cyber-card dark:hover:bg-cyber-card-hover text-sky-700 dark:text-neon-cyan border border-sky-200 dark:border-cyber-border text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition shadow-xs"
          >
            <Bot className="w-4 h-4 text-sky-600 dark:text-neon-cyan" />
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
              className={`w-full py-3.5 font-black text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md transition ${
                canStart
                  ? "btn-primary-neon active:scale-[0.99]"
                  : "bg-slate-200 dark:bg-cyber-card text-slate-400 dark:text-neutral-500 cursor-not-allowed border border-slate-300 dark:border-cyber-border-subtle"
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
            className={`w-full py-3.5 font-black text-sm rounded-2xl flex items-center justify-center gap-2 shadow-md transition ${
              currentPlayer.isReady
                ? "bg-white dark:bg-cyber-card border border-emerald-300 dark:border-neon-teal/50 text-emerald-700 dark:text-neon-teal shadow-xs"
                : "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/20 active:scale-[0.99] font-extrabold"
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
              className="bg-cyber-card border border-cyber-border-bright rounded-3xl p-6 max-w-xs w-full space-y-4 shadow-2xl text-center neon-glow-purple"
            >
              <div className="w-12 h-12 rounded-2xl bg-neon-purple/20 border border-neon-purple/40 flex items-center justify-center mx-auto text-neon-lightpurple">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-neutral-100 text-base">房间暗号已就绪</h3>
                <p className="text-xs text-neutral-400 mt-1">
                  微信好友直接打开小程序或网页，输入此口令即可秒速加入：
                </p>
              </div>
              <div className="bg-cyber-deep p-3 rounded-2xl border border-cyber-border text-2xl font-mono font-bold text-neon-lightpurple tracking-widest">
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
                className="w-full py-2.5 btn-primary-neon text-cyber-deep font-bold text-xs rounded-xl shadow transition"
              >
                复制房间口令并关闭
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 剧本切换与定制弹窗 */}
      <CustomThemeModal
        isOpen={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
        currentThemeId={room.themeId}
        onSelectTheme={handleSelectTheme}
        isOwner={isOwner}
      />

      {/* 房间开黑语音对讲抽屉 (免打字开麦畅聊) */}
      <RoomVoiceChat
        roomId={room.roomId}
        currentPlayer={currentPlayer}
        roomPlayers={room.players}
        voiceMessages={voiceMessages}
        onSendVoice={async (content, audioData, audioDuration) => {
          if (onSendVoice) {
            await onSendVoice(content, audioData, audioDuration);
          }
        }}
        isOpen={voiceChatOpen}
        onClose={() => setVoiceChatOpen(false)}
      />
    </div>
  );
};
