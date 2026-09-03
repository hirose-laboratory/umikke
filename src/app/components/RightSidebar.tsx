'use client';

interface RightSidebarProps {
  showMarinePanel: boolean;
  setShowMarinePanel: (show: boolean) => void;
  showFishPanel: boolean;
  setShowFishPanel: (show: boolean) => void;
  activeMarineLayers: string[];
  setActiveMarineLayers: (layers: string[]) => void;
  activeFishLayers: string[];
  setActiveFishLayers: (layers: string[]) => void;
  isLoggedIn?: boolean; // ★ ログイン状態の型
}

export default function RightSidebar({
  showMarinePanel,
  setShowMarinePanel,
  showFishPanel,
  setShowFishPanel,
  activeMarineLayers,
  setActiveMarineLayers,
  activeFishLayers,
  setActiveFishLayers,
  isLoggedIn = false, // ★ ここでログイン状態を受け取ります（デフォルトは未ログイン）
}: RightSidebarProps) {

  // 海況データの切り替え
  const toggleMarineLayer = (layer: string) => {
    if (activeMarineLayers.includes(layer)) {
      setActiveMarineLayers(activeMarineLayers.filter(l => l !== layer));
    } else {
      setActiveMarineLayers([...activeMarineLayers, layer]);
    }
  };

  // 魚種の切り替えロジック
  const toggleFishLayer = (fish: string) => {
    if (activeFishLayers.includes(fish)) {
      setActiveFishLayers(activeFishLayers.filter(f => f !== fish));
    } else {
      setActiveFishLayers([...activeFishLayers, fish]);
    }
  };
  
  return (
    <div className="right-sidebar" style={{ position: 'absolute', top: '140px', right: '30px', display: 'flex', flexDirection: 'column', gap: '24px', pointerEvents: 'auto' }}>
      
      {/* 1. 海況状況 */}
      <div className="layer-container" style={{ background: '#888', borderRadius: '24px', width: '560px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="layer-btn" onClick={() => setShowMarinePanel(!showMarinePanel)} style={{ background: '#888', color: 'white', padding: '24px 32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', boxSizing: 'border-box', border: 'none', textAlign: 'left' }}>
          <div className="layer-left" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div className="layer-color blue" style={{ width: '64px', height: '64px', borderRadius: '50%', flexShrink: 0, backgroundColor: '#1a237e' }}></div>
            <div className="layer-text" style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="layer-title" style={{ fontSize: '40px', fontWeight: 'bold', lineHeight: 1.2 }}>海況状況</span>
              <span className="layer-sub" style={{ fontSize: '28px', color: '#e0e0e0', marginTop: '8px' }}>海況データ</span>
            </div>
          </div>
          <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>{showMarinePanel ? 'expand_more' : 'expand_less'}</span>
        </div>

        {showMarinePanel && (
          <div className="checkbox-panel" style={{ padding: '0 32px 32px 120px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'white', fontSize: '28px', cursor: 'pointer' }}>
              <input type="checkbox" checked={activeMarineLayers.includes('sst')} onChange={() => toggleMarineLayer('sst')} style={{ width: '40px', height: '40px', cursor: 'pointer', accentColor: '#1a237e' }} /> 水温
            </label>
            <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'white', fontSize: '28px', cursor: 'pointer' }}>
              <input type="checkbox" checked={activeMarineLayers.includes('chl')} onChange={() => toggleMarineLayer('chl')} style={{ width: '40px', height: '40px', cursor: 'pointer', accentColor: '#1a237e' }} /> クロロフィルa濃度
            </label>
            <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'white', fontSize: '28px', cursor: 'pointer' }}>
              <input type="checkbox" checked={activeMarineLayers.includes('current')} onChange={() => toggleMarineLayer('current')} style={{ width: '40px', height: '40px', cursor: 'pointer', accentColor: '#1a237e' }} /> 流向・流速
            </label>
          </div>
        )}
      </div>

      {/* 2. 魚種分布（★未ログイン時はモザイクを被せる） */}
      <div className="layer-container" style={{ position: 'relative', background: '#888', borderRadius: '24px', width: '560px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* ★ 未ログイン時に被せるモザイク＆メッセージ表示エリア */}
        {!isLoggedIn && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.25)',
            backdropFilter: 'blur(6px)', // すりガラス状のモザイク
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: 'rgba(0, 0, 0, 0.85)',
              color: 'white',
              padding: '16px 28px',
              borderRadius: '40px',
              fontSize: '26px',
              fontWeight: 'bold',
              boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <span>🔒 ログインして機能を開放</span>
            </div>
          </div>
        )}

        <div className="layer-btn" onClick={() => setShowFishPanel(!showFishPanel)} style={{ background: '#888', color: 'white', padding: '24px 32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', boxSizing: 'border-box', border: 'none', textAlign: 'left' }}>
          <div className="layer-left" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div className="layer-color purple" style={{ width: '64px', height: '64px', borderRadius: '50%', flexShrink: 0, backgroundColor: '#8e24aa' }}></div>
            <div className="layer-text" style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="layer-title" style={{ fontSize: '40px', fontWeight: 'bold', lineHeight: 1.2 }}>魚種分布</span>
              <span className="layer-sub" style={{ fontSize: '28px', color: '#e0e0e0', marginTop: '8px' }}>魚種カテゴリ別表示</span>
            </div>
          </div>
          <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>{showFishPanel ? 'expand_more' : 'expand_less'}</span>
        </div>

        {showFishPanel && (
          <div className="checkbox-panel" style={{ padding: '0 32px 32px 120px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {['マダイ', 'ブリ', '伊勢エビ'].map((fish) => (
              <label key={fish} className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'white', fontSize: '28px', cursor: 'pointer' }}>
                <input type="checkbox" checked={activeFishLayers.includes(fish)} onChange={() => toggleFishLayer(fish)} style={{ width: '32px', height: '32px', cursor: 'pointer', accentColor: '#8e24aa' }} /> {fish}
              </label>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}