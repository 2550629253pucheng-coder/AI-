import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GameEngine } from "./server/gameEngine.js";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const engine = GameEngine.getInstance();

  // API 路由
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: Date.now() });
  });

  // 用户登录 (模拟微信登录云函数返回合法安全用户)
  app.post("/api/login", (req, res) => {
    try {
      const { nickname, avatarUrl, customOpenid } = req.body || {};
      // 保证开发测试环境下能稳定模拟多设备
      const openid = customOpenid || `wx_user_${Math.random().toString(36).substring(2, 9)}`;
      const user = {
        openid,
        nickname: nickname || `推理特工_${openid.substring(8, 12)}`,
        avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${openid}`,
      };
      res.json({ success: true, user });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 创建房间
  app.post("/api/room/create", (req, res) => {
    try {
      const { user } = req.body;
      if (!user || !user.openid) {
        return res.status(400).json({ success: false, error: "USER_REQUIRED" });
      }
      const room = engine.createRoom(user);
      res.json({ success: true, room });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 加入房间
  app.post("/api/room/join", (req, res) => {
    try {
      const { roomCode, user } = req.body;
      if (!roomCode || !user) {
        return res.status(400).json({ success: false, error: "PARAMS_REQUIRED" });
      }
      const result = engine.joinRoom(roomCode, user);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 退出房间
  app.post("/api/room/leave", (req, res) => {
    try {
      const { roomId, playerId } = req.body;
      const room = engine.leaveRoom(roomId, playerId);
      res.json({ success: true, room });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 准备/取消准备
  app.post("/api/room/ready", (req, res) => {
    try {
      const { roomId, playerId, isReady } = req.body;
      const room = engine.setReady(roomId, playerId, Boolean(isReady));
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
  app.post("/api/room/start", (req, res) => {
    try {
      const { roomId, ownerId } = req.body;
      const result = engine.startGame(roomId, ownerId);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 获取玩家私密秘密 (权限隔离)
  app.get("/api/game/:gameId/secret", (req, res) => {
    try {
      const { gameId } = req.params;
      const playerId = req.query.playerId as string;
      if (!playerId) {
        return res.status(401).json({ success: false, error: "PLAYER_ID_REQUIRED" });
      }
      const secret = engine.getMySecret(gameId, playerId);
      res.json({ success: true, secret });
    } catch (err: any) {
      res.status(403).json({ success: false, error: err.message });
    }
  });

  // 提交玩家行动
  app.post("/api/game/action", (req, res) => {
    try {
      const { gameId, playerId, type, targetPlayerId, content } = req.body;
      const result = engine.submitAction(gameId, playerId, type, targetPlayerId, content);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 推进回合
  app.post("/api/game/advance", async (req, res) => {
    try {
      const { gameId } = req.body;
      const result = await engine.advancePhase(gameId);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // 提交投票
  app.post("/api/game/vote", async (req, res) => {
    try {
      const { gameId, voterPlayerId, targetPlayerId } = req.body;
      const result = await engine.submitVote(gameId, voterPlayerId, targetPlayerId);
      res.json({ success: true, ...result });
    } catch (err: any) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  // P0 再来一局 (One More Game)
  app.post("/api/game/restart", (req, res) => {
    try {
      const { roomId, requesterId } = req.body;
      const result = engine.restartGame(roomId, requesterId);
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
