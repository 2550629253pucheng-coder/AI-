/**
 * AI局中局 - 小程序入口
 */
import { PropsWithChildren } from "react";
import { sessionStore } from "./store";
import "./app.css";

function App({ children }: PropsWithChildren) {
  // 冷启动恢复登录会话（token 有效性由首个 API 请求兜底，401 自动回登录页）
  sessionStore.restore();

  return children;
}

export default App;
