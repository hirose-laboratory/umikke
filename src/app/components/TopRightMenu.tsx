'use client';

import { useState } from 'react';

interface TopRightMenuProps {
  isLoggedIn: boolean;
  loggedInEmail: string | null;
  setShowWindyMenu: (show: boolean) => void;
  setIsSignUp: (isSignUp: boolean) => void;
  setShowLoginModal: (show: boolean) => void;
  marineTheme?: string;
  setMarineTheme?: (theme: string) => void;
  fishTheme?: string;
  setFishTheme?: (theme: string) => void;
}

export default function TopRightMenu({
  isLoggedIn,
  loggedInEmail,
  setShowWindyMenu,
  setIsSignUp,
  setShowLoginModal,
  marineTheme = 'default',
  setMarineTheme,
  fishTheme = 'default',
  setFishTheme,
}: TopRightMenuProps) {
  // メニューの開閉状態を管理
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (setShowWindyMenu) {
      setShowWindyMenu(nextState);
    }
  };

  return (
    <div
      className="top-right"
      style={{
        position: 'absolute',
        top: '30px',
        right: '30px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '16px',
        pointerEvents: 'auto',
        zIndex: 1000,
      }}
    >
      {/* ボタンエリア */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        {isLoggedIn ? (
          <button
            className="btn-account"
            onClick={toggleMenu}
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
            <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>account_circle</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{loggedInEmail}</span>
          </button>
        ) : (
          <button
            className="btn-login"
            onClick={() => { setIsSignUp(false); setShowLoginModal(true); }}
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
            <span className="material-symbols-outlined" style={{ fontSize: '36px' }}>account_circle</span> ログイン
          </button>
        )}

        <button
          className="btn-menu"
          onClick={toggleMenu}
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
            {isOpen ? 'close' : 'menu'}
          </span>
        </button>
      </div>

      {/* 右上メニューボタンを押した時に開く「詳細設定パネル」 */}
      {isOpen && (
        <div
          style={{
            background: '#888',
            color: 'white',
            borderRadius: '24px',
            width: '440px',
            padding: '24px 32px',
            boxShadow: '0 8px 16px rgba(0,0,0,0.3)',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            marginTop: '8px',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '28px', fontWeight: 'bold' }}>⚙️ 詳細設定</h3>

          {/* 1. 海況ヒートマップ色設定 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '22px', color: '#e0e0e0' }}>海況ヒートマップ色彩</label>
            <select
              value={marineTheme}
              onChange={(e) => setMarineTheme && setMarineTheme(e.target.value)}
              style={{
                fontSize: '22px',
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#ffffff',
                color: '#333333',
                cursor: 'pointer',
              }}
            >
              <option value="default">デフォルト (赤紫)</option>
              <option value="rainbow">レインボー</option>
              <option value="ocean">オーシャン (青)</option>
            </select>
          </div>

          {/* 2. 魚種ヒートマップ色設定 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', opacity: isLoggedIn ? 1 : 0.5 }}>
            <label style={{ fontSize: '22px', color: '#e0e0e0' }}>
              魚種ヒートマップ色彩 {!isLoggedIn && '(要ログイン)'}
            </label>
            <select
              value={fishTheme}
              onChange={(e) => setFishTheme && setFishTheme(e.target.value)}
              disabled={!isLoggedIn}
              style={{
                fontSize: '22px',
                padding: '12px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: '#ffffff',
                color: '#333333',
                cursor: isLoggedIn ? 'pointer' : 'not-allowed',
              }}
            >
              <option value="default">デフォルト (紫〜黄)</option>
              <option value="rainbow">レインボー</option>
              <option value="colorblind">カラーブラインド</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}