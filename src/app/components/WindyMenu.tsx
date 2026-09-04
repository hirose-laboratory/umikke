'use client';

interface WindyMenuProps {
  showWindyMenu: boolean;
  setShowWindyMenu: (show: boolean) => void;
  isLoggedIn: boolean;
  loggedInEmail: string | null;
  handleLogout: () => void;
  handleDeleteAccount: () => void;
  setIsSignUp: (isSignUp: boolean) => void;
  setShowLoginModal: (show: boolean) => void;
  // ★ 追加：それぞれのテーマ設定を受け取る
  marineTheme?: string;
  setMarineTheme?: (theme: string) => void;
  fishTheme?: string;
  setFishTheme?: (theme: string) => void;
}

export default function WindyMenu({
  showWindyMenu,
  setShowWindyMenu,
  isLoggedIn,
  loggedInEmail,
  handleLogout,
  handleDeleteAccount,
  setIsSignUp,
  setShowLoginModal,
  marineTheme = 'default',
  setMarineTheme,
  fishTheme = 'default',
  setFishTheme,
}: WindyMenuProps) {
  return (
    <>
      <div 
        onClick={() => setShowWindyMenu(false)}
        style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.3)', zIndex: 3000, opacity: showWindyMenu ? 1 : 0, visibility: showWindyMenu ? 'visible' : 'hidden', transition: 'opacity 0.3s ease, visibility 0.3s ease', pointerEvents: 'auto' }}
      />
      <div 
        style={{ position: 'fixed', top: 0, right: 0, width: '500px', height: '100vh', backgroundColor: '#222222', color: '#e0e0e0', boxShadow: '-4px 0 24px rgba(0,0,0,0.5)', zIndex: 3100, transform: showWindyMenu ? 'translateX(0)' : 'translateX(100%)', transition: 'transform 0.3s ease-in-out', pointerEvents: 'auto', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}
      >
        <div style={{ padding: '32px', borderBottom: '1px solid #444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#0044cc' }}>settings</span>
            <span style={{ fontSize: '36px', fontWeight: 'bold', color: 'white' }}>詳細設定・メニュー</span>
          </div>
          <button onClick={() => setShowWindyMenu(false)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '44px' }}>close</span>
          </button>
        </div>

        <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '40px', flexGrow: 1, overflowY: 'auto' }}>
          {/* Windy風：アカウント情報エリア */}
          {isLoggedIn ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px', borderBottom: '1px solid #444' }}>
              <div style={{ fontSize: '24px', color: '#888', fontWeight: 'bold', letterSpacing: '1px' }}>ACCOUNT</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '56px', color: '#0044cc' }}>account_circle</span>
                <span style={{ fontSize: '26px', color: 'white', wordBreak: 'break-all' }}>{loggedInEmail}</span>
              </div>
              <button onClick={handleLogout} style={{ background: '#444', color: 'white', border: '1px solid #666', padding: '16px', borderRadius: '24px', fontSize: '22px', fontWeight: 'bold', cursor: 'pointer' }}>ログアウト</button>
              <button onClick={handleDeleteAccount} style={{ background: 'transparent', color: '#e57373', border: '1px solid #e57373', padding: '16px', borderRadius: '24px', fontSize: '22px', fontWeight: 'bold', cursor: 'pointer' }}>アカウントを削除</button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px', borderBottom: '1px solid #444' }}>
              <div style={{ fontSize: '24px', color: '#888', fontWeight: 'bold', letterSpacing: '1px' }}>ACCOUNT</div>
              <button onClick={() => { setShowWindyMenu(false); setIsSignUp(false); setShowLoginModal(true); }} style={{ background: '#0044cc', color: 'white', border: 'none', padding: '16px', borderRadius: '24px', fontSize: '22px', fontWeight: 'bold', cursor: 'pointer' }}>ログイン / 新規登録</button>
            </div>
          )}

          {/* ★ ここに追加：表示設定（色彩設定）エリア */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ fontSize: '24px', color: '#888', fontWeight: 'bold', letterSpacing: '1px' }}>DISPLAY SETTINGS</div>
            
            {/* 海況ヒートマップ色彩 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ fontSize: '22px', color: '#e0e0e0' }}>海況ヒートマップ色彩</label>
              <select
                value={marineTheme}
                onChange={(e) => setMarineTheme && setMarineTheme(e.target.value)}
                style={{ fontSize: '22px', padding: '16px', borderRadius: '16px', backgroundColor: '#333', color: 'white', border: '1px solid #555', cursor: 'pointer' }}
              >
                <option value="default">デフォルト (赤紫)</option>
                <option value="rainbow">レインボー</option>
                <option value="ocean">オーシャン (青)</option>
              </select>
            </div>

            {/* 魚種ヒートマップ色彩 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', opacity: isLoggedIn ? 1 : 0.5 }}>
              <label style={{ fontSize: '22px', color: '#e0e0e0' }}>
                魚種ヒートマップ色彩 {!isLoggedIn && '(要ログイン)'}
              </label>
              <select
                value={fishTheme}
                onChange={(e) => setFishTheme && setFishTheme(e.target.value)}
                disabled={!isLoggedIn}
                style={{ fontSize: '22px', padding: '16px', borderRadius: '16px', backgroundColor: '#333', color: 'white', border: '1px solid #555', cursor: isLoggedIn ? 'pointer' : 'not-allowed' }}
              >
                <option value="default">デフォルト (紫〜黄)</option>
                <option value="rainbow">レインボー</option>
                <option value="colorblind">カラーブラインド</option>
              </select>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}