import "./globals.css";

export const metadata = {
  title: "Sistema de Sorteios",
  description: "Sorteios para eventos e campanhas promocionais",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <div id="ld-screen">
          <div className="ld-orb ld-orb-1" />
          <div className="ld-orb ld-orb-2" />
          <div className="ld-orb ld-orb-3" />
          <div className="ld-panel">
            <div className="ld-spinner" aria-hidden="true">
              <div className="ld-ring ld-ring-a" />
              <div className="ld-ring ld-ring-b" />
              <div className="ld-ring ld-ring-c" />
              <div className="ld-core">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="8.5" cy="5.5" r="2.1" stroke="#8b9aff" strokeWidth="1.5" />
                  <circle cx="15.5" cy="5.5" r="2.1" stroke="#8b9aff" strokeWidth="1.5" />
                  <rect x="10.3" y="4.3" width="3.4" height="3.4" rx="0.8" fill="#c4b5fd" stroke="#8b9aff" strokeWidth="1" opacity="0.9" />
                  <rect x="3" y="9" width="18" height="5" rx="1" fill="rgba(79,95,255,0.14)" stroke="#8b9aff" strokeWidth="1.5" />
                  <rect x="3.5" y="14" width="17" height="7.5" rx="1.2" fill="rgba(79,95,255,0.1)" stroke="#8b9aff" strokeWidth="1.5" />
                  <rect x="10.6" y="9" width="2.8" height="12.5" fill="#c4b5fd" opacity="0.85" />
                </svg>
              </div>
            </div>
            <div className="ld-brand">
              <span className="ld-brand-name">AS Brasil</span>
              <span className="ld-brand-tag">Sistema de Sorteios</span>
            </div>
            <div className="ld-divider" />
            <div className="ld-progress-wrap">
              <div className="ld-bar">
                <div className="ld-bar-fill" />
              </div>
              <span className="ld-status">Carregando</span>
            </div>
          </div>
        </div>

        {children}

        <style>{`
          #ld-screen {
            position: fixed;
            z-index: 9999;
            inset: 0;
            display: grid;
            place-items: center;
            background: #05070f;
            overflow: hidden;
            font-family: system-ui, sans-serif;
            transition: opacity 0.4s ease;
          }
          .ld-orb {
            position: absolute;
            border-radius: 50%;
            filter: blur(72px);
            pointer-events: none;
          }
          .ld-orb-1 {
            width: 520px;
            height: 520px;
            top: -200px;
            left: -180px;
            background: radial-gradient(circle, rgba(79, 95, 255, 0.32) 0, transparent 65%);
            animation: ldOrbA 14s ease-in-out infinite;
          }
          .ld-orb-2 {
            width: 460px;
            height: 460px;
            bottom: -160px;
            right: -130px;
            background: radial-gradient(circle, rgba(124, 58, 237, 0.27) 0, transparent 65%);
            animation: ldOrbA 18s ease-in-out infinite reverse;
            animation-delay: -7s;
          }
          .ld-orb-3 {
            width: 320px;
            height: 320px;
            top: 32%;
            right: 16%;
            background: radial-gradient(circle, rgba(34, 211, 238, 0.2) 0, transparent 65%);
            animation: ldOrbB 11s ease-in-out infinite;
            animation-delay: -4s;
          }
          .ld-panel {
            position: relative;
            z-index: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
            padding: 44px 56px 38px;
            border-radius: 30px;
            border: 1px solid rgba(139, 154, 255, 0.2);
            background: linear-gradient(148deg, rgba(15, 18, 42, 0.94) 0, rgba(15, 18, 42, 0.8) 100%);
            backdrop-filter: blur(24px) saturate(1.5);
            box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.04), 0 48px 80px rgba(0, 0, 0, 0.6), 0 0 80px rgba(79, 95, 255, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.08);
            animation: ldPanelIn 0.9s cubic-bezier(0.22, 1, 0.36, 1) both;
          }
          .ld-spinner {
            position: relative;
            width: 134px;
            height: 134px;
          }
          .ld-ring {
            position: absolute;
            border-radius: 50%;
            border-style: solid;
            border-color: transparent;
            border-width: 2.5px;
          }
          .ld-ring-a {
            inset: 0;
            border-top-color: #4f5fff;
            border-right-color: rgba(79, 95, 255, 0.22);
            animation: ldCW 1.9s linear infinite;
            filter: drop-shadow(0 0 6px rgba(79, 95, 255, 0.85));
          }
          .ld-ring-b {
            inset: 17px;
            border-top-color: #a78bfa;
            border-left-color: rgba(167, 139, 250, 0.22);
            animation: ldCCW 1.3s linear infinite;
            filter: drop-shadow(0 0 5px rgba(167, 139, 250, 0.75));
          }
          .ld-ring-c {
            inset: 34px;
            border-bottom-color: #22d3ee;
            border-right-color: rgba(34, 211, 238, 0.22);
            animation: ldCW 0.95s linear infinite;
            filter: drop-shadow(0 0 4px rgba(34, 211, 238, 0.85));
          }
          .ld-core {
            position: absolute;
            inset: 45px;
            border-radius: 50%;
            background: radial-gradient(circle at 38% 35%, rgba(79, 95, 255, 0.18), rgba(15, 18, 42, 0.98));
            border: 1px solid rgba(139, 154, 255, 0.28);
            display: grid;
            place-items: center;
            animation: ldCorePulse 2.8s ease-in-out infinite;
          }
          .ld-brand {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 5px;
          }
          .ld-brand-name {
            font-size: 1.5rem;
            font-weight: 900;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            background: linear-gradient(120deg, #bfdbfe 0, #93c5fd 20%, #c4b5fd 45%, #67e8f9 70%, #bfdbfe 100%);
            background-size: 300% auto;
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: ldShimmer 4s linear infinite;
          }
          .ld-brand-tag {
            font-size: 0.67rem;
            font-weight: 600;
            letter-spacing: 0.22em;
            text-transform: uppercase;
            color: #fff;
            opacity: 0.85;
          }
          .ld-divider {
            width: 100%;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(139, 154, 255, 0.2), transparent);
          }
          .ld-progress-wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            width: 100%;
          }
          .ld-bar {
            width: 192px;
            height: 3px;
            border-radius: 999px;
            background: rgba(30, 34, 59, 0.9);
            overflow: hidden;
            position: relative;
          }
          .ld-bar-fill {
            position: absolute;
            top: 0;
            left: 0;
            height: 100%;
            width: 42%;
            border-radius: inherit;
            background: linear-gradient(90deg, #4f5fff, #22d3ee, #a78bfa);
            background-size: 200% auto;
            box-shadow: 0 0 14px rgba(79, 95, 255, 0.8), 0 0 6px rgba(34, 211, 238, 0.55);
            animation: ldSlide 1.6s ease-in-out infinite, ldShimmer 2s linear infinite;
          }
          .ld-status {
            font-size: 0.7rem;
            font-weight: 600;
            letter-spacing: 0.1em;
            text-transform: uppercase;
            color: #fff;
            opacity: 0.85;
          }
          .ld-status::after {
            content: "";
            animation: ldDots 2s steps(4, end) infinite;
          }
          @keyframes ldCW {
            to { transform: rotate(360deg); }
          }
          @keyframes ldCCW {
            to { transform: rotate(-360deg); }
          }
          @keyframes ldOrbA {
            0%, 100% { transform: translate(0, 0); }
            50% { transform: translate(50px, 36px); }
          }
          @keyframes ldOrbB {
            0%, 100% { transform: translate(0, 0); }
            33% { transform: translate(-26px, 20px); }
            66% { transform: translate(22px, -16px); }
          }
          @keyframes ldShimmer {
            0% { background-position: 0 center; }
            100% { background-position: 300% center; }
          }
          @keyframes ldSlide {
            0% { transform: translateX(-140%); }
            100% { transform: translateX(310%); }
          }
          @keyframes ldDots {
            0% { content: ""; }
            25% { content: "."; }
            50% { content: ".."; }
            75% { content: "..."; }
            100% { content: ""; }
          }
          @keyframes ldPanelIn {
            from { opacity: 0; transform: translateY(28px) scale(0.92); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
          @keyframes ldCorePulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(79, 95, 255, 0); }
            50% { box-shadow: 0 0 0 5px rgba(79, 95, 255, 0.1); }
          }
          @media (max-width: 480px) {
            .ld-panel { padding: 36px 28px 30px; border-radius: 24px; gap: 16px; }
            .ld-brand-name { font-size: 1.25rem; }
            .ld-spinner { width: 110px; height: 110px; }
            .ld-ring-b { inset: 14px; }
            .ld-ring-c { inset: 28px; }
            .ld-core { inset: 38px; }
            .ld-bar { width: 160px; }
          }
        `}</style>

        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                function hideLoading() {
                  var el = document.getElementById("ld-screen");
                  if (!el || el.dataset.hidden) return;
                  el.dataset.hidden = "1";
                  el.style.opacity = "0";
                  setTimeout(function () {
                    el.style.display = "none";
                  }, 420);
                }
                window.addEventListener("load", function () {
                  setTimeout(hideLoading, 700);
                });
                setTimeout(hideLoading, 4000);
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}