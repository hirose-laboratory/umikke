'use client';

// ==========================================
// 1. 型定義 (Props)
// ==========================================
interface RightSidebarProps {
  showMarinePanel: boolean;
  setShowMarinePanel: (show: boolean) => void;
  showFishPanel: boolean;
  setShowFishPanel: (show: boolean) => void;
  activeMarineLayers: string[];
  setActiveMarineLayers: (layers: string[]) => void;
  activeFishLayers: string[];
  setActiveFishLayers: (layers: string[]) => void;
  isLoggedIn?: boolean;
  setShowLoginModal: (show: boolean) => void;
}

// ==========================================
// 2. 右側レイヤー選択サイドバーコンポーネント
// ==========================================
export default function RightSidebar({
  showMarinePanel,
  setShowMarinePanel,
  showFishPanel,
  setShowFishPanel,
  activeMarineLayers,
  setActiveMarineLayers,
  activeFishLayers,
  setActiveFishLayers,
  isLoggedIn = false,
  setShowLoginModal,
}: RightSidebarProps) {

  // 海況ラジオボタン（水温 / クロロフィルa濃度）の切り替え処理
  const handleRadioMarineLayer = (selectedLayer: 'sst' | 'chl') => {
    if (activeMarineLayers.includes(selectedLayer)) {
      // すでに選択されているものをクリックした場合は選択解除
      setActiveMarineLayers(activeMarineLayers.filter(l => l !== selectedLayer));
    } else {
      // 既存の sst / chl を解除し、新たに選択された方をセット（current は保持）
      const filtered = activeMarineLayers.filter(l => l !== 'sst' && l !== 'chl');
      setActiveMarineLayers([...filtered, selectedLayer]);
    }
  };

  // 独立チェックボックス（流向・流速）の切り替え
  const toggleMarineLayer = (layer: string) => {
    if (activeMarineLayers.includes(layer)) {
      setActiveMarineLayers(activeMarineLayers.filter(l => l !== layer));
    } else {
      setActiveMarineLayers([...activeMarineLayers, layer]);
    }
  };

  // 魚種分布レイヤーの表示切り替え
  const toggleFishLayer = (fish: string) => {
    if (activeFishLayers.includes(fish)) {
      setActiveFishLayers(activeFishLayers.filter(f => f !== fish));
    } else {
      setActiveFishLayers([...activeFishLayers, fish]);
    }
  };
  
  return (
    <div className="right-sidebar" style={{ position: 'absolute', top: '140px', right: '30px', display: 'flex', flexDirection: 'column', gap: '24px', pointerEvents: 'auto' }}>
      
      {/* 1. 海況状況パネル (水温 / クロロフィル / 流向・流速) */}
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
            
            {/* 🔵 青枠グループ（ラジオボタン表示：水温 / クロロフィルa濃度） */}
            <div style={{
              border: '3px solid #3b82f6',
              backgroundColor: 'rgba(59, 130, 246, 0.15)',
              borderRadius: '20px',
              padding: '20px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ fontSize: '20px', color: '#93c5fd', fontWeight: 'bold' }}>
                ※ いずれか1つを選択
              </div>

              {/* 水温 */}
              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'white', fontSize: '28px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="marineLayerGroup"
                  checked={activeMarineLayers.includes('sst')} 
                  onChange={() => handleRadioMarineLayer('sst')} 
                  style={{ width: '36px', height: '36px', cursor: 'pointer', accentColor: '#3b82f6' }} 
                />
                水温
              </label>

              {/* クロロフィルa濃度 */}
              <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'white', fontSize: '28px', cursor: 'pointer' }}>
                <input 
                  type="radio" 
                  name="marineLayerGroup"
                  checked={activeMarineLayers.includes('chl')} 
                  onChange={() => handleRadioMarineLayer('chl')} 
                  style={{ width: '36px', height: '36px', cursor: 'pointer', accentColor: '#3b82f6' }} 
                />
                クロロフィルa濃度
              </label>
            </div>

            {/* ⬛ 独立チェックボックス：流向・流速 */}
            <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'white', fontSize: '28px', cursor: 'pointer', marginTop: '4px' }}>
              <input 
                type="checkbox" 
                checked={activeMarineLayers.includes('current')} 
                onChange={() => toggleMarineLayer('current')} 
                style={{ width: '40px', height: '40px', cursor: 'pointer', accentColor: '#1a237e' }} 
              />
              流向・流速
            </label>

          </div>
        )}
      </div>

      {/* 2. 魚種分布パネル (マダイ / ブリ / 伊勢エビ) */}
      <div className="layer-container" style={{ position: 'relative', background: '#888', borderRadius: '24px', width: '560px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* 未ログイン時ブロックオーバーレイ */}
        {!isLoggedIn && (
          <div 
            onClick={() => setShowLoginModal(true)}
            style={{ 
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
              backgroundColor: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', 
              zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
              padding: '20px', cursor: 'pointer' 
            }}
          >
            <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)', color: 'white', padding: '16px 28px', borderRadius: '40px', fontSize: '26px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span>🔒 ログインして機能を開放</span>
            </div>
            <span style={{ color: 'white', fontSize: '20px', fontWeight: 'bold', marginTop: '16px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
              ログインすると分布や予測が見れます
            </span>
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
            {['カタクチイワシ', 'ブリ', '伊勢エビ'].map((fish) => (
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