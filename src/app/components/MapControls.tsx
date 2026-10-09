'use client';

// ==========================================
// 1. 型定義 (Props)
// ==========================================
interface MapControlsProps {
  handleZoom: (amount: number) => void;
  handleJumpToCurrentLocation: () => void;
}

// ==========================================
// 2. マップ操作コントロールコンポーネント
// ==========================================
export default function MapControls({
  handleZoom,
  handleJumpToCurrentLocation,
}: MapControlsProps) {
  return (
    <div
      className="bottom-right-controls"
      style={{
        position: 'absolute',
        bottom: '40px',
        right: '30px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        alignItems: 'center',
        pointerEvents: 'auto',
      }}
    >
     

      {/* ズームコントロール (拡大 / 縮小) */}
      <div
        className="zoom-controls"
        style={{
          background: '#888',
          color: 'white',
          borderRadius: '35px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
        }}
      >
        <button
          className="zoom-btn"
          onClick={() => handleZoom(1)}
          style={{
            background: 'transparent',
            color: 'white',
            border: 'none',
            width: '70px',
            height: '70px',
            fontSize: '40px',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            borderBottom: '2px solid #aaa',
          }}
        >
          ＋
        </button>
        <button
          className="zoom-btn"
          onClick={() => handleZoom(-1)}
          style={{
            background: 'transparent',
            color: 'white',
            border: 'none',
            width: '70px',
            height: '70px',
            fontSize: '40px',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          −
        </button>
      </div>
    </div>
  );
}