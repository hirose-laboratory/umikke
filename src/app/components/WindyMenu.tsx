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
  setIsSignUp: (isSignUp: boolean) => void;
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
  const [editFish, setEditFish] = useState<string>(targetFish);
  
  // ▼ プロフィール編集画面（モーダル）の表示/非表示を管理するState
  const [showProfileModal, setShowProfileModal] = useState(false);

  // メニューやモーダルが開かれた時に最新のプロフィール情報をセット
  useEffect(() => {
    if (showWindyMenu || showProfileModal) {
      setEditName(userName);
      setEditFish(targetFish);
    }
  }, [showWindyMenu, showProfileModal, userName, targetFish]);

  // プロフィール保存ボタンを押した時の処理
  const onSaveProfile = () => {
    if (handleUpdateProfile) {
      handleUpdateProfile(editName, editFish);
    }
    // 保存したらモーダルを閉じる
    setShowProfileModal(false);
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
            <div style={{ display: 'flex', flexDirection: 'column', paddingBottom: '32px', borderBottom: '1px solid #444' }}>
              <div style={{ fontSize: '24px', color: '#888', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '20px' }}>ACCOUNT</div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '56px', color: '#0044cc' }}>
                  account_circle
                </span>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '26px', color: 'white', fontWeight: 'bold' }}>{userName}</span>
                  <span style={{ fontSize: '20px', color: '#aaa', wordBreak: 'break-all' }}>{loggedInEmail}</span>
                </div>
              </div>

              {/* ▼ プロフィール編集を開くボタン */}
              <button 
                onClick={() => setShowProfileModal(true)}
                style={{ background: '#0044cc', color: 'white', border: 'none', padding: '16px', borderRadius: '24px', fontSize: '22px', fontWeight: 'bold', cursor: 'pointer', marginTop: '40px', marginBottom: '20px' }}
              >
                プロフィールを編集
              </button>

              <button onClick={handleLogout} style={{ background: '#444', color: 'white', border: '1px solid #666', padding: '16px', borderRadius: '24px', fontSize: '22px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '20px' }}>
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

      {/* ==========================================
          3. プロフィール編集用ポップアップモーダル
      ========================================== */}
      {showProfileModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0, 0, 0, 0.75)', zIndex: 4000,
          display: 'flex', justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{ background: '#2a2a2a', padding: '32px', borderRadius: '16px', width: '90%', maxWidth: '450px', border: '1px solid #555', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ margin: 0, color: 'white', fontSize: '24px' }}>プロフィール編集</h3>
              <button onClick={() => setShowProfileModal(false)} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', display: 'flex' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '32px' }}>close</span>
              </button>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '18px', color: '#ccc', marginBottom: '8px' }}>表示名 (ニックネーム)</label>
              <input 
                type="text" 
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                style={{ width: '100%', padding: '16px', borderRadius: '8px', border: '1px solid #555', backgroundColor: '#1a1a1a', color: 'white', fontSize: '20px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label style={{ display: 'block', fontSize: '18px', color: '#ccc', marginBottom: '8px' }}>よく狙うターゲット（1つのみ選択）</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '16px', borderRadius: '8px', border: '1px solid #555', backgroundColor: '#1a1a1a' }}>
                
                {/* ★ 選択解除用のラジオボタン */}
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'white', fontSize: '20px', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="targetFishSelection"
                    value=""
                    checked={editFish === ''} 
                    onChange={() => setEditFish('')} 
                    style={{ width: '24px', height: '24px', cursor: 'pointer' }}
                  />
                  選択しない
                </label>

                {/* ★ 3つの魚種ラジオボタン */}
                {['カタクチイワシ', '伊勢エビ', 'ブリ'].map((fishName) => (
                  <label key={fishName} style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'white', fontSize: '20px', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="targetFishSelection"
                      value={fishName}
                      checked={editFish === fishName} 
                      onChange={() => setEditFish(fishName)} 
                      style={{ width: '24px', height: '24px', cursor: 'pointer' }}
                    />
                    {fishName}
                  </label>
                ))}
              </div>
            </div>

            <button 
              onClick={onSaveProfile}
              style={{ background: '#0044cc', color: 'white', border: 'none', padding: '16px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '20px', width: '100%' }}
            >
              変更を保存
            </button>

          </div>
        </div>
      )}
    </>
  );
}