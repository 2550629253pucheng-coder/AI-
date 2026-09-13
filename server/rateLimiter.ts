import { Request, Response, NextFunction } from "express";

interface RateLimitRule {
  windowMs: number;
  max: number;
  message: string;
  keyGenerator?: (req: Request) => string;
}

interface HitRecord {
  timestamps: number[];
}

/**
 * 轻量高效的滑动窗口内存限流中间件 (P0 2.4 防止恶意刷取 AI Token 与 API 爆破)
 */
export function createRateLimiter(rule: RateLimitRule) {
  const hits = new Map<string, HitRecord>();

  // 定期清理过期记录，避免内存泄漏
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      record.timestamps = record.timestamps.filter((ts) => now - ts < rule.windowMs);
      if (record.timestamps.length === 0) {
        hits.delete(key);
      }
    }
  }, Math.min(rule.windowMs, 60000));

  // 允许在进程退出时解除挂起
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = rule.keyGenerator
      ? rule.keyGenerator(req)
      : (req.openid ? `u_${req.openid}` : req.ip || "unknown_client");

    let record = hits.get(key);
    if (!record) {
      record = { timestamps: [] };
      hits.set(key, record);
    }

    // 剔除窗口外的请求
    record.timestamps = record.timestamps.filter((ts) => now - ts < rule.windowMs);

    if (record.timestamps.length >= rule.max) {
      const oldest = record.timestamps[0];
      const retryAfterSec = Math.max(1, Math.ceil((oldest + rule.windowMs - now) / 1000));
      res.setHeader("Retry-After", retryAfterSec);
      return res.status(429).json({
        success: false,
        error: "TOO_MANY_REQUESTS",
        message: rule.message || "请求过于频繁，请稍后再试",
        retryAfter: retryAfterSec,
      });
    }

    record.timestamps.push(now);
    next();
  };
}

// 针对 AI 剧本生成的限流：每位用户每小时最多 10 次
export const aiThemeLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "AI 剧本生成已达到每小时配额上限（10次），请稍后再试或选择预设剧本！",
  keyGenerator: (req) => req.openid ? `theme_${req.openid}` : `theme_ip_${req.ip}`,
});

// 针对 AI 导演实时质询的限流：每位玩家每 30 秒最多 1 次，每小时最多 12 次
export const aiInterrogateLimiter = createRateLimiter({
  windowMs: 30 * 1000,
  max: 1,
  message: "AI 导演正在思考中，呼叫太频繁啦！请 30 秒后再呼叫导演评理。",
  keyGenerator: (req) => req.openid ? `interrogate_${req.openid}` : `interrogate_ip_${req.ip}`,
});

// 针对房间创建的限流：每位用户 5 分钟内最多创建 10 个房间
export const roomCreateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 10,
  message: "创建房间太频繁，请稍后再试。",
  keyGenerator: (req) => req.openid ? `create_room_${req.openid}` : `create_room_ip_${req.ip}`,
});

// 通用防护限流：单 IP 每分钟最多 180 次请求
export const generalApiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 180,
  message: "请求速率超过限制，请稍后刷新。",
  keyGenerator: (req) => `ip_${req.ip}`,
});
