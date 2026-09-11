import React, { StrictMode, Component, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMsg: string;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, errorMsg: "" };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorMsg: error?.message || String(error) };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("App Crash:", error, errorInfo);
  }

  handleReset = () => {
    localStorage.removeItem("ai_party_user");
    localStorage.removeItem("ai_impostor_token");
    window.location.href = window.location.pathname;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0A14] text-neutral-100 flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-[#1A1730] border border-[#8B5CF6]/40 p-6 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-[#EC4899]/20 border border-[#EC4899]/40 flex items-center justify-center mx-auto text-[#EC4899] text-xl font-bold">
              !
            </div>
            <h2 className="text-base font-bold text-white">遇到了一点小插曲</h2>
            <p className="text-xs text-neutral-400">
              可能是临时网络波动或会话状态变更，点击下方按钮即可一键恢复游戏。
            </p>
            <button
              onClick={this.handleReset}
              className="w-full py-3 bg-gradient-to-r from-[#8B5CF6] to-[#F472B6] text-white font-bold text-xs rounded-xl shadow-lg hover:opacity-90 transition"
            >
              重新进入《AI局中局》
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
