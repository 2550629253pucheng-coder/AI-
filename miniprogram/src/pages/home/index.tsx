/**
 * AI局中局 - 首页
 * 职责：微信静默登录、创建房间、加入房间（含分享卡片带 roomCode 直达）
 */
import { useEffect, useState } from "react";
import Taro, { useRouter, useShareAppMessage } from "@tarojs/taro";
import { View, Text, Button, Input } from "@tarojs/components";
import { TaroGameAPI } from "../../services/api.taro";
import { sessionStore } from "../../store";
import "./index.css";

export default function HomePage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [compliance, setCompliance] = useState<any>(null);

  // 首页分享（拉新裂变主入口）
  useShareAppMessage(() => ({
    title: "【AI局中局】深夜密谈开局，AI导演在线搞事，速来破案！",
    path: "/pages/home/index",
  }));

  useEffect(() => {
    // 拉取合规公示信息（适龄提示、AI 备案声明）
    TaroGameAPI.getComplianceInfo()
      .then((res) => setCompliance(res))
      .catch(() => {});

    // 分享卡片带入的房间码
    const sharedCode = router.params?.roomCode;
    if (sharedCode) {
      setRoomCode(sharedCode.toUpperCase());
    }

    // 已有会话则免登录
    const existing = sessionStore.getUser();
    if (existing && TaroGameAPI.getToken()) {
      setNickname(existing.nickname);
      setLoggedIn(true);
      if (sharedCode) {
        handleJoin(sharedCode.toUpperCase(), existing.nickname);
      }
    }
  }, []);

  async function ensureLogin(name: string) {
    const existing = sessionStore.getUser();
    if (existing && TaroGameAPI.getToken()) return existing;
    const finalName = name.trim() || `探员_${Math.random().toString(36).slice(2, 6)}`;
    const { user } = await TaroGameAPI.wxLogin(finalName);
    const session = {
      openid: user.openid,
      playerId: `p_${user.openid}`,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
    };
    sessionStore.setUser(session);
    setLoggedIn(true);
    return session;
  }

  async function handleCreate() {
    if (loading) return;
    setLoading(true);
    try {
      const user = await ensureLogin(nickname);
      const room = await TaroGameAPI.createRoom({
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
      });
      sessionStore.setRoomId(room.roomId);
      Taro.navigateTo({ url: "/pages/lobby/index" });
    } catch (err: any) {
      Taro.showToast({ title: err.message || "创建失败", icon: "none" });
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(code?: string, name?: string) {
    const finalCode = (code || roomCode).trim().toUpperCase();
    if (!finalCode) {
      Taro.showToast({ title: "请输入 6 位房间码", icon: "none" });
      return;
    }
    if (loading) return;
    setLoading(true);
    try {
      const user = await ensureLogin(name || nickname);
      const { room } = await TaroGameAPI.joinRoom(finalCode, {
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
      });
      sessionStore.setRoomId(room.roomId);
      Taro.navigateTo({ url: "/pages/lobby/index" });
    } catch (err: any) {
      Taro.showToast({ title: err.message || "加入失败", icon: "none" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="page-container home-page">
      <View className="hero">
        <Text className="hero-title">AI局中局</Text>
        <Text className="hero-subtitle">熟人社交推理 · AI导演在线搞事</Text>
        <View className="hero-badges">
          <Text className="tag">4-8人</Text>
          <Text className="tag">语音对局</Text>
          <Text className="tag">剧情大反转</Text>
        </View>
      </View>

      <View className="card">
        <Text className="card-title">你的代号</Text>
        <Input
          className="input-dark"
          placeholder={loggedIn ? nickname : "输入昵称（可留空自动生成）"}
          placeholderClass="text-muted"
          value={nickname}
          onInput={(e) => setNickname(e.detail.value)}
          maxlength={16}
        />
      </View>

      <View className="card">
        <Button
          className={`btn-primary ${loading ? "btn-disabled" : ""}`}
          onClick={handleCreate}
          disabled={loading}
        >
          {loading ? "处理中..." : "🎬 创建新局（我当房主）"}
        </Button>
      </View>

      <View className="card">
        <Text className="card-title">加入好友的局</Text>
        <Input
          className="input-dark code-input"
          placeholder="输入 6 位房间码"
          placeholderClass="text-muted"
          value={roomCode}
          onInput={(e) => setRoomCode(e.detail.value.toUpperCase())}
          maxlength={6}
        />
        <Button
          className={`btn-secondary join-btn ${loading ? "btn-disabled" : ""}`}
          onClick={() => handleJoin()}
          disabled={loading}
        >
          🔍 加入房间
        </Button>
      </View>

      <View className="compliance-footer">
        <Text className="text-muted">适龄提示：16+ · 本游戏含 AI 生成内容，已做显著标识</Text>
        {compliance?.aiFilingNotice && (
          <Text className="text-muted compliance-notice">{compliance.aiFilingNotice}</Text>
        )}
      </View>
    </View>
  );
}
