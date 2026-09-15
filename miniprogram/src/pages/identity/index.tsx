/**
 * AI局中局 - 身份解密页
 * 职责：翻牌查看本人秘密身份/绝密任务（仅本人可见），倒计时结束进辩论主控台
 */
import { useEffect, useRef, useState } from "react";
import Taro, { useUnload } from "@tarojs/taro";
import { View, Text, Button } from "@tarojs/components";
import { PlayerSecret, Team, GamePhase } from "../../types/game";
import { TaroGameAPI } from "../../services/api.taro";
import { taroSocketClient } from "../../services/socket.taro";
import { sessionStore, roomStore } from "../../store";
import "./index.css";

export default function IdentityPage() {
  const roomId = sessionStore.getRoomId();
  const user = sessionStore.getUser();
  const [secret, setSecret] = useState<PlayerSecret | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [error, setError] = useState("");
  const unsubRef = useRef<() => void>(() => {});
  const timerRef = useRef<any>(null);
  const navigatedRef = useRef(false);

  useEffect(() => {
    const { room, game } = roomStore.get();
    const gameId = game?.gameId || room?.currentGameId;
    if (!gameId) {
      Taro.showToast({ title: "对局尚未开始", icon: "none" });
      return;
    }

    // 获取本人专属秘密（服务端签名校验，只能看自己的）
    TaroGameAPI.getMySecret(gameId)
      .then(setSecret)
      .catch((err) => setError(err.message || "获取身份失败"));

    // 倒计时（以服务端 phaseEndsAt 为准）
    if (game?.phaseEndsAt) {
      timerRef.current = setInterval(() => {
        const left = Math.max(0, Math.ceil((game.phaseEndsAt - Date.now()) / 1000));
        setCountdown(left);
        if (left <= 0) goGame();
      }, 500);
    }

    // WS 阶段推进监听（兜底：别人推进阶段时同步跳转）
    if (user) {
      taroSocketClient.connect(roomId, user.playerId);
      unsubRef.current = taroSocketClient.subscribe((msg) => {
        if (msg.type === "ROOM_STATE" && msg.game) {
          roomStore.update(msg.room, msg.game);
          if (msg.game.phase === GamePhase.ROUND_1) goGame();
        }
      });
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useUnload(() => unsubRef.current());

  function goGame() {
    if (navigatedRef.current) return;
    navigatedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    Taro.redirectTo({ url: "/pages/game/index" });
  }

  const isSpy = secret?.team === Team.SPY;

  return (
    <View className="page-container identity-page">
      <Text className="identity-countdown">{countdown}s 后进入第一轮盘问</Text>

      {!revealed ? (
        <View className="secret-card hidden-card" onClick={() => setRevealed(true)}>
          <Text className="hidden-icon">🂠</Text>
          <Text className="hidden-text">点击翻开你的绝密身份</Text>
          <Text className="text-muted">注意遮挡，别被身边人偷看</Text>
        </View>
      ) : secret ? (
        <View className={`secret-card ${isSpy ? "spy-card" : "normal-card"}`}>
          <Text className="secret-team">{isSpy ? "🕵️ 你是潜伏内鬼" : "👨‍💼 你是无辜员工"}</Text>
          <Text className="secret-role">{secret.roleName}</Text>

          <View className="divider" />

          <Text className="secret-label">你的秘密行动</Text>
          <Text className="secret-body">{secret.secret}</Text>

          <Text className="secret-label">{isSpy ? "潜伏任务" : "自证目标"}</Text>
          <Text className="secret-body">{secret.mission}</Text>

          {secret.knownInformation?.length > 0 && (
            <>
              <Text className="secret-label">你掌握的线索</Text>
              {secret.knownInformation.map((info, i) => (
                <Text key={i} className="secret-clue">· {info}</Text>
              ))}
            </>
          )}

          {secret.trapMission && (
            <>
              <Text className="secret-label">🎣 钓鱼暗令</Text>
              <Text className="secret-body">
                诱导任意玩家说出「{secret.trapMission.keyword}」：{secret.trapMission.description}
              </Text>
            </>
          )}
        </View>
      ) : (
        <View className="secret-card hidden-card">
          <Text className="text-muted">{error || "身份解密中..."}</Text>
        </View>
      )}

      <Button className="btn-primary enter-btn" onClick={goGame}>
        我记住了，进入对局 →
      </Button>
    </View>
  );
}
