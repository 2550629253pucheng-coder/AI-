import crypto from "crypto";

// P0 安全加固：彻底移除公开泄露的硬编码密钥，生产环境强制配置高熵 SESSION_SECRET
function resolveSecret(): string {
  const envSecret = process.env.SESSION_SECRET?.trim();
  if (envSecret && envSecret.length >= 16) {
    return envSecret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[Security FATAL] SESSION_SECRET environment variable is missing or too short in production! Refusing startup to prevent token forgery."
    );
  }

  // 开发与测试环境下使用单次启动高熵临时密钥，并在控制台提醒
  console.warn(
    "[Security Warning] No SESSION_SECRET configured. Generated an ephemeral 256-bit runtime secret. Tokens will be invalidated upon server reboot."
  );
  return crypto.randomBytes(32).toString("hex");
}

const SECRET = resolveSecret();
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

// 内存吊销黑名单（支持玩家主动退出登录/注销时立刻作废旧 Token）
const revokedTokens = new Set<string>();

/** playerId 的唯一真源，gameEngine 里的拼接调用它 */
export const playerIdOf = (openid: string) => `p_${openid}`;

export function issueToken(openid: string): string {
  const payload = `${openid}|${Date.now() + TTL_MS}|v1`;
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function revokeToken(token: string): void {
  if (token) {
    revokedTokens.add(token);
    // 定期释放，防止内存无限累积
    if (revokedTokens.size > 10000) {
      const first = revokedTokens.values().next().value;
      if (first) revokedTokens.delete(first);
    }
  }
}

export function verifyToken(token: string): { openid: string } | null {
  const [body, sig] = (token || "").split(".");
  if (!body || !sig) return null;

  if (revokedTokens.has(token)) {
    return null;
  }

  try {
    const payload = Buffer.from(body, "base64url").toString();
    const expected = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");

    // 定长比较，防时序侧信道
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;

    const [openid, exp] = payload.split("|");
    if (!openid || Number(exp) < Date.now()) return null;
    return { openid };
  } catch {
    return null;
  }
}
