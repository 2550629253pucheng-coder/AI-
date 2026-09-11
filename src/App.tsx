import React, { useState, useEffect, useCallback, useRef } from "react";
import { WeChatFrame } from "./components/WeChatFrame.js";
import { HomeScreen } from "./components/HomeScreen.js";
import { LobbyScreen } from "./components/LobbyScreen.js";
import { IdentityScreen } from "./components/IdentityScreen.js";
import { MainGameScreen } from "./components/MainGameScreen.js";
import { VotingScreen } from "./components/VotingScreen.js";
import { ResultScreen } from "./components/ResultScreen.js";
import { ShareCardModal } from "./components/ShareCardModal.js";
import { api, UserSession } from "./services/api.js";
import { Room, Game, GamePhase, RoomPlayer, PlayerSecret, ActionType } from "./types/game.js";
import { audio } from "./utils/audio.js";
import { track } from "./utils/analytics.js";

export default function App() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<RoomPlayer | null>(null);
  const [secret, setSecret] = useState<PlayerSecret | null>(null);
  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  // Polling ref
  const pollingTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // 1. 初始化登录与读取URL房间参数
  useEffect(() => {
    const init = async () => {
      try {
        const storedUser = localStorage.getItem("ai_party_user");
        const storedToken = localStorage.getItem("ai_impostor_token");
        let activeUser: UserSession;

        if (storedUser && storedToken) {
          activeUser = JSON.parse(storedUser);
          api.setToken(storedToken);
        } else {
          const loginRes = await api.login();
          activeUser = loginRes.user;
          localStorage.setItem("ai_party_user", JSON.stringify(activeUser));
        }
        setUser(activeUser);

        // 检查URL是否携带roomCode参数 (微信好友分享直接唤醒)
        const params = new URLSearchParams(window.location.search);
        const codeFromUrl = params.get("room");
        if (codeFromUrl && activeUser) {
          try {
            const res = await api.joinRoom(codeFromUrl, activeUser);
            setRoom(res.room);
            setCurrentPlayer(res.player);
            audio.playJoin();
            showToast(`已加入房间 ${res.room.roomCode}`);
            track("room_join", { roomId: res.room.roomId, roomCode: res.room.roomCode, viaUrl: true });
          } catch (e: any) {
            console.warn("Auto-join url room failed:", e.message);
          }
        }
      } catch (err: any) {
        console.error("Init login failed:", err);
      }
    };
    init();
  }, []);

  // 2. 轮询房间与游戏状态 (多人实时同步)
  const syncRoomState = useCallback(async () => {
    if (!room?.roomId) return;
    try {
      const state = await api.getRoomState(room.roomId);
      setRoom(state.room);
      setGame(state.game || null);

      // 同步当前玩家引用
      if (currentPlayer) {
        const updatedMe = state.room.players.find((p) => p.playerId === currentPlayer.playerId);
        if (updatedMe) {
          setCurrentPlayer(updatedMe);
        }
      }
    } catch (err) {
      console.warn("Sync room error:", err);
    }
  }, [room?.roomId, currentPlayer?.playerId]);

  useEffect(() => {
    if (!room?.roomId) return;
    syncRoomState();
    pollingTimerRef.current = setInterval(syncRoomState, 2000);
    return () => {
      if (pollingTimerRef.current) clearInterval(pollingTimerRef.current);
    };
  }, [room?.roomId, syncRoomState]);

  // 3. 进入游戏或切换玩家时，拉取私密身份 (权限安全隔离)
  useEffect(() => {
    const fetchSecret = async () => {
      if (!game?.gameId || !currentPlayer?.playerId) {
        setSecret(null);
        return;
      }
      try {
        const s = await api.getMySecret(game.gameId);
        setSecret(s);
        track("identity_view", { gameId: game.gameId, team: s.team, role: s.roleName });
      } catch (err) {
        // ignore
      }
    };
    fetchSecret();
  }, [game?.gameId, currentPlayer?.playerId]);

  // 4. 用户交互处理
  const handleUpdateUser = (updated: UserSession) => {
    setUser(updated);
    localStorage.setItem("ai_party_user", JSON.stringify(updated));
    showToast("个人信息已保存");
  };

  const handleCreateRoom = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const newRoom = await api.createRoom(user);
      setRoom(newRoom);
      setCurrentPlayer(newRoom.players[0]);
      audio.playJoin();
      showToast(`房间创建成功，房号：${newRoom.roomCode}`);
      track("room_create", { roomId: newRoom.roomId, roomCode: newRoom.roomCode });
    } catch (err: any) {
      showToast(`创建失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRoom = async (code: string) => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.joinRoom(code, user);
      setRoom(res.room);
      setCurrentPlayer(res.player);
      audio.playJoin();
      showToast(`成功加入房间 ${res.room.roomCode}`);
      track("room_join", { roomId: res.room.roomId, roomCode: res.room.roomCode });
    } catch (err: any) {
      showToast(`加入失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!room || !currentPlayer) return;
    try {
      await api.leaveRoom(room.roomId);
    } catch (e) {
      // ignore
    }
    setRoom(null);
    setGame(null);
    setCurrentPlayer(null);
    setSecret(null);
    showToast("已退出房间");
  };

  const handleToggleReady = async () => {
    if (!room || !currentPlayer) return;
    setLoading(true);
    try {
      const nextReady = !currentPlayer.isReady;
      const updatedRoom = await api.setReady(room.roomId, nextReady);
      setRoom(updatedRoom);
      const updatedMe = updatedRoom.players.find((p) => p.playerId === currentPlayer.playerId);
      if (updatedMe) setCurrentPlayer(updatedMe);
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBots = async () => {
    if (!room) return;
    setLoading(true);
    try {
      const updated = await api.addBots(room.roomId, 6);
      setRoom(updated);
      audio.playJoin();
      showToast("已为你补齐测试好友！");
    } catch (err: any) {
      showToast(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartGame = async () => {
    if (!room || !currentPlayer) return;
    setLoading(true);
    try {
      const res = await api.startGame(room.roomId);
      setRoom(res.room);
      setGame(res.game);
      audio.playReveal();
      showToast("游戏开始！正在下发绝密身份");
      track("game_start", { gameId: res.game.gameId, playerCount: res.room.players.length });
    } catch (err: any) {
      showToast(err.message === "PLAYER_NOT_READY" ? "还有玩家未准备" : `开局失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAdvancePhase = async () => {
    if (!game) return;
    setLoading(true);
    try {
      const res = await api.advancePhase(game.gameId, game.version);
      setGame(res.game);
      setRoom(res.room);
      audio.playReveal();
      track("phase_advance", { gameId: game.gameId, targetPhase: res.game.phase });
    } catch (err: any) {
      // 乐观锁冲突时自动重新拉取最新状态
      syncRoomState();
      showToast(`推进阶段: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAction = async (type: ActionType, targetPlayerId?: string, content?: string) => {
    if (!game || !currentPlayer) return;
    setLoading(true);
    try {
      const res = await api.submitAction(game.gameId, type, targetPlayerId, content);
      setGame(res.game);
      setRoom(res.room);
      showToast("行动已公开发表！");
      track("action_submit", { gameId: game.gameId, type, round: game.round });
    } catch (err: any) {
      showToast(`提交失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitVote = async (targetPlayerId: string) => {
    if (!game || !currentPlayer) return;
    setLoading(true);
    try {
      const res = await api.submitVote(game.gameId, targetPlayerId);
      setGame(res.game);
      setRoom(res.room);
      showToast("指认投票已锁定！");
      track("vote_submit", { gameId: game.gameId, targetPlayerId });
    } catch (err: any) {
      showToast(`投票失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // P0 再来一局 (One More Game)
  const handleRestartGame = async () => {
    if (!room || !currentPlayer) return;
    setLoading(true);
    try {
      const res = await api.restartGame(room.roomId);
      setRoom(res.room);
      setGame(res.game);
      audio.playReveal();
      showToast("新一局开启！原班人马已重新分配绝密身份");
      track("restart_click", { roomId: room.roomId });
    } catch (err: any) {
      showToast(`再来一局失败: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 辅助调试：让全场机器人自动行动
  const handleTriggerBots = async () => {
    if (!game) return;
    try {
      const res = await api.triggerBotActions(game.gameId);
      setGame(res.game);
      setRoom(res.room);
      showToast("已模拟全员自动行动！");
    } catch (err: any) {
      showToast(err.message);
    }
  };

  // 切换席位视角 (用于在单一浏览器内直接测试多玩家视角)
  const handleSwitchPlayer = async (player: RoomPlayer) => {
    try {
      // 切换当前用户的身份与鉴权令牌
      const loginRes = await api.login(player.nickname, player.openid);
      setUser(loginRes.user);
      setCurrentPlayer(player);
      audio.playClick();
      showToast(`已切换至【${player.nickname}】视角`);
      track("seat_switch", { playerId: player.playerId, isBot: player.isBot });
    } catch (e: any) {
      showToast(`切换视角失败: ${e.message}`);
    }
  };

  // 页面流转路由判定
  const renderContent = () => {
    if (!user) {
      return (
        <div className="flex-1 flex items-center justify-center text-neutral-400 text-xs">
          正在加载微信小游戏环境...
        </div>
      );
    }

    if (!room) {
      return (
        <HomeScreen
          user={user}
          onUpdateUser={handleUpdateUser}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          loading={loading}
        />
      );
    }

    if (!game || room.status === "WAITING") {
      return (
        <LobbyScreen
          room={room}
          currentPlayer={currentPlayer || room.players[0]}
          onToggleReady={handleToggleReady}
          onStartGame={handleStartGame}
          onAddBots={handleAddBots}
          onLeaveRoom={handleLeaveRoom}
          loading={loading}
        />
      );
    }

    // 游戏中阶段分支
    switch (game.phase) {
      case GamePhase.ROLE_ASSIGNMENT:
        return (
          <IdentityScreen
            secret={
              secret || {
                playerId: currentPlayer?.playerId || "",
                team: 0 as any,
                roleName: currentPlayer?.publicRoleName || "职员",
                secret: "正在解密中...",
                mission: "正在解密中...",
                knownInformation: [],
              }
            }
            phaseEndsAt={game.phaseEndsAt}
            onProceed={handleAdvancePhase}
            canProceed={Boolean(currentPlayer?.isOwner)}
          />
        );

      case GamePhase.ROUND_1:
      case GamePhase.ROUND_2:
      case GamePhase.ROUND_3:
        return (
          <MainGameScreen
            game={game}
            currentPlayer={currentPlayer || room.players[0]}
            roomPlayers={room.players}
            secret={secret || undefined}
            onSubmitAction={handleSubmitAction}
            onAdvancePhase={handleAdvancePhase}
            onTriggerBots={handleTriggerBots}
            loading={loading}
          />
        );

      case GamePhase.VOTING:
        return (
          <VotingScreen
            game={game}
            currentPlayer={currentPlayer || room.players[0]}
            roomPlayers={room.players}
            onSubmitVote={handleSubmitVote}
            onTriggerBots={handleTriggerBots}
            onForceSettle={handleAdvancePhase}
            loading={loading}
          />
        );

      case GamePhase.SETTLEMENT:
      case GamePhase.RESULT:
      case GamePhase.FINISHED:
        return (
          <ResultScreen
            game={game}
            currentPlayer={currentPlayer || room.players[0]}
            roomPlayers={room.players}
            onRestartGame={handleRestartGame}
            onReturnHome={handleLeaveRoom}
            onOpenShareModal={() => setShowShareModal(true)}
            loading={loading}
          />
        );

      default:
        return (
          <div className="flex-1 flex items-center justify-center text-xs text-neutral-400">
            正在推进游戏阶段...
          </div>
        );
    }
  };

  return (
    <WeChatFrame
      activePlayer={currentPlayer || undefined}
      roomPlayers={room?.players || []}
      onSwitchPlayer={handleSwitchPlayer}
      onRefresh={syncRoomState}
    >
      {renderContent()}

      {/* 浮动轻提示 Toast */}
      {toastMessage && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-neutral-850/95 border border-amber-500/50 text-amber-300 text-xs px-4 py-2 rounded-full shadow-2xl backdrop-blur animate-fade-in pointer-events-none flex items-center gap-1.5 whitespace-nowrap">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 战报分享弹窗 */}
      {showShareModal && game && room && (
        <ShareCardModal
          game={game}
          roomPlayers={room.players}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </WeChatFrame>
  );
}
