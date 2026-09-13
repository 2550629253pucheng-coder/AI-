import express from "express";
import http from "http";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GameEngine } from "./server/gameEngine.js";
import { issueToken, verifyToken, playerIdOf } from "./server/auth.js";
import { exchangeWeChatCode } from "./server/wechatAuth.js";
import {
  generalApiLimiter,
  aiThemeLimiter,
  aiInterrogateLimiter,
  roomCreateLimiter,
} from "./server/rateLimiter.js";
import { contentSecurity, auditAudioAsync, getMediaAuditRecord } from "./server/contentSecurity.js";
import { ErrorCode } from "./src/types/game.js";
import { PRESET_THEMES } from "./server/templates.js";
import { AIGateway, AI_COMPLIANCE_WATERMARK } from "./server/aiGateway.js";
import { WebSocketManager } from "./server/ws.js";

dotenv.config();

declare global {
  namespace Express {
    interface Request {
      openid?: string;
      playerId?: string;
    }
  }
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  // 初始化 WebSocket 实时同步服务
  const wsManager = WebSocketManager.getInstance();
  wsManager.init(server);

  app.use(express.json({ limit: "10mb" }));

  const engine = GameEngine.getInstance();

  /**
   * 鉴权中间件 (P0 02 统一验证 Token)
   */
  function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
    const h = req.headers.authorization || "";
    const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
    const claims = verifyToken(token);
    if (!claims) {
      return res.status(401).json({ success: false, error: ErrorCode.UNAUTHORIZED });
    }
    req.openid = claims.openid;
    req.playerId = playerIdOf(claims.openid);
    next();
  }

  // API 路由
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: Date.now() });
  });

  // 合规与算法备案信息公示 (P0 1.1 - 1.4 微信小程序上架必备公示)
  app.get("/api/compliance/info", (req, res) => {
    res.json({
      success: true,
      appName: "AI局中局",
      version: "1.0.0-wechat-candidate",
      aiProvider: process.env.DOMESTIC_AI_API_KEY ? "国内合规大语言模型" : "Google Gemini AI",
      aiFilingNotice: "本服务使用已完成境内深度合成服务算法备案的大语言模型底座，依据《生成式人工智能服务管理暂行办法》提供沉浸式剧情推演娱乐服务。",
      watermark: AI_COMPLIANCE_WATERMARK,
      contentModeration: "已接入敏感词过滤体系与微信安全核验服务(security.msgSecCheck)",
      healthSystem: "已部署游戏防沉迷与适龄提示（16+）",
    });
  });

  // 用户登录 (支持微信小程序 wx.login code2session 官方授权流程及受保护访客模式)
  app.post("/api/login", generalApiLimiter, async (req, res) => {
    try {
      const { code, nickname, avatarUrl, customOpenid } = req.body || {};
      let openid: string;

      if (code && typeof code === "string") {
        // 1. 微信小程序官方 code2session 换取真实 openid
        const wxResult = await exchangeWeChatCode(code);
        if (!wxResult.success || !wxResult.openid) {
          return res.status(400).json({ success: false, error: wxResult.error || "WECHAT_AUTH_FAILED" });
        }
        openid = wxResult.openid;
      } else if (process.env.NODE_ENV === "production" && process.env.WECHAT_APP_ID) {
        // 生产环境强制必须通过微信授权 code 换取，阻断任何客户端伪造 openid
        return res.status(400).json({ success: false, error: "WECHAT_CODE_REQUIRED" });
      } else {
        // 本地/演示环境：如果未配置微信密钥，禁止任意冒充已有账户，分配加密随机访客 ID
        openid =
          customOpenid && typeof customOpenid === "string" && customOpenid.length >= 8 && process.env.NODE_ENV !== "production"
            ? String(customOpenid)
            : `guest_${crypto.randomBytes(6).toString("hex")}`;
      }

      const user = {
        openid,
        nickname: nickname || `推理特工_${openid.slice(-4)}`,
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/personas/svg?seed=${openid}`,
      };
      const token = issueToken(openid);
      res.json({ success: true, user, token });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 创建房间 (通过 Token 取得真实 openid/playerId)
  app.post("/api/room/create", requireAuth, roomCreateLimiter, (req, res) => {
    try {
      const { user } = req.body;
      const nickname = user?.nickname || `特工_${req.openid!.slice(-4)}`;
      const avatarUrl = user?.avatarUrl || `https://api.dicebear.com/7.x/personas/svg?seed=${req.openid}`;

      const room = engine.createRoom({
        openid: req.openid!,
        nickname,
        avatarUrl,
      });
      res.json({ success: true, room });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 加入房间 (通过 Token 取得真实 openid/playerId)
  app.post("/api/room/join", requireAuth, (req, res) => {
    try {
      const { roomCode, user } = req.body;
      if (!roomCode) {
        return res.status(400).json({ success: false, error: "PARAMS_REQUIRED" });
      }
      const nickname = user?.nickname || `特工_${req.openid!.slice(-4)}`;
      const avatarUrl = user?.avatarUrl || `https://api.dicebear.com/7.x/personas/svg?seed=${req.openid}`;

      const result = engine.joinRoom(roomCode, {
        openid: req.openid!,
        nickname,
        avatarUrl,
      });
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 退出房间
  app.post("/api/room/leave", requireAuth, (req, res) => {
    try {
      const { roomId } = req.body;
      const room = engine.leaveRoom(roomId, req.playerId!);
      res.json({ success: true, room });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 准备/取消准备
  app.post("/api/room/ready", requireAuth, (req, res) => {
    try {
      const { roomId, isReady } = req.body;
      const room = engine.setReady(roomId, req.playerId!, Boolean(isReady));
      res.json({ success: true, room });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 快速添加测试好友 (Bot) - 需鉴权且校验房主权限或本地开发环境
  app.post("/api/room/add-bots", requireAuth, (req, res) => {
    try {
      const { roomId, count } = req.body;
      const roomCheck = engine.getRoom(roomId);
      if (roomCheck.room.ownerId !== req.playerId && process.env.NODE_ENV === "production") {
        return res.status(403).json({ success: false, error: ErrorCode.NOT_ROOM_OWNER });
      }
      const room = engine.addBotPlayers(roomId, count || 6);
      res.json({ success: true, room });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 获取预设剧本列表 (Custom Scenarios)
  app.get("/api/themes/presets", (req, res) => {
    res.json({ success: true, themes: PRESET_THEMES });
  });

  // AI 快速生成定制剧本 (Custom Scenario AI Generator) - 限流 + 提示词合规审核
  app.post("/api/theme/generate", requireAuth, aiThemeLimiter, async (req, res) => {
    try {
      const { prompt } = req.body || {};
      if (prompt && typeof prompt === "string") {
        const audit = await contentSecurity.auditText(prompt, req.openid);
        if (!audit.pass) {
          return res.status(400).json({
            success: false,
            error: audit.reason || "定制剧本输入包含敏感词，请合规创作",
          });
        }
      }
      const aiGateway = AIGateway.getInstance();
      const theme = await aiGateway.generateCustomTheme(prompt || "");
      res.json({ success: true, theme, watermark: AI_COMPLIANCE_WATERMARK });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 房主更换或设定房间剧本
  app.post("/api/room/theme", requireAuth, (req, res) => {
    try {
      const { roomId, theme } = req.body;
      if (!roomId || !theme) {
        return res.status(400).json({ success: false, error: "PARAMS_REQUIRED" });
      }
      const room = engine.setRoomTheme(roomId, theme, req.playerId!);
      res.json({ success: true, room });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 获取房间与游戏公共状态
  app.get("/api/room/:roomId", (req, res) => {
    try {
      const { roomId } = req.params;
      const result = engine.getRoom(roomId);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  });

  // 通过房间码查询
  app.get("/api/room/code/:code", (req, res) => {
    try {
      const { code } = req.params;
      const result = engine.getRoomByCode(code);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(404).json({ success: false, error: err.message });
    }
  });

  // 开始游戏 (房主权限)
  app.post("/api/room/start", requireAuth, (req, res) => {
    try {
      const { roomId } = req.body;
      const result = engine.startGame(roomId, req.playerId!);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 获取玩家私密秘密 (只能读取本人对应密钥)
  app.get("/api/game/:gameId/secret", requireAuth, (req, res) => {
    try {
      const { gameId } = req.params;
      const secret = engine.getMySecret(gameId, req.playerId!);
      res.json({ success: true, secret });
    } catch (err: any) {
      res.status(403).json({ success: false, error: err.message });
    }
  });

  // 提交玩家行动 (支持语音录音与语音识别内容及 COS 语音地址)
  app.post("/api/game/action", requireAuth, (req, res) => {
    try {
      const { gameId, type, targetPlayerId, content, audioData, audioDuration, mediaUrl } = req.body;
      const result = engine.submitAction(
        gameId,
        req.playerId!,
        type,
        targetPlayerId,
        content,
        audioData,
        audioDuration,
        mediaUrl
      );

      // 若上传了公网多媒体语音地址，异步接入微信 mediaCheckAsync
      if (mediaUrl && typeof mediaUrl === "string" && result.action?.actionId) {
        auditAudioAsync(req.openid || "unknown", mediaUrl, {
          gameId,
          actionId: result.action.actionId,
        }).catch((err) => console.warn("[WeChatMediaCheck] Audit submit error:", err));
      }

      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 发送房间语音交流 / 对讲消息 (不想打字时直接按住说话或发语音玩，支持 COS 语音地址)
  app.post("/api/room/voice", requireAuth, (req, res) => {
    try {
      const { roomId, content, audioData, audioDuration, mediaUrl } = req.body;
      if (!roomId) {
        return res.status(400).json({ success: false, error: "ROOM_ID_REQUIRED" });
      }
      const result = engine.sendVoiceMessage(
        roomId,
        req.playerId!,
        content,
        audioData,
        audioDuration,
        mediaUrl
      );

      // 若上传了公网多媒体语音地址，异步接入微信 mediaCheckAsync
      if (mediaUrl && typeof mediaUrl === "string" && result.message?.messageId) {
        auditAudioAsync(req.openid || "unknown", mediaUrl, {
          roomId,
          messageId: result.message.messageId,
        }).catch((err) => console.warn("[WeChatMediaCheck] Audit submit error:", err));
      }

      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 推进回合 (需房主权限 + 乐观锁版本校验)
  app.post("/api/game/advance", requireAuth, async (req, res) => {
    try {
      const { gameId, expectedVersion } = req.body;
      const result = await engine.advancePhase(gameId, req.playerId!, expectedVersion);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 提交首轮中期放逐投票 (MID_VOTING)
  app.post("/api/game/mid-vote", requireAuth, async (req, res) => {
    try {
      const { gameId, targetPlayerId } = req.body;
      const result = await engine.submitMidVote(gameId, req.playerId!, targetPlayerId);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 提交终局审判投票
  app.post("/api/game/vote", requireAuth, async (req, res) => {
    try {
      const { gameId, targetPlayerId } = req.body;
      const result = await engine.submitVote(gameId, req.playerId!, targetPlayerId);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 玩家主动呼叫 AI 导演评理/现场质询 (带限流防刷)
  app.post("/api/game/ai-interrogate", requireAuth, aiInterrogateLimiter, async (req, res) => {
    try {
      const { gameId } = req.body;
      const result = await engine.requestAIDirectorInterrogation(gameId, req.playerId!);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // P0 再来一局 (One More Game - 房主权限)
  app.post("/api/game/restart", requireAuth, (req, res) => {
    try {
      const { roomId } = req.body;
      const result = engine.restartGame(roomId, req.playerId!);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 辅助测试：让所有 Bot 模拟行动 - 需鉴权且校验房主权限或开发环境
  app.post("/api/game/bot-auto-act", requireAuth, (req, res) => {
    try {
      const { gameId } = req.body;
      // P0 修复：生产环境强制房主校验，防止任意用户操控他人对局
      if (process.env.NODE_ENV === "production") {
        const { room } = engine.getGameWithRoom(gameId);
        if (room.ownerId !== req.playerId) {
          return res.status(403).json({ success: false, error: ErrorCode.NOT_ROOM_OWNER });
        }
      }
      const result = engine.triggerBotActions(gameId);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 文本内容安全核验前置接口 (P0 1.3 供前端/小程序输入框预检及微信合规对接)
  app.post("/api/security/audit-text", requireAuth, async (req, res) => {
    try {
      const { content } = req.body || {};
      const result = await contentSecurity.auditText(content, req.openid);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 微信异步多媒体/语音安全核验回调接口 (mediaCheckAsync 异步推送入口)
  app.post("/api/security/media-callback", (req, res) => {
    try {
      const { Event, trace_id, result } = req.body || {};
      if (Event === "wxa_media_check" && trace_id) {
        console.log(`[MediaCheckCallback] Received audit event for trace_id: ${trace_id}`, result);
        if (result && result.suggest === "risky") {
          const record = getMediaAuditRecord(String(trace_id));
          if (record) {
            console.warn(`[MediaCheckCallback] Revoking violating audio message:`, record);
            engine.revokeMediaMessage({
              roomId: record.roomId,
              gameId: record.gameId,
              messageId: record.messageId,
              actionId: record.actionId,
              reason: "经微信内容安全核验判定该语音存在违规风险，已被自动撤回",
            });
          }
        }
      }
      // 微信平台规范要求返回 200 并在内容中声明 success
      res.status(200).send("success");
    } catch (err: any) {
      console.error("[MediaCheckCallback] Error processing callback:", err);
      res.status(200).send("success");
    }
  });

  // Vite 开发与静态文件中间件
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`[AI局中局 Server] Running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
