/**
 * 微信小游戏级 语音录音、实时听写转文字与语音条播放器
 * 满足玩家“不想打字时直接按住说话或发语音玩”的开黑对讲诉求
 */

export interface VoiceRecordingResult {
  audioBlob?: Blob;
  audioData?: string; // base64 DataURL
  audioDuration: number; // 秒
  transcript: string; // 语音识别出的文字
}

export interface QuickPhrase {
  id: string;
  category: "DEFEND" | "ACCUSE" | "INVESTIGATE" | "NEUTRAL";
  text: string;
  icon: string;
}

export const QUICK_VOICE_PHRASES: QuickPhrase[] = [
  { id: "qp_1", category: "DEFEND", text: "我当时在会议室有充分的不在场证明！", icon: "🛡️" },
  { id: "qp_2", category: "DEFEND", text: "别被他带节奏了，我百分之百是好人！", icon: "✋" },
  { id: "qp_3", category: "DEFEND", text: "我的公开职务完全清白，大家看我的行动线。", icon: "📑" },
  { id: "qp_4", category: "ACCUSE", text: "你的发言逻辑有重大漏洞，眼神一直在躲闪！", icon: "👉" },
  { id: "qp_5", category: "ACCUSE", text: "AI导演公布的突发证据，明显就是在暗示你！", icon: "⚡" },
  { id: "qp_6", category: "ACCUSE", text: "他一直在故意转移焦点，这轮大家必须查他！", icon: "🔥" },
  { id: "qp_7", category: "INVESTIGATE", text: "我手头掌握了关键线索，建议先核查他的动向。", icon: "🔍" },
  { id: "qp_8", category: "INVESTIGATE", text: "这轮大家先别轻举妄动，听听其他嫌疑人的自白。", icon: "👂" },
  { id: "qp_9", category: "NEUTRAL", text: "真相只有一个，内鬼别再演了，自己站出来吧！", icon: "🕵️" },
];

let activeAudio: HTMLAudioElement | null = null;
let activeStopCallback: (() => void) | null = null;

class VoiceService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private audioChunks: Blob[] = [];
  private recognition: any = null;
  private startTime: number = 0;
  private recordedDuration: number = 0;
  private recognizedText: string = "";
  private isRecording: boolean = false;

  public isAudioSupported(): boolean {
    return (
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices &&
      !!navigator.mediaDevices.getUserMedia &&
      typeof MediaRecorder !== "undefined"
    );
  }

  public isSpeechRecognitionSupported(): boolean {
    if (typeof window === "undefined") return false;
    const win = window as any;
    return !!(win.SpeechRecognition || win.webkitSpeechRecognition);
  }

  /**
   * 开始录音与语音识别
   */
  public async startRecording(options?: {
    onInterimTranscript?: (text: string) => void;
    onError?: (err: any) => void;
  }): Promise<void> {
    if (this.isRecording) {
      this.cancelRecording();
    }

    this.audioChunks = [];
    this.recognizedText = "";
    this.startTime = Date.now();
    this.isRecording = true;

    // 1. 尝试启动 Web Speech Recognition
    if (this.isSpeechRecognitionSupported()) {
      try {
        const win = window as any;
        const SpeechRec = win.SpeechRecognition || win.webkitSpeechRecognition;
        this.recognition = new SpeechRec();
        this.recognition.lang = "zh-CN";
        this.recognition.continuous = true;
        this.recognition.interimResults = true;

        this.recognition.onresult = (event: any) => {
          let current = "";
          for (let i = 0; i < event.results.length; i++) {
            current += event.results[i][0].transcript;
          }
          this.recognizedText = current;
          if (options?.onInterimTranscript) {
            options.onInterimTranscript(current);
          }
        };

        this.recognition.onerror = (err: any) => {
          console.warn("[SpeechRec] Error:", err);
        };

        this.recognition.start();
      } catch (e) {
        console.warn("[SpeechRec] Failed to start recognition:", e);
      }
    }

    // 2. 尝试启动麦克风录音 MediaRecorder
    if (this.isAudioSupported()) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.audioStream = stream;

        // 探测最佳支持的 mimeType
        const mimeTypes = [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/ogg;codecs=opus",
          "audio/mp4",
          "",
        ];
        const selectedMime = mimeTypes.find(
          (m) => m === "" || MediaRecorder.isTypeSupported(m)
        );

        this.mediaRecorder = selectedMime
          ? new MediaRecorder(stream, { mimeType: selectedMime })
          : new MediaRecorder(stream);

        this.mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            this.audioChunks.push(e.data);
          }
        };

        this.mediaRecorder.start(200); // 200ms 一个分片
      } catch (err) {
        console.warn("[VoiceRecorder] Microphone stream error:", err);
        if (options?.onError) {
          options.onError(err);
        }
      }
    }
  }

  /**
   * 结束录音，生成语音条 DataURL 与转写文字
   */
  public async stopRecording(): Promise<VoiceRecordingResult> {
    if (!this.isRecording) {
      return {
        audioDuration: 0,
        transcript: "",
      };
    }

    this.isRecording = false;
    this.recordedDuration = Math.max(1, Math.round((Date.now() - this.startTime) / 1000));

    // 停止语音识别
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }

    // 停止音频流与录音器
    let audioData: string | undefined = undefined;
    let audioBlob: Blob | undefined = undefined;

    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      audioBlob = await new Promise<Blob>((resolve) => {
        if (!this.mediaRecorder) return resolve(new Blob());
        this.mediaRecorder.onstop = () => {
          const blob = new Blob(this.audioChunks, {
            type: this.mediaRecorder?.mimeType || "audio/webm",
          });
          resolve(blob);
        };
        try {
          this.mediaRecorder.stop();
        } catch {
          resolve(new Blob());
        }
      });

      // 释放麦克风权限
      if (this.audioStream) {
        this.audioStream.getTracks().forEach((track) => track.stop());
        this.audioStream = null;
      }
      this.mediaRecorder = null;

      if (audioBlob && audioBlob.size > 0) {
        audioData = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.onerror = () => resolve("");
          reader.readAsDataURL(audioBlob!);
        });
      }
    }

    return {
      audioBlob,
      audioData,
      audioDuration: this.recordedDuration,
      transcript: this.recognizedText.trim(),
    };
  }

  /**
   * 取消录音并释放设备
   */
  public cancelRecording(): void {
    this.isRecording = false;
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch {}
      this.recognition = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      try {
        this.mediaRecorder.stop();
      } catch {}
      this.mediaRecorder = null;
    }
    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }
    this.audioChunks = [];
    this.recognizedText = "";
  }

  /**
   * 播放微信同款语音条
   */
  public playVoiceAudio(
    audioData: string,
    onEnded?: () => void,
    onError?: () => void
  ): () => void {
    // 停止前一个正在播放的语音
    this.stopCurrentVoice();

    if (!audioData) {
      if (onError) onError();
      return () => {};
    }

    try {
      const audioElem = new Audio(audioData);
      activeAudio = audioElem;

      const finishHandler = () => {
        if (activeAudio === audioElem) {
          activeAudio = null;
          activeStopCallback = null;
        }
        if (onEnded) onEnded();
      };

      const errorHandler = () => {
        if (activeAudio === audioElem) {
          activeAudio = null;
          activeStopCallback = null;
        }
        if (onError) onError();
      };

      audioElem.addEventListener("ended", finishHandler, { once: true });
      audioElem.addEventListener("error", errorHandler, { once: true });

      const stopFn = () => {
        try {
          audioElem.pause();
          audioElem.currentTime = 0;
        } catch {}
        if (activeAudio === audioElem) {
          activeAudio = null;
          activeStopCallback = null;
        }
        if (onEnded) onEnded();
      };

      activeStopCallback = stopFn;

      audioElem.play().catch((err) => {
        console.warn("[VoiceService] Play error:", err);
        errorHandler();
      });

      return stopFn;
    } catch (e) {
      console.warn("[VoiceService] Create audio error:", e);
      if (onError) onError();
      return () => {};
    }
  }

  public stopCurrentVoice(): void {
    if (activeStopCallback) {
      activeStopCallback();
      activeStopCallback = null;
    } else if (activeAudio) {
      try {
        activeAudio.pause();
        activeAudio.currentTime = 0;
      } catch {}
      activeAudio = null;
    }
  }
}

export const voiceRecorder = new VoiceService();
