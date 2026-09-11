import { audio } from "./audio";

type SpeechListener = (speaking: boolean, text: string) => void;

export interface VoiceOption {
  uri: string;
  name: string;
  lang: string;
  isNatural: boolean;
  score: number;
}

// 智能音色评分算法：优先挑选顶级拟真自然神经网络人声（如微软晓晓、云希、苹果优质婷婷、Google标准普通话），剔除机械生硬的旧版SAPI
function scoreVoice(v: SpeechSynthesisVoice): number {
  let score = 0;
  const name = v.name.toLowerCase();
  const lang = v.lang.toLowerCase();

  // 必须是中文
  if (!lang.includes("zh") && !lang.includes("cmn")) {
    return -100;
  }

  // 普通话 / 简体优先
  if (lang.includes("zh-cn") || lang.includes("cmn-hans")) score += 20;

  // 极品神经网络自然语音
  if (name.includes("natural") || name.includes("neural") || name.includes("online")) {
    score += 60;
  }
  if (name.includes("xiaoxiao") || name.includes("晓晓")) score += 35; // 情感充沛的解说/叙事女声
  if (name.includes("yunxi") || name.includes("云希")) score += 35; // 影视悬疑感男声
  if (name.includes("yunjian") || name.includes("云健")) score += 25;
  if (name.includes("xiaoyi") || name.includes("晓伊")) score += 20;

  // Apple 系统优化人声
  if (name.includes("tingting") || name.includes("ting-ting") || name.includes("婷婷")) {
    score += 25;
    if (name.includes("enhanced") || name.includes("premium")) score += 40;
  }
  if (name.includes("sin-ji") || name.includes("meijia")) {
    score += 20;
  }

  // Google 普通话
  if (name.includes("google") && (lang.includes("zh-cn") || lang.includes("cmn"))) {
    score += 30;
  }

  // 扣分项：古董机械桌面合成器（极度生硬机械）
  if (name.includes("desktop") || name.includes("huihui") || name.includes("espeak")) {
    score -= 40;
  }

  return score;
}

class SpeechManager {
  private enabled: boolean = true;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private listeners: Set<SpeechListener> = new Set();
  private cachedVoices: SpeechSynthesisVoice[] = [];
  private selectedVoiceURI: string = "";
  private speechRate: number = 1.0; // 默认自然舒适语速
  private speechPitch: number = 1.0; // 默认自然基准音高，避免金属变调
  private pendingTimer: any = null;
  private lastSpokenText: string = "";
  private lastSpokenTime: number = 0;
  public isSpeaking: boolean = false;
  public currentText: string = "";

  constructor() {
    // 读取用户保存的语音偏好
    const savedEnabled = localStorage.getItem("ai_impostor_tts");
    if (savedEnabled !== null) {
      this.enabled = savedEnabled === "true";
    }

    const savedVoice = localStorage.getItem("ai_impostor_tts_voice");
    if (savedVoice) {
      this.selectedVoiceURI = savedVoice;
    }

    const savedRate = localStorage.getItem("ai_impostor_tts_rate");
    if (savedRate) {
      const parsed = parseFloat(savedRate);
      if (!isNaN(parsed) && parsed >= 0.7 && parsed <= 1.5) {
        this.speechRate = parsed;
      }
    }

    if (typeof window !== "undefined" && window.speechSynthesis) {
      this.initVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          this.initVoices();
        };
      }

      // 用户首个交互解锁移动端语音上下文
      const unlockSpeech = () => {
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        } catch {}
        window.removeEventListener("touchstart", unlockSpeech);
        window.removeEventListener("click", unlockSpeech);
      };
      window.addEventListener("touchstart", unlockSpeech, { passive: true, once: true });
      window.addEventListener("click", unlockSpeech, { passive: true, once: true });
    }
  }

  private initVoices() {
    try {
      this.cachedVoices = window.speechSynthesis.getVoices() || [];
    } catch {}
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    localStorage.setItem("ai_impostor_tts", enabled ? "true" : "false");
    if (!enabled) {
      this.stop();
    }
  }

  public toggle(): boolean {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  public getRate(): number {
    return this.speechRate;
  }

  public setRate(rate: number) {
    this.speechRate = Math.max(0.75, Math.min(1.4, rate));
    localStorage.setItem("ai_impostor_tts_rate", this.speechRate.toString());
  }

  public getSelectedVoiceURI(): string {
    return this.selectedVoiceURI;
  }

  public setSelectedVoice(uri: string) {
    this.selectedVoiceURI = uri;
    localStorage.setItem("ai_impostor_tts_voice", uri);
  }

  // 获取当前系统所有可用的优质中文人声列表
  public getAvailableVoices(): VoiceOption[] {
    const voices = this.cachedVoices.length > 0 ? this.cachedVoices : (window.speechSynthesis?.getVoices() || []);
    const chineseVoices = voices
      .filter((v) => v.lang.includes("zh") || v.lang.includes("cmn"))
      .map((v) => {
        const score = scoreVoice(v);
        const name = v.name;
        const isNatural = name.includes("Natural") || name.includes("Online") || name.includes("Enhanced") || name.includes("Neural");
        return {
          uri: v.voiceURI,
          name: v.name,
          lang: v.lang,
          isNatural,
          score,
        };
      })
      .sort((a, b) => b.score - a.score);

    return chineseVoices;
  }

  // 智能挑选最佳人声
  private getBestChineseVoice(): SpeechSynthesisVoice | null {
    const voices = this.cachedVoices.length > 0 ? this.cachedVoices : (window.speechSynthesis?.getVoices() || []);
    if (!voices || voices.length === 0) return null;

    // 1. 如果用户已手动指定了音色，优先使用
    if (this.selectedVoiceURI) {
      const userSelected = voices.find((v) => v.voiceURI === this.selectedVoiceURI);
      if (userSelected) return userSelected;
    }

    // 2. 否则按智能音色评分挑选最自然流畅的拟真人声
    const chineseVoices = voices.filter((v) => v.lang.includes("zh") || v.lang.includes("cmn"));
    if (chineseVoices.length === 0) return null;

    chineseVoices.sort((a, b) => scoreVoice(b) - scoreVoice(a));
    return chineseVoices[0];
  }

  public subscribe(listener: SpeechListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(speaking: boolean, text: string) {
    this.isSpeaking = speaking;
    this.currentText = text;
    this.listeners.forEach((fn) => {
      try {
        fn(speaking, text);
      } catch (e) {
        // ignore
      }
    });
  }

  /**
   * 播放语音播报
   * 防御机制：
   * 1. 彻底去重防重入：4秒内相同文本直接拦截，绝不自言自语说两遍
   * 2. 清除待执行的延迟计时器，杜绝排队并发双发
   * 3. 选取最生动拟真的中文神经网络音色，语调舒适自然
   */
  public async speak(text: string, options: { pitch?: number; rate?: number } = {}) {
    if (!this.enabled || typeof window === "undefined" || !text) {
      return;
    }

    const trimmed = text.trim();
    if (!trimmed) return;

    // 🛡️ 防御 1: 4秒内相同文本严禁重复播报 (彻底解决“自己说两遍”)
    const now = Date.now();
    if (this.lastSpokenText === trimmed && now - this.lastSpokenTime < 4000) {
      return;
    }
    if (this.isSpeaking && this.currentText === trimmed) {
      return;
    }

    if (!window.speechSynthesis) {
      return;
    }

    try {
      // 🛡️ 防御 2: 清除正在排队执行的所有旧计时器，避免并发双发
      if (this.pendingTimer) {
        clearTimeout(this.pendingTimer);
        this.pendingTimer = null;
      }

      // 🛡️ 防御 3: 立即打断当前正在朗读的旧内容
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.cancel();

      // 记录最新发言文本与时间戳
      this.lastSpokenText = trimmed;
      this.lastSpokenTime = now;

      // 播放轻微开麦提示音 (不刺耳)
      audio.playReveal();

      const utterance = new SpeechSynthesisUtterance(trimmed);
      this.currentUtterance = utterance;

      // 智能挑选最优质自然的人声
      const bestVoice = this.getBestChineseVoice();
      if (bestVoice) {
        utterance.voice = bestVoice;
        utterance.lang = bestVoice.lang || "zh-CN";
      } else {
        utterance.lang = "zh-CN";
      }

      // 使用自然生活化的语速与基准音调（彻底告别沉闷机械音）
      utterance.rate = options.rate ?? this.speechRate; // 默认 1.0 舒适自然
      utterance.pitch = options.pitch ?? this.speechPitch; // 默认 1.0 清晰圆润
      utterance.volume = 1.0;

      utterance.onstart = () => {
        this.notify(true, trimmed);
      };

      utterance.onend = () => {
        this.notify(false, "");
        this.currentUtterance = null;
      };

      utterance.onerror = () => {
        this.notify(false, "");
        this.currentUtterance = null;
      };

      // 微延迟确保浏览器语音引擎就绪，由单一计时器守卫
      this.pendingTimer = setTimeout(() => {
        this.pendingTimer = null;
        try {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
          window.speechSynthesis.speak(utterance);
        } catch (err) {
          this.notify(false, "");
        }
      }, 50);
    } catch (e) {
      console.warn("[Speech] Error in speak:", e);
      this.notify(false, "");
    }
  }

  public stop() {
    if (this.pendingTimer) {
      clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
      this.notify(false, "");
    }
  }
}

export const speech = new SpeechManager();
