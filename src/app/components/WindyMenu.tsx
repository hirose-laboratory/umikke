// src/components/WindyMenu.tsx
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
}

export default function WindyMenu({
  showWindyMenu,
  setShowWindyMenu,
  isLoggedIn,
  loggedInEmail,
  handleLogout,
  handleDeleteAccount,
  setIsSignUp,
  setShowLoginModal
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

          
        </div>
      </div>
    </>
  );
}