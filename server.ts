import express from "express";
import path from "path";
import crypto from "crypto";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GameEngine } from "./server/gameEngine.js";
import { issueToken, verifyToken, playerIdOf } from "./server/auth.js";
import { ErrorCode } from "./src/types/game.js";

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
  const PORT = 3000;

  app.use(express.json());

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

  // 用户登录 (签发 HMAC Token)
  app.post("/api/login", (req, res) => {
    try {
      const { nickname, avatarUrl, customOpenid } = req.body || {};
      const isDev = process.env.NODE_ENV !== "production";
      const openid =
        isDev && customOpenid
          ? String(customOpenid)
          : `wx_user_${crypto.randomBytes(4).toString("hex")}`;

      const user = {
        openid,
        nickname: nickname || `推理特工_${openid.slice(-4)}`,
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${openid}`,
      };
      const token = issueToken(openid);
      res.json({ success: true, user, token });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 创建房间 (通过 Token 取得真实 openid/playerId)
  app.post("/api/room/create", requireAuth, (req, res) => {
    try {
      const { user } = req.body;
      const nickname = user?.nickname || `特工_${req.openid!.slice(-4)}`;
      const avatarUrl = user?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${req.openid}`;

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
      const avatarUrl = user?.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${req.openid}`;

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

  // 快速添加测试好友 (Bot)
  app.post("/api/room/add-bots", (req, res) => {
    try {
      const { roomId, count } = req.body;
      const room = engine.addBotPlayers(roomId, count || 6);
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

  // 提交玩家行动
  app.post("/api/game/action", requireAuth, (req, res) => {
    try {
      const { gameId, type, targetPlayerId, content } = req.body;
      const result = engine.submitAction(gameId, req.playerId!, type, targetPlayerId, content);
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

  // 提交投票
  app.post("/api/game/vote", requireAuth, async (req, res) => {
    try {
      const { gameId, targetPlayerId } = req.body;
      const result = await engine.submitVote(gameId, req.playerId!, targetPlayerId);
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

  // 辅助测试：让所有 Bot 模拟行动
  app.post("/api/game/bot-auto-act", (req, res) => {
    try {
      const { gameId } = req.body;
      const result = engine.triggerBotActions(gameId);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[AI局中局 Server] Running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
