/**
 * AI局中局 - 候场大厅
 * 职责：成员列表、准备状态、剧本选择、加 AI 好友、分享裂变拉人、房主开局
 */
import { useEffect, useRef, useState } from "react";
import Taro, { useShareAppMessage, useUnload } from "@tarojs/taro";
import { View, Text, Button, Image, ScrollView } from "@tarojs/components";
import { Room, RoomPlayer, ThemeTemplate } from "../../types/game";
import { TaroGameAPI } from "../../services/api.taro";
import { taroSocketClient } from "../../services/socket.taro";
import { sessionStore, roomStore } from "../../store";
import "./index.css";

export default function LobbyPage() {
  const user = sessionStore.getUser();
  const roomId = sessionStore.getRoomId();
  const [room, setRoom] = useState<Room | null>(null);
  const [presets, setPresets] = useState<ThemeTemplate[]>([]);
  const [showThemes, setShowThemes] = useState(false);
  const [busy, setBusy] = useState(false);
  const unsubRef = useRef<() => void>(() => {});

  const isOwner = !!room && !!user && room.ownerId === user.playerId;
  const me: RoomPlayer | undefined = room?.players.find((p) => p.playerId === user?.playerId);
  const allReady = !!room && room.players.every((p) => p.isReady || p.isBot);
  const canStart = isOwner && allReady && (room?.players.length || 0) >= (room?.minPlayers || 4);

  // 分享裂变核心：自定义卡片带房间码，好友点开直接进房
  useShareAppMessage(() => ({
    title: room
      ? `【AI局中局】房间号 ${room.roomCode}，${room.players.length}/${room.maxPlayers} 缺你开庭，速来破案！`
      : "【AI局中局】深夜密谈开局，速来破案！",
    path: room ? `/pages/home/index?roomCode=${room.roomCode}` : "/pages/home/index",
  }));

  useEffect(() => {
    if (!roomId || !user) {
      Taro.redirectTo({ url: "/pages/home/index" });
      return;
    }

    // 1. 拉全量房间状态
    TaroGameAPI.getRoom(roomId)
      .then(({ room: r }) => {
        setRoom(r);
        roomStore.update(r, null);
      })
      .catch((err) => {
        Taro.showToast({ title: err.message || "房间不存在", icon: "none" });
        Taro.redirectTo({ url: "/pages/home/index" });
      });

    // 2. 拉预设剧本
    TaroGameAPI.getPresetThemes().then(setPresets).catch(() => {});

    // 3. 建立 WS 实时同步
    taroSocketClient.connect(roomId, user.playerId);
    unsubRef.current = taroSocketClient.subscribe((msg) => {
      if (msg.type === "ROOM_STATE" && msg.room) {
        setRoom(msg.room);
        roomStore.update(msg.room, msg.game || null);
        // 游戏开始 → 全员跳转身份解密页
        if (msg.room.status === "PLAYING" && msg.game) {
          Taro.redirectTo({ url: "/pages/identity/index" });
        }
      }
    });
  }, []);

  useUnload(() => {
    unsubRef.current();
  });

  async function handleToggleReady() {
    if (!room || !me || busy) return;
    setBusy(true);
    try {
      await TaroGameAPI.setReady(room.roomId, !me.isReady);
    } catch (err: any) {
      Taro.showToast({ title: err.message, icon: "none" });
    } finally {
      setBusy(false);
    }
  }

  async function handleAddBots() {
    if (!room || busy) return;
    setBusy(true);
    try {
      await TaroGameAPI.addBots(room.roomId, 6);
      Taro.showToast({ title: "AI 好友已就位", icon: "none" });
    } catch (err: any) {
      Taro.showToast({ title: err.message, icon: "none" });
    } finally {
      setBusy(false);
    }
  }

  async function handlePickTheme(theme: ThemeTemplate) {
    if (!room || !isOwner || busy) return;
    setBusy(true);
    try {
      await TaroGameAPI.setRoomTheme(room.roomId, theme);
      setShowThemes(false);
      Taro.showToast({ title: "剧本已更换", icon: "none" });
    } catch (err: any) {
      Taro.showToast({ title: err.message, icon: "none" });
    } finally {
      setBusy(false);
    }
  }

  async function handleStart() {
    if (!room || !canStart || busy) return;
    setBusy(true);
    try {
      await TaroGameAPI.startGame(room.roomId);
      // 跳转由 WS ROOM_STATE 推送统一触发，避免双跳
    } catch (err: any) {
      Taro.showToast({ title: err.message, icon: "none" });
      setBusy(false);
    }
  }

  async function handleLeave() {
    if (!room) return;
    try {
      await TaroGameAPI.leaveRoom(room.roomId);
    } catch {}
    taroSocketClient.disconnect();
    sessionStore.setRoomId("");
    Taro.redirectTo({ url: "/pages/home/index" });
  }

  if (!room) {
    return (
      <View className="page-container">
        <Text className="text-muted">正在进入房间...</Text>
      </View>
    );
  }

  return (
    <View className="page-container lobby-page">
      {/* 房间码 + 分享 */}
      <View className="card room-code-card">
        <Text className="text-muted">房间码（点右上角分享给好友）</Text>
        <View className="room-code-row">
          <Text className="room-code">{room.roomCode}</Text>
          <Button
            className="copy-btn"
            onClick={() => {
              Taro.setClipboardData({ data: room.roomCode });
            }}
          >
            复制
          </Button>
        </View>
        <Text className="text-muted">
          {room.players.length}/{room.maxPlayers} 人 · 满 {room.minPlayers} 人可开局
        </Text>
      </View>

      {/* 当前剧本 */}
      <View className="card">
        <View className="theme-header">
          <Text className="card-title">📜 {room.themeName || "公司深夜密谈（默认）"}</Text>
          {isOwner && (
            <Text className="text-accent theme-switch" onClick={() => setShowThemes(!showThemes)}>
              {showThemes ? "收起" : "换剧本"}
            </Text>
          )}
        </View>
        {room.themeBackground && <Text className="text-muted theme-bg">{room.themeBackground}</Text>}
        {showThemes && (
          <ScrollView scrollY className="theme-list">
            {presets.map((t) => (
              <View key={t.themeId} className="theme-item" onClick={() => handlePickTheme(t)}>
                <Text className="theme-item-name">{t.themeName}</Text>
                <Text className="text-muted theme-item-bg">{t.background}</Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* 成员列表 */}
      <View className="card">
        <Text className="card-title">在场玩家</Text>
        <View className="player-grid">
          {room.players.map((p) => (
            <View key={p.playerId} className="player-cell">
              <Image className="player-avatar" src={p.avatarUrl} mode="aspectFill" />
              <Text className="player-name" numberOfLines={1}>
                {p.isOwner ? "👑 " : ""}
                {p.nickname}
                {p.isBot ? " 🤖" : ""}
              </Text>
              <Text className={`player-status ${p.isReady ? "ready" : ""}`}>
                {p.isReady ? "已准备" : "未准备"}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* 操作区 */}
      <View className="lobby-actions">
        {!isOwner && (
          <Button className="btn-primary" onClick={handleToggleReady} disabled={busy}>
            {me?.isReady ? "取消准备" : "✋ 准备"}
          </Button>
        )}
        {isOwner && (
          <>
            <Button
              className={`btn-primary ${!canStart ? "btn-disabled" : ""}`}
              onClick={handleStart}
              disabled={!canStart || busy}
            >
              {busy ? "开局中..." : `🚀 开始游戏（${room.players.length}人）`}
            </Button>
            {!allReady && <Text className="text-muted start-hint">等待全员准备...</Text>}
            <Button className="btn-secondary bots-btn" onClick={handleAddBots} disabled={busy}>
              🤖 摇 AI 好友凑局
            </Button>
          </>
        )}
        <Button className="btn-danger leave-btn" onClick={handleLeave}>
          离开房间
        </Button>
      </View>
    </View>
  );
}
