// src/components/RightSidebar.tsx
'use client';

interface RightSidebarProps {
  showMarinePanel: boolean;
  setShowMarinePanel: (show: boolean) => void;
  showFishPanel: boolean;
  setShowFishPanel: (show: boolean) => void;
  activeMarineLayer: string;
  setActiveMarineLayer: (layer: string) => void;
  showEdnaPanel: boolean;
  setShowEdnaPanel: (show: boolean) => void;
  showEdnaHeatmap: boolean;
  setShowEdnaHeatmap: (show: boolean) => void;
}

export default function RightSidebar({
  showMarinePanel,
  setShowMarinePanel,
  showFishPanel,
  setShowFishPanel,
  activeMarineLayer,
  setActiveMarineLayer,
  showEdnaPanel,
  setShowEdnaPanel,
  showEdnaHeatmap,
  setShowEdnaHeatmap,
}: RightSidebarProps) {
  
  return (
    <div
      className="right-sidebar"
      style={{ position: 'absolute', top: '140px', right: '30px', display: 'flex', flexDirection: 'column', gap: '24px', pointerEvents: 'auto' }}
    >
      {/* 1. 海況状況 */}
      <div className="layer-container" style={{ background: '#888', borderRadius: '24px', width: '560px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div
          className="layer-btn"
          onClick={() => setShowMarinePanel(!showMarinePanel)}
          style={{ background: '#888', color: 'white', padding: '24px 32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', boxSizing: 'border-box', border: 'none', textAlign: 'left' }}
        >
          <div className="layer-left" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div className="layer-color blue" style={{ width: '64px', height: '64px', borderRadius: '50%', flexShrink: 0, backgroundColor: '#1a237e' }}></div>
            <div className="layer-text" style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="layer-title" style={{ fontSize: '40px', fontWeight: 'bold', lineHeight: 1.2 }}>海況状況</span>
              <span className="layer-sub" style={{ fontSize: '28px', color: '#e0e0e0', marginTop: '8px' }}>海況データ</span>
            </div>
          </div>
          <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>
            {showMarinePanel ? 'expand_more' : 'expand_less'}
          </span>
        </div>

        {showMarinePanel && (
          <div className="checkbox-panel" style={{ padding: '0 32px 32px 120px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'white', fontSize: '28px', cursor: 'pointer' }}>
              <input type="radio" name="marineLayer" checked={activeMarineLayer === 'sst'} onChange={() => setActiveMarineLayer('sst')} style={{ width: '40px', height: '40px', cursor: 'pointer', accentColor: '#1a237e' }} /> 水温
            </label>
            <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'white', fontSize: '28px', cursor: 'pointer' }}>
              <input type="radio" name="marineLayer" checked={activeMarineLayer === 'chl'} onChange={() => setActiveMarineLayer('chl')} style={{ width: '40px', height: '40px', cursor: 'pointer', accentColor: '#1a237e' }} /> クロロフィルa濃度
            </label>
            <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'white', fontSize: '28px', cursor: 'pointer' }}>
              <input type="radio" name="marineLayer" checked={activeMarineLayer === 'current'} onChange={() => setActiveMarineLayer('current')} style={{ width: '40px', height: '40px', cursor: 'pointer', accentColor: '#1a237e' }} /> 流向・流速
            </label>
          </div>
        )}
      </div>

      {/* 2. 魚種分布 */}
      <div className="layer-container" style={{ background: '#888', borderRadius: '24px', width: '560px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div
          className="layer-btn"
          onClick={() => setShowFishPanel(!showFishPanel)}
          style={{ background: '#888', color: 'white', padding: '24px 32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', boxSizing: 'border-box', border: 'none', textAlign: 'left' }}
        >
          <div className="layer-left" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div className="layer-color purple" style={{ width: '64px', height: '64px', borderRadius: '50%', flexShrink: 0, backgroundColor: '#8e24aa' }}></div>
            <div className="layer-text" style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="layer-title" style={{ fontSize: '40px', fontWeight: 'bold', lineHeight: 1.2 }}>魚種分布</span>
              <span className="layer-sub" style={{ fontSize: '28px', color: '#e0e0e0', marginTop: '8px' }}>魚種カテゴリ別表示</span>
            </div>
          </div>
          <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>
            {showFishPanel ? 'expand_more' : 'expand_less'}
          </span>
        </div>

        {showFishPanel && (
          <div className="checkbox-panel" style={{ padding: '0 32px 32px 120px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {['アジ・サバ', 'ヒラメ・カレイ', 'エビ・カニ', 'イカ・タコ'].map((fish, index) => (
              <label key={fish} className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'white', fontSize: '28px', cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked={index < 2} style={{ width: '32px', height: '32px', cursor: 'pointer', accentColor: '#8e24aa' }} /> {fish}
              </label>
            ))}
          </div>
        )}
      </div>

      {/* 3. 環境DNA (eDNA) */}
      <div className="layer-container" style={{ background: '#888', borderRadius: '24px', width: '560px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div
          className="layer-btn"
          onClick={() => setShowEdnaPanel(!showEdnaPanel)}
          style={{ background: '#888', color: 'white', padding: '24px 32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', boxSizing: 'border-box', border: 'none', textAlign: 'left' }}
        >
          <div className="layer-left" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div className="layer-color green" style={{ width: '64px', height: '64px', borderRadius: '50%', flexShrink: 0, backgroundColor: '#2e7d32' }}></div>
            <div className="layer-text" style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="layer-title" style={{ fontSize: '40px', fontWeight: 'bold', lineHeight: 1.2 }}>環境DNA</span>
              <span className="layer-sub" style={{ fontSize: '28px', color: '#e0e0e0', marginTop: '8px' }}>eDNAヒートマップ</span>
            </div>
          </div>
          <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>
            {showEdnaPanel ? 'expand_more' : 'expand_less'}
          </span>
        </div>

        {showEdnaPanel && (
          <div className="checkbox-panel" style={{ padding: '0 32px 32px 120px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'white', fontSize: '28px', cursor: 'pointer' }}>
              <input type="checkbox" checked={showEdnaHeatmap} onChange={(e) => setShowEdnaHeatmap(e.target.checked)} style={{ width: '32px', height: '32px', cursor: 'pointer', accentColor: '#2e7d32' }} /> eDNA分布を表示
            </label>
          </div>
        )}
      </div>

    </div>
  );
}