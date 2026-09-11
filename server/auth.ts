import crypto from "crypto";

const SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** playerId 的唯一真源，gameEngine 里的拼接调用它 */
export const playerIdOf = (openid: string) => `p_${openid}`;

export function issueToken(openid: string): string {
  const payload = `${openid}|${Date.now() + TTL_MS}`;
  const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function verifyToken(token: string): { openid: string } | null {
  const [body, sig] = (token || "").split(".");
  if (!body || !sig) return null;

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
