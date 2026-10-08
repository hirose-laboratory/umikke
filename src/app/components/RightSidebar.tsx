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

  // 海況：水温とクロロフィルa濃度の排他切り替え（見た目はチェックボックスのまま裏で排他処理）
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
    <div 
      className="right-sidebar" 
      style={{ 
        position: 'absolute', 
        top: '120px', 
        right: '30px', 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '20px', 
        pointerEvents: 'auto' 
      }}
    >
      
      {/* ========================================== */}
      {/* 1. 海況状況パネル */}
      {/* ========================================== */}
      <div 
        className="layer-container" 
        style={{ 
          background: 'rgba(120, 120, 120, 0.92)', 
          backdropFilter: 'blur(10px)', 
          borderRadius: '28px', 
          width: '500px', 
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden' 
        }}
      >
        {/* パネルヘッダー */}
        <div 
          onClick={() => setShowMarinePanel(!showMarinePanel)} 
          style={{ 
            color: 'white', 
            padding: '28px 32px 20px 32px', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            width: '100%', 
            boxSizing: 'border-box' 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* 濃紺の丸型アイコン */}
            <div style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              backgroundColor: '#112384', 
              flexShrink: 0 
            }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '38px', fontWeight: 'bold', lineHeight: 1.1 }}>海況状況</span>
              <span style={{ fontSize: '24px', color: '#e2e8f0', marginTop: '4px' }}>海況データ</span>
            </div>
          </div>
          <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'white' }}>
            {showMarinePanel ? 'expand_more' : 'expand_less'}
          </span>
        </div>

        {/* 海況チェックボックスリスト */}
        {showMarinePanel && (
          <div style={{ padding: '8px 32px 32px 116px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* ① 水温 */}
            <div 
              onClick={() => handleRadioMarineLayer('sst')}
              style={{ display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer', userSelect: 'none' }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                backgroundColor: isSstSelected ? '#112384' : '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background-color 0.15s ease'
              }}>
                {isSstSelected && (
                  <span style={{ color: 'white', fontSize: '26px', fontWeight: 'bold', lineHeight: 1 }}>✓</span>
                )}
              </div>
              <span style={{ color: 'white', fontSize: '32px', fontWeight: 'bold' }}>水温</span>
            </div>

            {/* ② クロロフィルa濃度 */}
            <div 
              onClick={() => handleRadioMarineLayer('chl')}
              style={{ display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer', userSelect: 'none' }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                backgroundColor: isChlSelected ? '#112384' : '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background-color 0.15s ease'
              }}>
                {isChlSelected && (
                  <span style={{ color: 'white', fontSize: '26px', fontWeight: 'bold', lineHeight: 1 }}>✓</span>
                )}
              </div>
              <span style={{ color: 'white', fontSize: '32px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>クロロフィルa濃度</span>
            </div>

            {/* ③ 流向・流速 */}
            <div 
              onClick={() => toggleMarineLayer('current')}
              style={{ display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer', userSelect: 'none' }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                backgroundColor: isCurrentSelected ? '#112384' : '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'background-color 0.15s ease'
              }}>
                {isCurrentSelected && (
                  <span style={{ color: 'white', fontSize: '26px', fontWeight: 'bold', lineHeight: 1 }}>✓</span>
                )}
              </div>
              <span style={{ color: 'white', fontSize: '32px', fontWeight: 'bold' }}>流向・流速</span>
            </div>

          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* 2. 魚種分布パネル */}
      {/* ========================================== */}
      <div 
        className="layer-container" 
        style={{ 
          position: 'relative', 
          background: 'rgba(120, 120, 120, 0.92)', 
          backdropFilter: 'blur(10px)', 
          borderRadius: '28px', 
          width: '500px', 
          boxShadow: '0 10px 30px rgba(0,0,0,0.25)', 
          display: 'flex', 
          flexDirection: 'column', 
          overflow: 'hidden' 
        }}
      >
        {/* 未ログイン時ブロックオーバーレイ */}
        {!isLoggedIn && (
          <div 
            onClick={() => setShowLoginModal(true)}
            style={{ 
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
              backgroundColor: 'rgba(0, 0, 0, 0.45)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', 
              zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
              padding: '20px', cursor: 'pointer' 
            }}
          >
            <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.85)', color: 'white', padding: '14px 24px', borderRadius: '40px', fontSize: '22px', fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span>🔒 ログインして機能を開放</span>
            </div>
            <span style={{ color: 'white', fontSize: '18px', fontWeight: 'bold', marginTop: '12px', textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
              ログインすると分布や予測が見れます
            </span>
          </div>
        )}

        {/* パネルヘッダー */}
        <div 
          onClick={() => setShowFishPanel(!showFishPanel)} 
          style={{ 
            color: 'white', 
            padding: '28px 32px 20px 32px', 
            cursor: 'pointer', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            width: '100%', 
            boxSizing: 'border-box' 
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            {/* 紫色の丸型アイコン */}
            <div style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              backgroundColor: '#8b24ad', 
              flexShrink: 0 
            }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '38px', fontWeight: 'bold', lineHeight: 1.1 }}>魚種分布</span>
              <span style={{ fontSize: '24px', color: '#e2e8f0', marginTop: '4px' }}>魚種カテゴリ別表示</span>
            </div>
          </div>
          <span className="material-symbols-outlined" style={{ fontSize: '36px', color: 'white' }}>
            {showFishPanel ? 'expand_more' : 'expand_less'}
          </span>
        </div>

        {/* 魚種チェックボックスリスト */}
        {showFishPanel && (
          <div style={{ padding: '8px 32px 32px 116px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {['カタクチイワシ', 'ブリ', '伊勢エビ'].map((fish) => {
              const isSelected = activeFishLayers.includes(fish);
              return (
                <div
                  key={fish}
                  onClick={() => toggleFishLayer(fish)}
                  style={{ display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer', userSelect: 'none' }}
                >
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '6px',
                    backgroundColor: isSelected ? '#8b24ad' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'background-color 0.15s ease'
                  }}>
                    {isSelected && (
                      <span style={{ color: 'white', fontSize: '26px', fontWeight: 'bold', lineHeight: 1 }}>✓</span>
                    )}
                  </div>
                  <span style={{ color: 'white', fontSize: '32px', fontWeight: 'bold' }}>{fish}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}