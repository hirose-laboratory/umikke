'use client';

// ==========================================
// 1. 型定義 (Props)
// ==========================================
interface TopRightMenuProps {
  isLoggedIn: boolean;
  loggedInEmail: string | null;
  setShowWindyMenu: (show: boolean) => void;
  setIsSignUp: (isSignUp: boolean) => void;
  setShowLoginModal: (show: boolean) => void;
}

// ==========================================
// 2. 画面右上メニューコンポーネント
// ==========================================
export default function TopRightMenu({
  isLoggedIn,
  loggedInEmail,
  setShowWindyMenu,
  setIsSignUp,
  setShowLoginModal,
}: TopRightMenuProps) {
  return (
    <div
      className="top-right"
      style={{
        position: 'absolute',
        top: '30px',
        right: '30px',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        pointerEvents: 'auto',
        zIndex: 1000,
      }}
    >
      {/* ログイン状態に応じたアカウント／ログインボタン切り替え */}
      {isLoggedIn ? (
        <button
          className="btn-account"
          onClick={() => setShowWindyMenu(true)}
          style={{
            background: '#0044cc',
            color: 'white',
            border: 'none',
            padding: '16px 32px',
            borderRadius: '40px',
            fontSize: '26px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            maxWidth: '360px',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>
            account_circle
          </span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {loggedInEmail}
          </span>
        </button>
      ) : (
        <button
          className="btn-login"
          onClick={() => {
            setIsSignUp(false);
            setShowLoginModal(true);
          }}
          style={{
            background: '#888',
            color: 'white',
            border: 'none',
            padding: '16px 32px',
            borderRadius: '40px',
            fontSize: '28px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>
            account_circle
          </span>
          ログイン
        </button>
      )}

      {/* メニューオープンボタン */}
      <button
        className="btn-menu"
        onClick={() => setShowWindyMenu(true)}
        style={{
          background: 'white',
          border: '1px solid #ccc',
          borderRadius: '50%',
          width: '80px',
          height: '80px',
          color: '#333',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
        }}
      >
        <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>
          menu
        </span>
      </button>
    </div>
  );
}