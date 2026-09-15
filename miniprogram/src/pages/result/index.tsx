/**
 * AI局中局 - 终局结算页
 * 职责：胜负公示、内鬼揭晓、AI 复盘战报、玩家称号、再来一局
 */
import { useEffect, useRef, useState } from "react";
import Taro, { useShareAppMessage, useUnload } from "@tarojs/taro";
import { View, Text, Button, ScrollView } from "@tarojs/components";
import { Game, Room, Team, GamePhase } from "../../types/game";
import { TaroGameAPI } from "../../services/api.taro";
import { taroSocketClient } from "../../services/socket.taro";
import { sessionStore, roomStore } from "../../store";
import "./index.css";

export default function ResultPage() {
  const user = sessionStore.getUser();
  const roomId = sessionStore.getRoomId();
  const [game, setGame] = useState<Game | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [busy, setBusy] = useState(false);
  const unsubRef = useRef<() => void>(() => {});
  const navigatedRef = useRef(false);

  const isOwner = !!room && !!user && room.ownerId === user.playerId;

  // 战报分享（传播物料）
  useShareAppMessage(() => {
    const winner =
      game?.winnerTeam === Team.NORMAL ? "好人阵营大获全胜" :
      game?.winnerTeam === "TIE" ? "平局收场，全员戏精" : "内鬼瞒天过海";
    return {
      title: `【AI局中局】${winner}！${game?.report?.bestDetective || "快来围观这局神操作"}`,
      path: "/pages/home/index",
    };
  });

  useEffect(() => {
    const snap = roomStore.get();
    if (snap.game) setGame(snap.game);
    if (snap.room) setRoom(snap.room);

    if (!user || !roomId) return;

    // 主动拉一次全量，确保拿到最终战报
    TaroGameAPI.getRoom(roomId).then(({ room: r, game: g }) => {
      setRoom(r);
      if (g) setGame(g);
    }).catch(() => {});

    taroSocketClient.connect(roomId, user.playerId);
    unsubRef.current = taroSocketClient.subscribe((msg) => {
      if (msg.type === "ROOM_STATE") {
        if (msg.room) setRoom(msg.room);
        if (msg.game) {
          setGame(msg.game);
          roomStore.update(msg.room, msg.game);
          // 再来一局：房间回到大厅或新对局开始
          if (!navigatedRef.current && msg.room.status === "PLAYING" &&
              (msg.game.phase === GamePhase.ROLE_ASSIGNMENT || msg.game.phase === GamePhase.PREPARING)) {
            navigatedRef.current = true;
            Taro.redirectTo({ url: "/pages/identity/index" });
          } else if (!navigatedRef.current && msg.room.status === "WAITING") {
            navigatedRef.current = true;
            Taro.redirectTo({ url: "/pages/lobby/index" });
          }
        }
      }
    });
  }, []);

  useUnload(() => unsubRef.current());

  async function handleRestart() {
    if (!room || !isOwner || busy) return;
    setBusy(true);
    try {
      await TaroGameAPI.restartGame(room.roomId);
      // 跳转由 WS 推送统一触发
    } catch (err: any) {
      Taro.showToast({ title: err.message, icon: "none" });
      setBusy(false);
    }
  }

  function handleBackHome() {
    taroSocketClient.disconnect();
    sessionStore.setRoomId("");
    Taro.redirectTo({ url: "/pages/home/index" });
  }

  if (!game || !room) {
    return (
      <View className="page-container">
        <Text className="text-muted">战报生成中...</Text>
      </View>
    );
  }

  const winnerText =
    game.winnerTeam === Team.NORMAL ? "🎉 好人阵营胜利！" :
    game.winnerTeam === "TIE" ? "🤝 平局！全员戏精" :
    game.winnerTeam === Team.SPY ? "😈 内鬼阵营胜利！" : "对局结束";
  const report = game.report;

  return (
    <ScrollView scrollY className="page-container result-page">
      <View className="result-hero">
        <Text className="result-title">{winnerText}</Text>
      </View>

      {/* 内鬼揭晓 */}
      {game.revealedSpies && game.revealedSpies.length > 0 && (
        <View className="card spy-reveal-card">
          <Text className="card-title">🎭 内鬼揭晓</Text>
          {game.revealedSpies.map((s) => (
            <Text key={s.playerId} className="spy-name">
              {s.name}（{s.roleName}）
            </Text>
          ))}
        </View>
      )}

      {/* AI 复盘战报 */}
      {report && (
        <View className="card report-card">
          <Text className="card-title">🎬 AI 导演赛后战报</Text>
          <Text className="report-summary">{report.summary}</Text>
          <View className="divider" />
          <Text className="report-line">🕵️ 推理王：{report.bestDetective}</Text>
          <Text className="report-line">🎭 最佳戏精：{report.bestActor}</Text>
          <Text className="report-line">😂 爆笑名场面：{report.funniestMoment}</Text>
          <Text className="report-line">⚡ 最大反转：{report.biggestTwist}</Text>
          {report.trapAchievement && (
            <Text className="report-line trap-line">
              🎣 钓鱼暗令达成：{report.trapAchievement.spyName} 诱导 {report.trapAchievement.victimName} 说出「
              {report.trapAchievement.keyword}」！{report.trapAchievement.bonusNotice}
            </Text>
          )}
          <Text className="text-muted watermark">本战报由 AI 生成，仅供娱乐</Text>
        </View>
      )}

      {/* 玩家称号 */}
      {report?.playerTags && report.playerTags.length > 0 && (
        <View className="card">
          <Text className="card-title">🏅 全员称号</Text>
          {report.playerTags.map((t) => (
            <View key={t.playerId} className="tag-item">
              <View className="tag-item-header">
                <Text className="tag-player">{t.playerName}</Text>
                <Text className="tag-title">「{t.title}」</Text>
              </View>
              <Text className="text-muted">{t.comment}</Text>
            </View>
          ))}
        </View>
      )}

      {/* 操作 */}
      <View className="result-ops">
        {isOwner ? (
          <Button className="btn-primary" onClick={handleRestart} disabled={busy}>
            {busy ? "重开中..." : "🔄 再来一局（原班人马）"}
          </Button>
        ) : (
          <Text className="text-muted wait-owner">等待房主发起「再来一局」...</Text>
        )}
        <Button className="btn-secondary home-btn" onClick={handleBackHome}>
          返回首页
        </Button>
      </View>
    </ScrollView>
  );
}
