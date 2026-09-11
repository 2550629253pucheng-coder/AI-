import React, { useState, useEffect, useRef } from "react";
import { Copy, Check, X, Sparkles, Download, Image as ImageIcon } from "lucide-react";
import { motion } from "motion/react";
import { Game, RoomPlayer, Team } from "../types/game.js";
import { audio } from "../utils/audio.js";

interface ShareCardModalProps {
  game: Game;
  roomPlayers: RoomPlayer[];
  onClose: () => void;
}

export const ShareCardModal: React.FC<ShareCardModalProps> = ({
  game,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const isNormalWin = game.winnerTeam === Team.NORMAL;
  const spy = game.revealedSpies?.[0];
  const report = game.report;

  const shareText = `【AI局中局 · 战报】
我们在《${game.themeName}》经历了一场激战！
结果：${isNormalWin ? "普通员工大获全胜，成功缉拿内鬼！" : "内鬼隐匿极深，成功带节奏脱身！"}
🕵️ 真正内鬼：${spy ? `${spy.name} (${spy.roleName})` : "隐藏极深"}
🏆 推理王：${report?.bestDetective || "全场MVP"}
🎭 演技大奖：${report?.bestActor || "影帝级表现"}
快来一起玩微信小游戏《AI局中局》！`;

  // 使用 HTML5 Canvas 绘制 2x Retina 高清战绩海报
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = 640;
    const height = 880;
    canvas.width = width;
    canvas.height = height;

    // 1. 背景暗夜深紫黑渐变
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, "#1A1730"); // cyber-card
    bgGrad.addColorStop(0.5, "#12111F"); // cyber-mid
    bgGrad.addColorStop(1, "#0A0A14"); // cyber-deep
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. 装饰性网格与霓虹紫微光
    ctx.save();
    ctx.strokeStyle = "rgba(139, 92, 246, 0.08)";
    ctx.lineWidth = 1;
    for (let x = 30; x < width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 30; y < height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // 顶部与中心紫粉霓虹微光
    const radialGrad = ctx.createRadialGradient(width / 2, 140, 10, width / 2, 140, 260);
    radialGrad.addColorStop(0, "rgba(192, 132, 252, 0.22)");
    radialGrad.addColorStop(0.7, "rgba(236, 72, 153, 0.08)");
    radialGrad.addColorStop(1, "rgba(10, 10, 20, 0)");
    ctx.fillStyle = radialGrad;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();

    // 3. 边框线与内框 (赛博霓虹双线边框)
    ctx.save();
    ctx.strokeStyle = "rgba(139, 92, 246, 0.5)";
    ctx.lineWidth = 3;
    ctx.strokeRect(24, 24, width - 48, height - 48);

    ctx.strokeStyle = "rgba(34, 211, 238, 0.18)";
    ctx.lineWidth = 1;
    ctx.strokeRect(32, 32, width - 64, height - 64);
    ctx.restore();

    // 4. 头部 Header
    ctx.fillStyle = "#C084FC";
    ctx.font = "bold 20px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("✦ AI 局 中 局 · 终 局 战 报 ✦", width / 2, 75);

    ctx.fillStyle = "#94A3B8";
    ctx.font = "16px sans-serif";
    ctx.fillText("微信社交推理小游戏 · AI导演实时推演", width / 2, 105);

    // 5. 剧本主题大标题
    ctx.fillStyle = "#FAF5FF";
    ctx.font = "bold 32px sans-serif";
    ctx.fillText(game.themeName.split("·")[0].trim(), width / 2, 160);

    // 6. 胜负大徽章
    const badgeY = 195;
    ctx.save();
    ctx.fillStyle = isNormalWin ? "rgba(45, 212, 191, 0.2)" : "rgba(236, 72, 153, 0.2)";
    ctx.strokeStyle = isNormalWin ? "rgba(45, 212, 191, 0.8)" : "rgba(236, 72, 153, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(width / 2 - 180, badgeY, 360, 52, 26);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isNormalWin ? "#2DD4BF" : "#EC4899";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText(isNormalWin ? "🛡️ 普通员工阵营大获全胜！" : "🕵️ 内鬼阵营成功潜伏胜出！", width / 2, badgeY + 35);
    ctx.restore();

    // 7. 详细对局信息框
    const boxY = 275;
    ctx.save();
    ctx.fillStyle = "rgba(18, 17, 31, 0.92)";
    ctx.strokeStyle = "rgba(43, 39, 74, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(48, boxY, width - 96, 420, 20);
    ctx.fill();
    ctx.stroke();

    // 真正内鬼公示
    ctx.textAlign = "left";
    let curY = boxY + 45;
    ctx.fillStyle = "#EC4899";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText("【🕵️ 真正内鬼】", 72, curY);
    ctx.fillStyle = "#FCE7F3";
    ctx.font = "18px sans-serif";
    ctx.fillText(spy ? `${spy.name}（担任职务：${spy.roleName}）` : "隐藏至深，未被当场抓获", 220, curY);

    // 分割线
    curY += 30;
    ctx.strokeStyle = "rgba(43, 39, 74, 0.7)";
    ctx.beginPath();
    ctx.moveTo(72, curY);
    ctx.lineTo(width - 72, curY);
    ctx.stroke();

    // 推理王
    curY += 45;
    ctx.fillStyle = "#C084FC";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText("【🏆 逻辑推理王】", 72, curY);
    ctx.fillStyle = "#E9D5FF";
    ctx.font = "18px sans-serif";
    ctx.fillText(report?.bestDetective || "全场普通员工", 240, curY);

    // 最佳演技
    curY += 50;
    ctx.fillStyle = "#EC4899";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText("【🎭 最佳演技奖】", 72, curY);
    ctx.fillStyle = "#FCE7F3";
    ctx.font = "18px sans-serif";
    ctx.fillText(report?.bestActor || "神秘影帝", 240, curY);

    // 分割线
    curY += 30;
    ctx.strokeStyle = "rgba(43, 39, 74, 0.7)";
    ctx.beginPath();
    ctx.moveTo(72, curY);
    ctx.lineTo(width - 72, curY);
    ctx.stroke();

    // AI复盘点评
    curY += 40;
    ctx.fillStyle = "#94A3B8";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText("✦ AI 导演深度复盘点评：", 72, curY);

    curY += 28;
    ctx.fillStyle = "#E2E8F0";
    ctx.font = "15px sans-serif";
    const summaryText = report?.summary || "这是一场惊心动魄的职场智斗，每个人都在怀疑与被怀疑中步步为营。";
    // 文本换行渲染
    const maxCharsPerLine = 26;
    for (let i = 0; i < summaryText.length && i < maxCharsPerLine * 3; i += maxCharsPerLine) {
      const line = summaryText.slice(i, i + maxCharsPerLine);
      ctx.fillText(line, 72, curY);
      curY += 24;
    }

    // 名场面
    if (report?.funniestMoment) {
      curY += 10;
      ctx.fillStyle = "#22D3EE";
      ctx.font = "italic 15px sans-serif";
      ctx.fillText(`“名场面：${report.funniestMoment.slice(0, 30)}...”`, 72, curY);
    }
    ctx.restore();

    // 8. 底部二维码/房间召唤文案
    const footerY = 740;
    ctx.textAlign = "center";
    ctx.fillStyle = "#C084FC";
    ctx.font = "bold 18px monospace";
    ctx.fillText(`房号对决档案：#${game.gameId.slice(-6).toUpperCase()}`, width / 2, footerY);

    ctx.fillStyle = "#64748B";
    ctx.font = "14px sans-serif";
    ctx.fillText("微信扫码或输入房间号，即刻开启下一局深夜对决！", width / 2, footerY + 30);
    ctx.fillText("长按或点击下方按钮保存本战绩海报", width / 2, footerY + 54);

    // 导出 DataURL
    try {
      const dataUrl = canvas.toDataURL("image/png");
      setImageUrl(dataUrl);
    } catch (e) {
      console.warn("Canvas toDataURL failed:", e);
    } finally {
      setIsGenerating(false);
    }
  }, [game, isNormalWin, spy, report]);

  const handleDownload = () => {
    if (!imageUrl) return;
    audio.playClick();
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `AI局中局_战报_${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const copyText = () => {
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    audio.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/60 dark:bg-black/85 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="战报海报分享弹窗"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.94 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-cyber-card border border-slate-200 dark:border-cyber-border-bright rounded-3xl p-4 sm:p-5 max-w-sm w-full shadow-xl space-y-3 relative max-h-[92vh] flex flex-col neon-glow-purple"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded-full hover:bg-slate-100 dark:hover:bg-cyber-card-hover transition"
          aria-label="关闭弹窗"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-1.5 text-xs text-indigo-700 dark:text-neon-lightpurple font-bold tracking-wide">
          <Sparkles className="w-4 h-4 text-pink-600 dark:text-neon-pink" />
          <span>微信战绩分享海报</span>
        </div>

        {/* 隐藏绘制用 Canvas */}
        <canvas ref={canvasRef} className="hidden" />

        {/* 图片预览区 */}
        <div className="flex-1 overflow-y-auto rounded-2xl bg-slate-50 dark:bg-cyber-deep border border-slate-200 dark:border-cyber-border flex items-center justify-center p-2 min-h-[300px]">
          {isGenerating ? (
            <div className="text-center py-12 text-xs text-slate-500 dark:text-neutral-400 space-y-2">
              <div className="w-6 h-6 border-2 border-indigo-600 dark:border-neon-purple border-t-transparent rounded-full animate-spin mx-auto" />
              <p>AI 正在渲染高清对局海报...</p>
            </div>
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt="对局战报海报"
              className="w-full h-auto rounded-xl shadow-md border border-slate-200 dark:border-neon-purple/40 object-contain"
            />
          ) : (
            <div className="text-center text-xs text-slate-400 dark:text-neutral-500">海报生成受阻，请直接复制文字战报</div>
          )}
        </div>

        <p className="text-[11px] text-slate-500 dark:text-neutral-400 text-center font-medium">
          手机端可长按图片直接发送给微信好友或保存相册
        </p>

        {/* 动作栏 */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleDownload}
            disabled={!imageUrl}
            className="py-2.5 btn-primary-neon active:scale-[0.99] text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>保存海报图片</span>
          </button>

          <button
            onClick={copyText}
            className="btn-secondary-cyan py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition shadow-xs"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600 dark:text-neon-teal" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? "文本已复制" : "复制文字战报"}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
