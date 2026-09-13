import crypto from "crypto";

export interface WeChatSessionResult {
  success: boolean;
  openid?: string;
  unionid?: string;
  sessionKey?: string;
  error?: string;
}

/**
 * 微信小程序官方授权 code2session 模块 (P0 2.1 彻底封堵客户端伪造 openid 风险)
 */
export async function exchangeWeChatCode(code: string): Promise<WeChatSessionResult> {
  const appId = process.env.WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET;

  // 微信生产模式：必须调用微信官方接口核验 code
  if (appId && appSecret) {
    if (!code || typeof code !== "string" || code.trim().length === 0) {
      return { success: false, error: "WECHAT_CODE_REQUIRED" };
    }

    try {
      const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${encodeURIComponent(
        appId
      )}&secret=${encodeURIComponent(appSecret)}&js_code=${encodeURIComponent(
        code.trim()
      )}&grant_type=authorization_code`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.errcode && data.errcode !== 0) {
        return {
          success: false,
          error: `WECHAT_AUTH_FAILED: [${data.errcode}] ${data.errmsg || "Unknown error"}`,
        };
      }

      if (!data.openid) {
        return { success: false, error: "OPENID_NOT_RETURNED" };
      }

      return {
        success: true,
        openid: data.openid,
        unionid: data.unionid,
        sessionKey: data.session_key,
      };
    } catch (err: any) {
      console.error("[WeChatAuth] Network error during code2session:", err);
      return { success: false, error: "WECHAT_NETWORK_ERROR" };
    }
  }

  // 演示/开发环境：如果未配置微信 AppID，签发受保护的高熵访客设备标识，禁止任意传入伪造他人已有 ID
  return {
    success: true,
    openid: `guest_${crypto.randomBytes(8).toString("hex")}`,
  };
}
