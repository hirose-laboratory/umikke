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

  // 海況：水温とクロロフィルa濃度の排他切り替え（ラジオボタン動作）
  const handleRadioMarineLayer = (selectedLayer: 'sst' | 'chl') => {
    if (activeMarineLayers.includes(selectedLayer)) {
      // 選択済みの場合は解除
      setActiveMarineLayers(activeMarineLayers.filter(l => l !== selectedLayer));
    } else {
      // もう片方を解除して自身を選択（流向・流速 'current' は維持）
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

  // 魚種分布レイヤーの表示切り替え
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
      {/* 1. 海況状況パネル (水温 / クロロフィルa濃度 / 流向・流速) */}
      {/* ========================================== */}
      <div className="layer-container" style={{ background: '#888', borderRadius: '24px', width: '560px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        
        {/* パネルヘッダー */}
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

        {/* リスト部分 */}
        {showMarinePanel && (
          <div className="checkbox-panel" style={{ padding: '0 32px 32px 120px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* 🔵 ① 水温（丸型ラジオボタン） */}
            <div 
              onClick={() => handleRadioMarineLayer('sst')}
              style={{ display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer', userSelect: 'none' }}
            >
              {/* 丸型ラジオインジケーター */}
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {isSstSelected && (
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#1a237e'
                  }} />
                )}
              </div>
              <span style={{ color: 'white', fontSize: '28px', fontWeight: 'normal' }}>水温</span>
            </div>

            {/* 🔵 ② クロロフィルa濃度（丸型ラジオボタン） */}
            <div 
              onClick={() => handleRadioMarineLayer('chl')}
              style={{ display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer', userSelect: 'none' }}
            >
              {/* 丸型ラジオインジケーター */}
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {isChlSelected && (
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: '#1a237e'
                  }} />
                )}
              </div>
              <span style={{ color: 'white', fontSize: '28px', fontWeight: 'normal', whiteSpace: 'nowrap' }}>クロロフィルa濃度</span>
            </div>

            {/* ⬛ ③ 流向・流速（四角いチェックボックス） */}
            <div 
              onClick={() => toggleMarineLayer('current')}
              style={{ display: 'flex', alignItems: 'center', gap: '20px', cursor: 'pointer', userSelect: 'none' }}
            >
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '6px',
                backgroundColor: isCurrentSelected ? '#1a237e' : '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {isCurrentSelected && (
                  <span style={{ color: 'white', fontSize: '26px', fontWeight: 'bold', lineHeight: 1 }}>✓</span>
                )}
              </div>
              <span style={{ color: 'white', fontSize: '28px', fontWeight: 'normal' }}>流向・流速</span>
            </div>

          </div>
        )}
      </div>

      {/* ========================================== */}
      {/* 2. 魚種分布パネル (カタクチイワシ / ブリ / 伊勢エビ) */}
      {/* ========================================== */}
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

        {/* パネルヘッダー */}
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

        {/* 魚種リスト（四角いチェックボックス） */}
        {showFishPanel && (
          <div className="checkbox-panel" style={{ padding: '0 32px 32px 120px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                    backgroundColor: isSelected ? '#8e24aa' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {isSelected && (
                      <span style={{ color: 'white', fontSize: '26px', fontWeight: 'bold', lineHeight: 1 }}>✓</span>
                    )}
                  </div>
                  <span style={{ color: 'white', fontSize: '28px', fontWeight: 'normal' }}>{fish}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}