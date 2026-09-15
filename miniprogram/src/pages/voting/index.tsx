/**
 * AI局中局 - 审判投票页
 * 职责：中期放逐投票（MID_VOTING）与终局审判投票（VOTING）
 */
import { useEffect, useRef, useState } from "react";
import Taro, { useUnload } from "@tarojs/taro";
import { View, Text, Button, Image } from "@tarojs/components";
import { Game, Room, GamePhase } from "../../types/game";
import { TaroGameAPI } from "../../services/api.taro";
import { taroSocketClient } from "../../services/socket.taro";
import { sessionStore, roomStore } from "../../store";
import "./index.css";

export default function VotingPage() {
  const user = sessionStore.getUser();
  const roomId = sessionStore.getRoomId();
  const [game, setGame] = useState<Game | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [selected, setSelected] = useState("");
  const [voted, setVoted] = useState(false);
  const [busy, setBusy] = useState(false);
  const unsubRef = useRef<() => void>(() => {});
  const navigatedRef = useRef(false);

  const isMidVoting = game?.phase === GamePhase.MID_VOTING;
  const me = room?.players.find((p) => p.playerId === user?.playerId);
  const amEliminated = !!me?.isEliminated;
  const candidates = room?.players.filter((p) => p.playerId !== user?.playerId && !p.isEliminated) || [];
  const votes = isMidVoting ? game?.midVotes || [] : game?.votes || [];
  const totalVoters = room?.players.filter((p) => !p.isEliminated).length || 0;

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
          // 阶段流转：放逐结果 → 回主控台；终局 → 结算页
          if (!navigatedRef.current) {
            if (msg.game.phase === GamePhase.EXILE_RESULT || msg.game.phase === GamePhase.FINAL_ROUND) {
              navigatedRef.current = true;
              Taro.redirectTo({ url: "/pages/game/index" });
            } else if (
              msg.game.phase === GamePhase.RESULT ||
              msg.game.phase === GamePhase.FINISHED ||
              msg.game.phase === GamePhase.SETTLEMENT
            ) {
              navigatedRef.current = true;
              Taro.redirectTo({ url: "/pages/result/index" });
            }
          }
        }
      }
    });
  }, []);

  useUnload(() => unsubRef.current());

  async function handleVote() {
    if (!game || !selected || voted || busy) return;
    setBusy(true);
    try {
      if (isMidVoting) {
        await TaroGameAPI.submitMidVote(game.gameId, selected);
      } else {
        await TaroGameAPI.submitVote(game.gameId, selected);
      }
      setVoted(true);
      Taro.showToast({ title: "投票成功", icon: "none" });
    } catch (err: any) {
      Taro.showToast({ title: err.message, icon: "none" });
    } finally {
      setBusy(false);
    }
  }

  if (!game || !room) {
    return (
      <View className="page-container">
        <Text className="text-muted">投票加载中...</Text>
      </View>
    );
  }

  return (
    <View className="page-container voting-page">
      <View className="voting-header">
        <Text className="voting-title">{isMidVoting ? "⚡ 中期放逐公投" : "⚖️ 终极审判"}</Text>
        <Text className="text-muted">
          {isMidVoting
            ? "票数最高者将被当场放逐出局！"
            : "指认你认定的内鬼，好人抓出全部内鬼即胜利"}
        </Text>
        <Text className="vote-progress">
          已投 {votes.length}/{totalVoters} 票
        </Text>
      </View>

      {amEliminated ? (
        <View className="card">
          <Text className="text-muted">你已被放逐，无权投票，旁观审判中 👻</Text>
        </View>
      ) : voted || me?.hasVoted ? (
        <View className="card voted-card">
          <Text className="voted-text">✅ 你的票已投出</Text>
          <Text className="text-muted">等待其他玩家投票...</Text>
        </View>
      ) : (
        <>
          <View className="candidate-list">
            {candidates.map((p) => (
              <View
                key={p.playerId}
                className={`candidate-item ${selected === p.playerId ? "selected" : ""}`}
                onClick={() => setSelected(p.playerId)}
              >
                <Image className="candidate-avatar" src={p.avatarUrl} mode="aspectFill" />
                <View className="candidate-info">
                  <Text className="candidate-name">{p.nickname}</Text>
                  <Text className="text-muted">{p.publicRoleName || "嫌疑人"}</Text>
                </View>
                {selected === p.playerId && <Text className="check-icon">✓</Text>}
              </View>
            ))}
          </View>

          <Button
            className={`btn-primary vote-btn ${!selected ? "btn-disabled" : ""}`}
            onClick={handleVote}
            disabled={!selected || busy}
          >
            {busy ? "提交中..." : isMidVoting ? "🗳 放逐此人" : "🗳 指认内鬼"}
          </Button>
        </>
      )}
    </View>
  );
}
