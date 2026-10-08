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

  // ラジオボタン切替（水温 / クロロフィルa濃度）
  const handleRadioMarineLayer = (selectedLayer: 'sst' | 'chl') => {
    if (activeMarineLayers.includes(selectedLayer)) {
      setActiveMarineLayers(activeMarineLayers.filter(l => l !== selectedLayer));
    } else {
      const filtered = activeMarineLayers.filter(l => l !== 'sst' && l !== 'chl');
      setActiveMarineLayers([...filtered, selectedLayer]);
    }
  };

  // 独立チェックボックス切替（流向・流速）
  const toggleMarineLayer = (layer: string) => {
    if (activeMarineLayers.includes(layer)) {
      setActiveMarineLayers(activeMarineLayers.filter(l => l !== layer));
    } else {
      setActiveMarineLayers([...activeMarineLayers, layer]);
    }
  };

  // 魚種レイヤー切替
  const toggleFishLayer = (fish: string) => {
    if (activeFishLayers.includes(fish)) {
      setActiveFishLayers(activeFishLayers.filter(f => f !== fish));
    } else {
      setActiveFishLayers([...activeFishLayers, fish]);
    }
  };

  const isSstSelected = activeMarineLayers.includes('sst');
  const isChlSelected = activeMarineLayers.includes('chl');
  const isCurrentSelected = activeMarineLayers.includes('current');

  return (
    <div className="right-sidebar" style={{ position: 'absolute', top: '140px', right: '30px', display: 'flex', flexDirection: 'column', gap: '24px', pointerEvents: 'auto' }}>
      
      {/* ========================================== */}
      {/* 1. 海況状況パネル */}
      {/* ========================================== */}
      <div className="layer-container" style={{ background: 'rgba(60, 64, 67, 0.9)', backdropFilter: 'blur(12px)', borderRadius: '24px', width: '560px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* パネルヘッダー */}
        <div className="layer-btn" onClick={() => setShowMarinePanel(!showMarinePanel)} style={{ color: 'white', padding: '24px 32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', boxSizing: 'border-box', border: 'none', textAlign: 'left' }}>
          <div className="layer-left" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div className="layer-color blue" style={{ width: '64px', height: '64px', borderRadius: '50%', flexShrink: 0, backgroundColor: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'white' }}>water_drop</span>
            </div>
            <div className="layer-text" style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="layer-title" style={{ fontSize: '40px', fontWeight: 'bold', lineHeight: 1.2 }}>海況状況</span>
              <span className="layer-sub" style={{ fontSize: '26px', color: '#cbd5e1', marginTop: '6px' }}>海況データ</span>
            </div>
          </div>
          <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>{showMarinePanel ? 'expand_more' : 'expand_less'}</span>
        </div>

        {showMarinePanel && (
          <div className="checkbox-panel" style={{ padding: '0 32px 32px 32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* 🔵 セグメント切り替えコントロール（水温 ⇔ クロロフィルa濃度） */}
            <div style={{
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              borderRadius: '20px',
              padding: '8px',
              display: 'flex',
              gap: '8px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              {/* 水温ボタン */}
              <button
                type="button"
                onClick={() => handleRadioMarineLayer('sst')}
                style={{
                  flex: 1,
                  padding: '16px 8px',
                  borderRadius: '14px',
                  border: isSstSelected ? '2px solid #60a5fa' : '2px solid transparent',
                  background: isSstSelected ? '#2563eb' : 'transparent',
                  color: isSstSelected ? '#ffffff' : '#94a3b8',
                  fontSize: '22px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                  boxShadow: isSstSelected ? '0 4px 12px rgba(37, 99, 235, 0.4)' : 'none'
                }}
              >
                <span style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: isSstSelected ? '5px solid #ffffff' : '2px solid #64748b',
                  backgroundColor: isSstSelected ? '#2563eb' : 'transparent',
                  boxSizing: 'border-box',
                  flexShrink: 0
                }} />
                水温
              </button>

              {/* クロロフィルa濃度ボタン */}
              <button
                type="button"
                onClick={() => handleRadioMarineLayer('chl')}
                style={{
                  flex: 1,
                  padding: '16px 8px',
                  borderRadius: '14px',
                  border: isChlSelected ? '2px solid #60a5fa' : '2px solid transparent',
                  background: isChlSelected ? '#2563eb' : 'transparent',
                  color: isChlSelected ? '#ffffff' : '#94a3b8',
                  fontSize: '22px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                  boxShadow: isChlSelected ? '0 4px 12px rgba(37, 99, 235, 0.4)' : 'none'
                }}
              >
                <span style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  border: isChlSelected ? '5px solid #ffffff' : '2px solid #64748b',
                  backgroundColor: isChlSelected ? '#2563eb' : 'transparent',
                  boxSizing: 'border-box',
                  flexShrink: 0
                }} />
                クロロフィルa濃度
              </button>
            </div>

            {/* ⬛ 流向・流速（独立トグルカード） */}
            <div
              onClick={() => toggleMarineLayer('current')}
              style={{
                backgroundColor: isCurrentSelected ? 'rgba(37, 99, 235, 0.25)' : 'rgba(0, 0, 0, 0.2)',
                border: isCurrentSelected ? '2px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                gap: '20px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: isCurrentSelected ? 'none' : '2px solid #64748b',
                backgroundColor: isCurrentSelected ? '#2563eb' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '22px',
                fontWeight: 'bold'
              }}>
                {isCurrentSelected && '✓'}
              </div>
              <span style={{ color: 'white', fontSize: '28px', fontWeight: 'bold' }}>流向・流速</span>
            </div>

          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* 2. 魚種分布パネル */}
      {/* ========================================== */}
      <div className="layer-container" style={{ position: 'relative', background: 'rgba(60, 64, 67, 0.9)', backdropFilter: 'blur(12px)', borderRadius: '24px', width: '560px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* 未ログイン時ブロックオーバーレイ */}
        {!isLoggedIn && (
          <div 
            onClick={() => setShowLoginModal(true)}
            style={{ 
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
              backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', 
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

        {/* パネルヘッダー */}
        <div className="layer-btn" onClick={() => setShowFishPanel(!showFishPanel)} style={{ color: 'white', padding: '24px 32px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', boxSizing: 'border-box', border: 'none', textAlign: 'left' }}>
          <div className="layer-left" style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
            <div className="layer-color purple" style={{ width: '64px', height: '64px', borderRadius: '50%', flexShrink: 0, backgroundColor: '#8e24aa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6.5 12c.94-2.07 3.08-3.5 5.5-3.5c3.5 0 6.5 3.5 7.5 3.5c-1 0-4 3.5-7.5 3.5c-2.42 0-4.56-1.43-5.5-3.5z" />
                <circle cx="15.5" cy="10.5" r="1" fill="white" />
                <path d="M2 16l4.5-4L2 8" />
              </svg>
            </div>
            <div className="layer-text" style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="layer-title" style={{ fontSize: '40px', fontWeight: 'bold', lineHeight: 1.2 }}>魚種分布</span>
              <span className="layer-sub" style={{ fontSize: '26px', color: '#cbd5e1', marginTop: '6px' }}>魚種カテゴリ別表示</span>
            </div>
          </div>
          <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>{showFishPanel ? 'expand_more' : 'expand_less'}</span>
        </div>

        {/* 魚種リスト */}
        {showFishPanel && (
          <div className="checkbox-panel" style={{ padding: '0 32px 32px 32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {['カタクチイワシ', 'ブリ', '伊勢エビ'].map((fish) => {
              const isSelected = activeFishLayers.includes(fish);
              return (
                <div
                  key={fish}
                  onClick={() => toggleFishLayer(fish)}
                  style={{
                    backgroundColor: isSelected ? 'rgba(142, 36, 170, 0.25)' : 'rgba(0, 0, 0, 0.2)',
                    border: isSelected ? '2px solid #ab47bc' : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '16px',
                    padding: '18px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '20px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    border: isSelected ? 'none' : '2px solid #64748b',
                    backgroundColor: isSelected ? '#8e24aa' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '22px',
                    fontWeight: 'bold'
                  }}>
                    {isSelected && '✓'}
                  </div>
                  <span style={{ color: 'white', fontSize: '28px', fontWeight: 'bold' }}>{fish}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}