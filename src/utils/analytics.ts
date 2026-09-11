/**
 * 微信小游戏关键行为埋点分析工具 (P2 10)
 * 覆盖房间创建、加入、身份查看、投票、AI兜底与再来一局漏斗指标
 */

export type FunnelEvent =
  | "room_create"
  | "room_join"
  | "game_start"
  | "identity_view"
  | "action_submit"
  | "phase_advance"
  | "vote_submit"
  | "game_settle"
  | "game_complete"
  | "restart_click"
  | "ai_fallback"
  | "seat_switch";

export function track(event: FunnelEvent, props?: Record<string, unknown>) {
  const payload = {
    event,
    timestamp: Date.now(),
    ...props,
  };
  // 开发与生产环境控制台输出
  console.info(`[Analytics] [${event}]`, payload);

  // 可无缝对齐微信 wx.reportEvent 或第三方分析上报
  if (typeof window !== "undefined" && (window as any).wx?.reportEvent) {
    try {
      (window as any).wx.reportEvent(event, props);
    } catch {
      // ignore
    }
  }
}
