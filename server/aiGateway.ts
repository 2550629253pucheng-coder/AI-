import { GoogleGenAI } from "@google/genai";
import { Team, PlayerReport, PlayerTag, GameEvent } from "../src/types/game.js";
import { COMPANY_THEME, FALLBACK_REPORTS } from "./templates.js";

export interface TwistContext {
  theme: string;
  round: number;
  publicRoles: {
    playerAlias: string;
    roleName: string;
  }[];
  importantActions: {
    actor: string;
    action: string;
    target?: string;
    content?: string;
  }[];
  revealedClues: string[];
}

export interface ReportContext {
  theme: string;
  winnerTeam: Team;
  spies: { name: string; roleName: string }[];
  players: { id: string; name: string; roleName: string; team: Team; votesReceived: number }[];
  actionsSummary: string[];
  votesSummary: { voter: string; target: string }[];
}

let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI | null {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return aiClient;
}

// 辅助：超时封装
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      resolve(fallback);
    }, timeoutMs);
  });
  return Promise.race([
    promise.then((res) => {
      clearTimeout(timer);
      return res;
    }),
    timeoutPromise
  ]);
}

export class AIGateway {
  private static instance: AIGateway;

  public static getInstance(): AIGateway {
    if (!AIGateway.instance) {
      AIGateway.instance = new AIGateway();
    }
    return AIGateway.instance;
  }

  /**
   * 生成第3轮AI反转 (The AI Director Twist)
   * 结合前两轮玩家公开行为、互相质疑与辩护，动态制造戏剧情节
   */
  public async generateTwist(gameId: string, context: TwistContext): Promise<GameEvent> {
    const fallbackTemplate = COMPANY_THEME.twistFallbacks[
      Math.floor(Math.random() * COMPANY_THEME.twistFallbacks.length)
    ];

    const fallbackEvent: GameEvent = {
      eventId: `event_twist_${Date.now()}`,
      gameId,
      round: 3,
      type: "TWIST",
      title: fallbackTemplate.title,
      description: fallbackTemplate.description,
      publicClue: fallbackTemplate.publicClue,
      discussionPrompt: fallbackTemplate.discussionPrompt,
      source: "FALLBACK",
      createdAt: Date.now(),
    };

    const client = getAiClient();
    if (!client) {
      console.log("[AIGateway] No GEMINI_API_KEY found, using prebuilt fallback twist.");
      return fallbackEvent;
    }

    const prompt = `你是一款微信熟人社交推理小游戏《AI局中局》的「AI导演」。
当前主题：${context.theme}
本局进行到第3轮关键决战。前两轮玩家的公开身份和操作如下：
公开身份池：${JSON.stringify(context.publicRoles)}
前两轮玩家公开行为记录：${JSON.stringify(context.importantActions)}
已公开线索：${JSON.stringify(context.revealedClues)}

任务：
作为剧情反转导演，请根据上述玩家的实际互动（特别是谁在质疑谁、谁在为谁辩护），制造一个意料之外又在情理之中的「第3轮剧情大反转」！
要求：
1. 风格幽默、悬疑、戏剧张力拉满，极具讨论欲望。
2. 绝对不能直接说出谁是真正的内鬼！只能提供新的反转证据或逻辑矛盾，引导大家最后深度讨论。
3. 必须输出严格合法的 JSON 对象，格式如下：
{
  "title": "反转标题（例如：第三轮AI反转 · 逆转的监控与假卡）",
  "description": "2-3句话生动描述现场发现的惊人新线索，引用前两轮某些玩家的行径制造反转冲突",
  "publicClue": "核心公开发现（例如：作案者实际上穿了某人的外套，或者某张临时卡被转借过）",
  "discussionPrompt": "对玩家提出的诛心提问（例如：现在，谁之前的解释最像是在自导自演？）"
}
注意：只返回纯 JSON，不包含 markdown 代码块或其他任何文字。`;

    const task = async (): Promise<GameEvent> => {
      try {
        const response = await client.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
        });

        const text = response.text || "";
        const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        if (parsed.title && parsed.description) {
          return {
            eventId: `event_twist_${Date.now()}`,
            gameId,
            round: 3,
            type: "TWIST",
            title: parsed.title,
            description: parsed.description,
            publicClue: parsed.publicClue || fallbackTemplate.publicClue,
            discussionPrompt: parsed.discussionPrompt || fallbackTemplate.discussionPrompt,
            source: "AI",
            createdAt: Date.now(),
          };
        }
        return fallbackEvent;
      } catch (err) {
        console.error("[AIGateway] AI twist generation failed or timed out:", err);
        return fallbackEvent;
      }
    };

    return withTimeout(task(), 8000, fallbackEvent);
  }

  /**
   * 生成赛后复盘AI报告 (Post-Game Report)
   * 评选推理王、戏精大奖、爆笑场面与每位玩家称号
   */
  public async generateReport(context: ReportContext): Promise<PlayerReport> {
    const fallbackBase = FALLBACK_REPORTS[context.winnerTeam];
    const fallbackPlayerTags: PlayerTag[] = context.players.map((p, index) => {
      const titles = [
        "带节奏大师",
        "推理显微镜",
        "奥斯卡最佳演技",
        "摸鱼被捕第一人",
        "全程躺赢专业户",
        "深藏不露影帝",
        "背锅大侠",
        "真理在少数人手里"
      ];
      return {
        playerId: p.id,
        playerName: p.name,
        title: titles[index % titles.length],
        comment: p.team === Team.SPY ? "凭借冷静伪装潜伏全程" : "积极发言推动全场破案",
      };
    });

    const fallbackReport: PlayerReport = {
      summary: fallbackBase.summary,
      bestDetective: fallbackBase.bestDetective,
      bestActor: fallbackBase.bestActor,
      funniestMoment: fallbackBase.funniestMoment,
      biggestTwist: fallbackBase.biggestTwist,
      playerTags: fallbackPlayerTags,
    };

    const client = getAiClient();
    if (!client) {
      return fallbackReport;
    }

    const prompt = `你是一款微信熟人社交推理小游戏《AI局中局》的「AI导演」。
一局游戏刚刚结束，需要生成赛后复盘评价！
游戏信息：
- 主题：${context.theme}
- 最终胜方：${context.winnerTeam === Team.NORMAL ? "普通员工阵营胜利" : "内鬼阵营胜利"}
- 真正内鬼名单：${JSON.stringify(context.spies)}
- 玩家数据：${JSON.stringify(context.players)}
- 玩家发言与行动摘要：${JSON.stringify(context.actionsSummary)}
- 最终投票详情：${JSON.stringify(context.votesSummary)}

请生成一份幽默风趣、金句频出、适合微信群分享讨论的赛后复盘报告。
必须输出合法纯 JSON，结构如下：
{
  "summary": "100字左右生动的复盘回顾，点出胜负关键点与胜方精彩操作",
  "bestDetective": "推理王是谁及理由（一句话）",
  "bestActor": "最佳戏精演技奖得主及理由（一句话）",
  "funniestMoment": "本局最搞笑名场面或乌龙事件（一句话）",
  "biggestTwist": "本局最刺激的反转时刻（一句话）",
  "playerTags": [
    {
      "playerId": "玩家ID",
      "playerName": "玩家昵称",
      "title": "4-6字幽默个性称号（如：带节奏导师、绝命反打王、全场背锅侠）",
      "comment": "一句话点评"
    }
  ]
}
严格只返回合法JSON，不要包含markdown。`;

    const task = async (): Promise<PlayerReport> => {
      try {
        const response = await client.models.generateContent({
          model: "gemini-3.8-flash",
          contents: prompt,
        });

        const text = response.text || "";
        const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleaned);

        if (parsed.summary && Array.isArray(parsed.playerTags)) {
          return {
            summary: parsed.summary,
            bestDetective: parsed.bestDetective || fallbackBase.bestDetective,
            bestActor: parsed.bestActor || fallbackBase.bestActor,
            funniestMoment: parsed.funniestMoment || fallbackBase.funniestMoment,
            biggestTwist: parsed.biggestTwist || fallbackBase.biggestTwist,
            playerTags: parsed.playerTags.map((pt: any) => ({
              playerId: pt.playerId || "",
              playerName: pt.playerName || "",
              title: pt.title || "局中高人",
              comment: pt.comment || "表现抢眼",
            })),
          };
        }
        return fallbackReport;
      } catch (err) {
        console.error("[AIGateway] AI report generation failed:", err);
        return fallbackReport;
      }
    };

    return withTimeout(task(), 8000, fallbackReport);
  }
}
