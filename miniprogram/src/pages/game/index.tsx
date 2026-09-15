/**
 * AI局中局 - 辩论主控台
 * 职责：剧情事件流、玩家发言、AI 导演点评、行动提交、阶段推进
 * 注：语音录制上传（RecorderManager → COS）为下一步任务，本版先支持文字发言
 */
import { useEffect, useRef, useState } from "react";
import Taro, { useUnload } from "@tarojs/taro";
import { View, Text, Button, Input, ScrollView } from "@tarojs/components";
import { Game, Room, GamePhase, ActionType, PlayerAction } from "../../types/game";
import { TaroGameAPI } from "../../services/api.taro";
import { taroSocketClient } from "../../services/socket.taro";
import { sessionStore, roomStore } from "../../store";
import "./index.css";

const PHASE_NAMES: Partial<Record<GamePhase, string>> = {
  [GamePhase.ROUND_1]: "第 1 轮 · 开场盘问",
  [GamePhase.ROUND_2]: "第 2 轮 · 物证曝光",
  [GamePhase.FINAL_ROUND]: "决赛轮 · 剧情大反转",
  [GamePhase.EXILE_RESULT]: "放逐结果公示",
};

const ACTION_TYPES = [
  { type: ActionType.CHAT, label: "💬 发言" },
  { type: ActionType.ACCUSE, label: "👉 质疑" },
  { type: ActionType.DEFEND, label: "🛡️ 辩护" },
  { type: ActionType.REVEAL, label: "🔦 公开线索" },
];

export default function GamePage() {
  const user = sessionStore.getUser();
  const roomId = sessionStore.getRoomId();
  const [game, setGame] = useState<Game | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [actionType, setActionType] = useState<ActionType>(ActionType.CHAT);
  const [targetId, setTargetId] = useState("");
  const [content, setContent] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [busy, setBusy] = useState(false);
  const unsubRef = useRef<() => void>(() => {});
  const timerRef = useRef<any>(null);
  const scrollRef = useRef<any>(null);
  const navigatedRef = useRef(false);

  const isOwner = !!room && !!user && room.ownerId === user.playerId;
  const me = room?.players.find((p) => p.playerId === user?.playerId);
  const amEliminated = !!me?.isEliminated;

  useEffect(() => {
    const snap = roomStore.get();
    if (snap.game) setGame(snap.game);
    if (snap.room) setRoom(snap.room);

    if (!user || !roomId) return;

    taroSocketClient.connect(roomId, user.playerId);
    unsubRef.current = taroSocketClient.subscribe((msg) => {
      if (msg.type === "ROOM_STATE") {
        if (msg.room) setRoom(msg.room);
        if (msg.game) {
          setGame(msg.game);
          roomStore.update(msg.room, msg.game);
          routeByPhase(msg.game.phase);
        }
      }
    });

    // 断线重连兜底：主动拉一次全量
    TaroGameAPI.getRoom(roomId).then(({ room: r, game: g }) => {
      setRoom(r);
      if (g) {
        setGame(g);
        routeByPhase(g.phase);
      }
    }).catch(() => {});
  }, []);

  // 阶段倒计时
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (game?.phaseEndsAt) {
      timerRef.current = setInterval(() => {
        setCountdown(Math.max(0, Math.ceil((game.phaseEndsAt - Date.now()) / 1000)));
      }, 500);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [game?.phase, game?.phaseEndsAt]);

  useUnload(() => {
    unsubRef.current();
    if (timerRef.current) clearInterval(timerRef.current);
  });

  function routeByPhase(phase: GamePhase) {
    if (navigatedRef.current) return;
    if (phase === GamePhase.MID_VOTING || phase === GamePhase.VOTING) {
      navigatedRef.current = true;
      Taro.redirectTo({ url: "/pages/voting/index" });
    } else if (phase === GamePhase.RESULT || phase === GamePhase.FINISHED || phase === GamePhase.SETTLEMENT) {
      navigatedRef.current = true;
      Taro.redirectTo({ url: "/pages/result/index" });
    }
  }

  async function handleSubmit() {
    const text = content.trim();
    if (!text || !game || busy) return;
    setBusy(true);
    try {
      // 先走内容安全预检，再提交
      const audit = await TaroGameAPI.auditText(text);
      if (!audit.pass) {
        Taro.showToast({ title: audit.reason || "内容未过审", icon: "none" });
        return;
      }
      await TaroGameAPI.submitAction(
        game.gameId,
        actionType,
        targetId || undefined,
        audit.filteredText
      );
      setContent("");
      setTargetId("");
    } catch (err: any) {
      Taro.showToast({ title: err.message, icon: "none" });
    } finally {
      setBusy(false);
    }
  }

  async function handleAdvance() {
    if (!game || !isOwner || busy) return;
    setBusy(true);
    try {
      await TaroGameAPI.advancePhase(game.gameId, game.version);
    } catch (err: any) {
      Taro.showToast({ title: err.message, icon: "none" });
    } finally {
      setBusy(false);
    }
  }

  async function handleCallDirector() {
    if (!game || busy) return;
    setBusy(true);
    try {
      await TaroGameAPI.requestAIDirectorInterrogation(game.gameId);
    } catch (err: any) {
      Taro.showToast({ title: err.message, icon: "none" });
    } finally {
      setBusy(false);
    }
  }

  if (!game || !room) {
    return (
      <View className="page-container">
        <Text className="text-muted">对局加载中...</Text>
      </View>
    );
  }

  const currentEvent = game.events[game.events.length - 1];
  const latestComment = game.aiComments?.[game.aiComments.length - 1];
  const others = room.players.filter((p) => p.playerId !== user?.playerId && !p.isEliminated);

  return (
    <View className="page-container game-page">
      {/* 阶段与倒计时 */}
      <View className="phase-bar">
        <Text className="phase-name">{PHASE_NAMES[game.phase] || game.themeName}</Text>
        <Text className="phase-countdown">⏱ {countdown}s</Text>
      </View>

      {/* 当前剧情事件 */}
      {currentEvent && (
        <View className="card event-card">
          <Text className="event-title">{currentEvent.title}</Text>
          <Text className="event-desc">{currentEvent.description}</Text>
          {currentEvent.publicClue && (
            <Text className="event-clue">🔍 {currentEvent.publicClue}</Text>
          )}
          {currentEvent.discussionPrompt && (
            <Text className="event-prompt">💬 {currentEvent.discussionPrompt}</Text>
          )}
        </View>
      )}

      {/* AI 导演实时点评 */}
      {latestComment && (
        <View className="director-bar">
          <Text className="director-text">
            🎬 AI导演：{latestComment.text}
          </Text>
        </View>
      )}

      {/* 发言流 */}
      <ScrollView scrollY className="action-feed" ref={scrollRef} scrollIntoView={`act_${game.actions.length}`}>
        {game.actions.length === 0 && (
          <Text className="text-muted feed-empty">还没有人发言，抢占先手带节奏吧！</Text>
        )}
        {game.actions.map((a: PlayerAction) => (
          <View key={a.actionId} className={`action-item ${a.playerId === user?.playerId ? "mine" : ""}`}>
            <Text className="action-meta">
              {a.playerName}
              {a.targetPlayerName ? ` → ${a.targetPlayerName}` : ""} ·{" "}
              {ACTION_TYPES.find((t) => t.type === a.type)?.label || a.type}
            </Text>
            <Text className="action-content">
              {a.isRevoked ? `【已撤回】${a.revocationReason || "内容违规"}` : a.content}
            </Text>
          </View>
        ))}
      </ScrollView>

      {/* 输入区 */}
      {!amEliminated ? (
        <View className="input-area">
          <View className="action-type-row">
            {ACTION_TYPES.map((t) => (
              <Text
                key={t.type}
                className={`type-chip ${actionType === t.type ? "active" : ""}`}
                onClick={() => setActionType(t.type)}
              >
                {t.label}
              </Text>
            ))}
          </View>

          {actionType === ActionType.ACCUSE || actionType === ActionType.DEFEND ? (
            <ScrollView scrollX className="target-row">
              <Text
                className={`target-chip ${!targetId ? "active" : ""}`}
                onClick={() => setTargetId("")}
              >
                不指定
              </Text>
              {others.map((p) => (
                <Text
                  key={p.playerId}
                  className={`target-chip ${targetId === p.playerId ? "active" : ""}`}
                  onClick={() => setTargetId(p.playerId)}
                >
                  {p.nickname}
                </Text>
              ))}
            </ScrollView>
          ) : null}

          <View className="input-row">
            <Input
              className="input-dark msg-input"
              placeholder="发表你的推理..."
              placeholderClass="text-muted"
              value={content}
              onInput={(e) => setContent(e.detail.value)}
              maxlength={200}
            />
            <Button className="send-btn" onClick={handleSubmit} disabled={busy || !content.trim()}>
              发送
            </Button>
          </View>
        </View>
      ) : (
        <View className="card">
          <Text className="text-muted">你已被放逐，正在旁观本局 👻</Text>
        </View>
      )}

      {/* 房主/导演操作 */}
      <View className="game-ops">
        <Button className="btn-secondary op-btn" onClick={handleCallDirector} disabled={busy}>
          🎬 呼叫AI导演评理
        </Button>
        {isOwner && (
          <Button className="btn-secondary op-btn" onClick={handleAdvance} disabled={busy}>
            ⏭ 推进下一阶段
          </Button>
        )}
      </View>
    </View>
  );
}
