// src/components/LoginModal.tsx
'use client';

// ① 親（page.tsx）から受け取る変数や関数の「型」を定義します
interface LoginModalProps {
  setShowLoginModal: (show: boolean) => void;
  isSignUp: boolean;
  setIsSignUp: (isSignUp: boolean) => void;
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  handleRegisterSubmit: () => void;
  handleEmailLogin: () => void;
}

// ② 枠組みを作り、カッコの中で親からデータを受け取ります
export default function LoginModal({
  setShowLoginModal,
  isSignUp,
  setIsSignUp,
  email,
  setEmail,
  password,
  setPassword,
  handleRegisterSubmit,
  handleEmailLogin
}: LoginModalProps) {
  
  return (
    // ③ page.tsxにあったログイン画面の <div>〜</div> を入れます
    // ※一番外側にあった `{showLoginModal && (` はpage.tsx側に残すのでここでは外しています。
    <div 
      onClick={() => setShowLoginModal(false)}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000, pointerEvents: 'auto'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()} 
        style={{
          background: '#ffffff', borderRadius: '32px', padding: '72px', width: '820px', minHeight: '760px', maxWidth: '92vw', boxShadow: '0 16px 48px rgba(0,0,0,0.35)', display: 'flex', flexDirection: 'column', gap: '32px', color: '#333', position: 'relative', boxSizing: 'border-box'
        }}
      >
        {/* 閉じるボタン */}
        <button onClick={() => setShowLoginModal(false)} style={{ position: 'absolute', top: '-24px', right: '-24px', background: '#0044cc', color: 'white', border: 'none', borderRadius: '50%', width: '64px', height: '64px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '40px' }}>close</span>
        </button>
        
        {/* タイトルの切り替え */}
        <h2 style={{ fontSize: '50px', fontWeight: 'bold', margin: '0 0 8px 0', color: isSignUp ? '#28a745' : '#111' }}>
          {isSignUp ? '【新規会員登録】' : '【ログイン】'}
        </h2>
        
        {/* メールアドレス入力 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <label style={{ fontSize: '26px', color: '#555', fontWeight: '500' }}>メールアドレス</label>
          <input 
            type="email" 
            placeholder="example@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: '100%', padding: '24px', borderRadius: '18px', border: '2px solid #ddd', background: '#f8f9fa', fontSize: '26px', boxSizing: 'border-box', outline: 'none', transition: 'border 0.2s' }} 
          />
        </div>
        
        {/* パスワード入力 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <label style={{ fontSize: '26px', color: '#555', fontWeight: '500' }}>パスワード</label>
          <input 
            type="password" 
            placeholder="6文字以上のパスワード"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ width: '100%', padding: '24px', borderRadius: '18px', border: '2px solid #ddd', background: '#f8f9fa', fontSize: '26px', boxSizing: 'border-box', outline: 'none', transition: 'border 0.2s' }} 
          />
        </div>
        
        {/* メインアクションボタン（ログイン or 登録） */}
        {isSignUp ? (
          <button onClick={handleRegisterSubmit} style={{ width: '100%', background: '#28a745', color: 'white', border: 'none', padding: '28px', borderRadius: '52px', fontSize: '32px', fontWeight: 'bold', cursor: 'pointer', marginTop: '12px', boxShadow: '0 4px 12px rgba(40,167,69,0.3)' }}>
            新しくアカウントを作成する
          </button>
        ) : (
          <button onClick={handleEmailLogin} style={{ width: '100%', background: '#0044cc', color: 'white', border: 'none', padding: '28px', borderRadius: '52px', fontSize: '32px', fontWeight: 'bold', cursor: 'pointer', marginTop: '12px', boxShadow: '0 4px 12px rgba(0,68,204,0.3)' }}>
            ログインする
          </button>
        )}
        
        {/* 画面モード切り替え用のUIエリア */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontSize: '26px', marginTop: '8px', borderTop: '1px solid #eee', paddingTop: '24px' }}>
          {isSignUp ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
              <span style={{ color: '#666' }}>すでにアカウントをお持ちの方はこちら</span>
              <button 
                onClick={() => setIsSignUp(false)} 
                style={{ background: '#f0f0f0', color: '#333', border: '1px solid #ccc', padding: '12px 32px', borderRadius: '24px', fontSize: '22px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                ログイン画面へ戻る
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', width: '100%' }}>
              <span style={{ color: '#666' }}>アカウントをお持ちではありませんか？</span>
              <button 
                onClick={() => setIsSignUp(true)} 
                style={{ width: '100%', background: '#28a745', color: 'white', border: 'none', padding: '16px', borderRadius: '32px', fontSize: '24px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(40,167,69,0.2)' }}
              >
                今すぐ新規会員登録する
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}