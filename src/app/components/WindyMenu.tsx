'use client';
import React, { useState, useEffect } from 'react';

// ==========================================
// 1. 型定義 (Props)
// ==========================================
interface WindyMenuProps {
  showWindyMenu: boolean;
  setShowWindyMenu: (show: boolean) => void;
  isLoggedIn: boolean;
  loggedInEmail: string | null;
  handleLogout: () => void;
  handleDeleteAccount: () => void;
  setIsSignUp: (isSignえｒぺえUp: boolean) => void;
  setShowLoginModal: (show: boolean) => void;
  marineTheme?: string;
  setMarineTheme?: (theme: string) => void;
  fishTheme?: string;
  setFishTheme?: (theme: string) => void;
  userName?: string;
  targetFish?: string;
  handleUpdateProfile?: (name: string, fish: string) => void;
}

// ==========================================
// 2. 詳細設定・メニューコンポーネント (Windy風)
// ==========================================
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
  userName = '名無しアングラー',
  targetFish = '',
  handleUpdateProfile
}: WindyMenuProps) {
  const [editName, setEditName] = useState(userName);
  const [editFish, setEditFish] = useState(targetFish);

  // メニューが開かれた時に最新のプロフィール情報をフォームにセットする
  useEffect(() => {
    if (showWindyMenu) {
      setEditName(userName);
      setEditFish(targetFish);
    }
  }, [showWindyMenu, userName, targetFish]);

  // プロフィール保存ボタンを押した時の処理
  const onSaveProfile = () => {
    if (handleUpdateProfile) {
      handleUpdateProfile(editName, editFish);
    }
  };

  return (
    <>
      {/* 背景オーバーレイ */}
      <div 
        onClick={() => setShowWindyMenu(false)}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 3000,
          opacity: showWindyMenu ? 1 : 0,
          visibility: showWindyMenu ? 'visible' : 'hidden',
          transition: 'opacity 0.3s ease, visibility 0.3s ease',
          pointerEvents: 'auto',
        }}
      />

      {/* ドロワーメニュー本体 */}
      <div 
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '500px',
          height: '100vh',
          backgroundColor: '#222222',
          color: '#e0e0e0',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.5)',
          zIndex: 3100,
          transform: showWindyMenu ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease-in-out',
          pointerEvents: 'auto',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
        }}
      >
        {/* メニューヘッダー */}
        <div style={{ padding: '32px', borderBottom: '1px solid #444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '40px', color: '#0044cc' }}>
              settings
            </span>
            <span style={{ fontSize: '36px', fontWeight: 'bold', color: 'white' }}>詳細設定・メニュー</span>
          </div>
          <button onClick={() => setShowWindyMenu(false)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '44px' }}>
              close
            </span>
          </button>
        </div>

        {/* メニューコンテンツエリア */}
        <div style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '40px', flexGrow: 1, overflowY: 'auto' }}>
          
          {/* 1. アカウント情報エリア */}
          {isLoggedIn ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px', borderBottom: '1px solid #444' }}>
              <div style={{ fontSize: '24px', color: '#888', fontWeight: 'bold', letterSpacing: '1px' }}>ACCOUNT</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '56px', color: '#0044cc' }}>
                  account_circle
                </span>
                <span style={{ fontSize: '26px', color: 'white', wordBreak: 'break-all' }}>{loggedInEmail}</span>
              </div>
              <button onClick={handleLogout} style={{ background: '#444', color: 'white', border: '1px solid #666', padding: '16px', borderRadius: '24px', fontSize: '22px', fontWeight: 'bold', cursor: 'pointer' }}>
                ログアウト
              </button>
              <button onClick={handleDeleteAccount} style={{ background: 'transparent', color: '#e57373', border: '1px solid #e57373', padding: '16px', borderRadius: '24px', fontSize: '22px', fontWeight: 'bold', cursor: 'pointer' }}>
                アカウントを削除
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '32px', borderBottom: '1px solid #444' }}>
              <div style={{ fontSize: '24px', color: '#888', fontWeight: 'bold', letterSpacing: '1px' }}>ACCOUNT</div>
              <button
                onClick={() => {
                  setShowWindyMenu(false);
                  setIsSignUp(false);
                  setShowLoginModal(true);
                }}
                style={{ background: '#0044cc', color: 'white', border: 'none', padding: '16px', borderRadius: '24px', fontSize: '22px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                ログイン / 新規登録
              </button>
            </div>
          )}


          {/* ▼ プロフィール編集エリア ▼ */}
        <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>プロフィール設定</h4>
          
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '4px' }}>表示名 (ニックネーム)</label>
            <input 
              type="text" 
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}
            />
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '4px' }}>よく狙うターゲット</label>
            <select 
              value={editFish}
              onChange={(e) => setEditFish(e.target.value)}
              style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}
            >
              <option value="">選択しない</option>
              <option value="カタクチイワシ">カタクチイワシ</option>
              <option value="伊勢エビ">伊勢エビ</option>
              <option value="ブリ">ブリ</option>
            </select>
          </div>

          <button 
            onClick={onSaveProfile}
            style={{ background: '#0044cc', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}
          >
            変更を保存
          </button>
        </div>


          {/* 2. 表示設定 (色彩テーマ設定) エリア */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ fontSize: '24px', color: '#888', fontWeight: 'bold', letterSpacing: '1px' }}>DISPLAY SETTINGS</div>
            
            {/* 海況ヒートマップ色彩設定 */}
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

            {/* 魚種ヒートマップ色彩設定 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', opacity: isLoggedIn ? 1 : 0.5 }}>
              <label style={{ fontSize: '22px', color: '#e0e0e0' }}>
                魚種ヒートマップ色彩 {!isLoggedIn && '(要ログイン)'}
              </label>
              <select
                value={fishTheme}
                onChange={(e) => setFishTheme && setFishTheme(e.target.value)}
                disabled={!isLoggedIn}
                style={{
                  fontSize: '22px',
                  padding: '16px',
                  borderRadius: '16px',
                  backgroundColor: '#333',
                  color: 'white',
                  border: '1px solid #555',
                  cursor: isLoggedIn ? 'pointer' : 'not-allowed',
                }}
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