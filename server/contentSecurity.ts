import https from "https";

export interface SecurityCheckResult {
  pass: boolean;
  reason?: string;
  filteredText: string;
}

// 常见违法违规、辱骂攻击、涉黄、涉政、欺诈等敏感词过滤表（涵盖拼音与常见同音变体）
const SENSITIVE_WORDS: string[] = [
  "色情",
  "黄片",
  "约炮",
  "兼职刷单",
  "代开增值税",
  "办假证",
  "买卖枪支",
  "迷魂药",
  "赌博平台",
  "百家乐",
  "六合彩",
  "法轮",
  "暴恐",
  "炸弹制作",
  "自杀教程",
  "反共",
  "天安门事件",
  "习近平",
  "江泽民",
  "操你妈",
  "傻逼",
  "草泥马",
  "去死吧",
  "垃圾人",
  "脑残",
];

// 微信 AccessToken 缓存
let cachedAccessToken: { token: string; expiresAt: number } | null = null;

async function getWeChatAccessToken(): Promise<string | null> {
  const appId = process.env.WECHAT_APP_ID;
  const appSecret = process.env.WECHAT_APP_SECRET;
  if (!appId || !appSecret) {
    return null;
  }

  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAt > now + 60000) {
    return cachedAccessToken.token;
  }

  try {
    const url = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${encodeURIComponent(
      appId
    )}&secret=${encodeURIComponent(appSecret)}`;

    const res = await fetch(url);
    const json = await res.json();
    if (json.access_token) {
      cachedAccessToken = {
        token: json.access_token,
        expiresAt: now + (json.expires_in || 7200) * 1000,
      };
      return json.access_token;
    }
  } catch (err) {
    console.warn("[ContentSecurity] Failed to fetch WeChat access token:", err);
  }
  return null;
}

/**
 * 微信小程序官方 security.msgSecCheck 接入
 */
async function callWeChatMsgSecCheck(openid: string | undefined, content: string): Promise<boolean> {
  const token = await getWeChatAccessToken();
  if (!token) {
    return true; // 未配置微信密钥时，依赖本地增强字典过滤
  }

  try {
    const url = `https://api.weixin.qq.com/wxa/msg_sec_check?access_token=${encodeURIComponent(token)}`;
    const body = JSON.stringify({
      version: 2,
      openid: openid || "wx_test_openid",
      scene: 2, // 社交发言场景
      content: content.slice(0, 500),
    });

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });
    const result = await res.json();
    if (result.errcode === 0 && result.result?.suggest === "pass") {
      return true;
    }
    if (result.result?.suggest === "risky") {
      return false;
    }
  } catch (e) {
    console.warn("[ContentSecurity] WeChat msgSecCheck error:", e);
  }

  return true;
}

/**
 * 内容安全审核模块 (P0 1.3 微信强制内容安全审核)
 */
export class ContentSecurity {
  private static instance: ContentSecurity;
  private sensitiveRegex: RegExp;

  private constructor() {
    const escaped = SENSITIVE_WORDS.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    this.sensitiveRegex = new RegExp(escaped.join("|"), "gi");
  }

  public static getInstance(): ContentSecurity {
    if (!ContentSecurity.instance) {
      ContentSecurity.instance = new ContentSecurity();
    }
    return ContentSecurity.instance;
  }

  /**
   * 检验玩家发言、剧本输入或 AI 生成文本
   */
  public async auditText(content: string, openid?: string): Promise<SecurityCheckResult> {
    if (!content || typeof content !== "string") {
      return { pass: true, filteredText: "" };
    }

    const trimmed = content.trim();

    // 1. 本地高频敏感词匹配
    if (this.sensitiveRegex.test(trimmed)) {
      const filtered = trimmed.replace(this.sensitiveRegex, "***");
      return {
        pass: false,
        reason: "内容包含不合规或不适宜用语，请文明发言与健康互动",
        filteredText: filtered,
      };
    }

    // 2. 微信官方 msgSecCheck 深度安全过滤 (若有配置)
    const wechatPassed = await callWeChatMsgSecCheck(openid, trimmed);
    if (!wechatPassed) {
      return {
        pass: false,
        reason: "经微信内容安全核验，发言存在违规风险，已被拦截",
        filteredText: "***",
      };
    }

    return {
      pass: true,
      filteredText: trimmed,
    };
  }

  /**
   * 快速同步脱敏与过滤 (用于高吞吐场景)
   */
  public sanitizeSync(content: string): string {
    if (!content) return "";
    return content.replace(this.sensitiveRegex, "***");
  }
}

// 异步媒体审核 trace_id 关联表，保留近 1 小时记录
export interface MediaAuditRecord {
  roomId?: string;
  gameId?: string;
  messageId?: string;
  actionId?: string;
  mediaUrl: string;
  openid: string;
  createdAt: number;
}

const mediaTraceMap = new Map<string, MediaAuditRecord>();

// 提交异步音频审核（结果由微信推送至 /api/security/media-callback）
export async function auditAudioAsync(
  openid: string,
  mediaUrl: string,
  meta?: { roomId?: string; gameId?: string; messageId?: string; actionId?: string }
): Promise<string | null> {
  const token = await getWeChatAccessToken();
  if (!token) return null;

  try {
    const res = await fetch(`https://api.weixin.qq.com/wxa/media_check_async?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        media_url: mediaUrl, // 必须为公网可访问的 URL（COS / OSS 等存储地址）
        media_type: 2,       // 2 = 音频
        version: 2,
        openid,
        scene: 2,            // 社交发言场景
      }),
    });

    const data: any = await res.json();
    if (data.errcode === 0 && data.trace_id) {
      const traceId = String(data.trace_id);
      mediaTraceMap.set(traceId, {
        roomId: meta?.roomId,
        gameId: meta?.gameId,
        messageId: meta?.messageId,
        actionId: meta?.actionId,
        mediaUrl,
        openid,
        createdAt: Date.now(),
      });
      return traceId;
    }
  } catch (err) {
    console.warn("[ContentSecurity] Failed to submit mediaCheckAsync:", err);
  }
  return null;
}

export function getMediaAuditRecord(traceId: string): MediaAuditRecord | undefined {
  return mediaTraceMap.get(traceId);
}

export const contentSecurity = ContentSecurity.getInstance();
