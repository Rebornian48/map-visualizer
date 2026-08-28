import React, { useState } from "react";

export default function FirstVisitNotice() {
  const [visible, setVisible] = useState(true);
  const dismiss = () => setVisible(false);
  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 3000, maxWidth: 480, width: 'calc(100% - 32px)',
        background: "var(--surface-solid)",
        border: "1px solid var(--border)",
        borderLeft: "3px solid var(--accent)",
        borderRadius: "var(--radius)",
        boxShadow: "var(--shadow)",
        padding: "14px 16px",
      display: 'flex', alignItems: 'flex-start', gap: 12,
        animation: "notice-in 0.3s ease-out",
    }}>
      <style>{`
        @keyframes notice-in {
          from { opacity: 0; transform: translateX(-50%) translateY(-8px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
      <div style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.5 }}>
        Untuk ekspor video, saat ini masih dalam proses pengembangan dan masih belum sempurna. Terima Kasih 🙂
      </div>
      <button onClick={dismiss} aria-label="Close" style={{
        background: 'none', border: 'none', color: 'var(--text-dim)',
        cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1, padding: 0,
          marginTop: -2,
      }}>×</button>
    </div>
  );
}
