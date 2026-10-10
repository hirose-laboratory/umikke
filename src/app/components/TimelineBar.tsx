'use client';

// ==========================================
// 1. 型定義 (Props & State Data)
// ==========================================
interface TimelineDay {
  label: string;
  date: Date;
}

interface TimelineBarProps {
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  timelineDays: TimelineDay[];
  currentProgress: number;
  setCurrentProgress: (value: number) => void;
  showMiniCalendar: boolean;
  setShowMiniCalendar: (show: boolean) => void;
  calYear: number;
  setCalYear: (year: number) => void;
  calMonth: number;
  setCalMonth: (month: number) => void;
  calendarCells: (number | null)[];
  getCalendarDayStatus: (dateNum: number | null) => { isToday: boolean; isSelected: boolean };
  setBaseDate: (date: Date) => void;
  formattedSelectedDate: string;
}

// ==========================================
// 2. タイムラインバーコンポーネント
// ==========================================
export default function TimelineBar({
  isPlaying,
  setIsPlaying,
  timelineDays,
  currentProgress,
  setCurrentProgress,
  showMiniCalendar,
  setShowMiniCalendar,
  calYear,
  setCalYear,
  calMonth,
  setCalMonth,
  calendarCells,
  getCalendarDayStatus,
  setBaseDate,
  formattedSelectedDate,
}: TimelineBarProps) {
  const currentDayIndex = currentProgress;

  return (
    <div
      className="bottom-bar"
      style={{
        position: 'absolute',
        // コンテナの配置と余白も画面幅に応じて可変に
        bottom: 'clamp(16px, 3vw, 40px)',
        left: 'clamp(12px, 2vw, 30px)',
        width: 'calc(100% - 150px)',
        maxWidth: '1200px',
        background: '#888',
        borderRadius: '24px',
        minHeight: 'clamp(100px, 12vw, 180px)', // 高さも可変
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: 'clamp(12px, 1.5vw, 24px) clamp(16px, 2vw, 32px)', // 内側の余白を可変
        color: 'white',
        gap: 'clamp(8px, 1vw, 16px)',
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
        boxSizing: 'border-box',
        pointerEvents: 'auto',
      }}
    >
      {/* 上段：再生ボタン / タイムラインタブ / ミニカレンダーボタン */}
      <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 'clamp(8px, 1.5vw, 24px)' }}>
        {/* 再生 / 一時停止ボタン */}
        <button
          className="play-btn"
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            // 再生ボタンのサイズをPCの80px基準で画面幅に連動
            width: 'clamp(32px, 6vw, 80px)',
            height: 'clamp(32px, 6vw, 80px)',
            borderRadius: '50%',
            background: 'white',
            border: 'none',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            color: 'black',
            flexShrink: 0,
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 'clamp(20px, 4vw, 56px)' }}>
            {isPlaying ? 'pause' : 'play_arrow'}
          </span>
        </button>

        {/* タイムライン日付タブ一覧 */}
        <div
          className="timeline"
          style={{
            display: 'flex',
            flexGrow: 1,
            justifyContent: 'space-between',
            // ここの文字サイズがiPadの幅でも収まるように、より強く縮む比率(1.6vw)に設定
            fontSize: 'clamp(10px, 1.6vw, 30px)', 
            alignItems: 'center',
            overflow: 'hidden',
            whiteSpace: 'nowrap',
          }}
        >
          {timelineDays.map((day, idx) => (
            <span
              key={idx}
              onClick={() => {
                setCurrentProgress(idx);
                setIsPlaying(false);
              }}
              style={{
                color: currentDayIndex === idx ? '#ffdd55' : 'white',
                borderBottom: currentDayIndex === idx ? 'clamp(2px, 0.4vw, 4px) solid #ffdd55' : 'none',
                paddingBottom: 'clamp(2px, 0.4vw, 4px)',
                cursor: 'pointer',
                fontWeight: currentDayIndex === idx ? 'bold' : 'normal',
              }}
            >
              {day.label}
            </span>
          ))}
        </div>

        {/* ミニカレンダーポップアップ ＆ トグルアイコン */}
        <div style={{ position: 'relative', flexShrink: 0, width: 'clamp(28px, 5vw, 64px)', height: 'clamp(28px, 5vw, 64px)' }}>
          <span
            className="material-symbols-outlined"
            onClick={() => setShowMiniCalendar(!showMiniCalendar)}
            style={{ fontSize: 'clamp(24px, 4vw, 56px)', color: 'white', cursor: 'pointer' }}
          >
            calendar_today
          </span>

          {/* ミニカレンダーピッカー */}
          {showMiniCalendar && (
            <div
              style={{
                position: 'absolute',
                bottom: 'clamp(40px, 8vw, 80px)',
                right: '0px',
                background: 'white',
                color: '#333',
                borderRadius: '16px',
                padding: '16px',
                // カレンダーの幅もiPadでは少し縮むように調整
                width: 'clamp(260px, 30vw, 320px)',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                zIndex: 100,
              }}
            >
              {/* 年月ヘッダー / 前月・次月移動 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '18px', fontWeight: 'bold' }}>
                <span
                  className="material-symbols-outlined"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    if (calMonth === 0) {
                      setCalMonth(11);
                      setCalYear(calYear - 1);
                    } else {
                      setCalMonth(calMonth - 1);
                    }
                  }}
                >
                  chevron_left
                </span>
                <span>{calYear}年 {calMonth + 1}月</span>
                <span
                  className="material-symbols-outlined"
                  style={{ cursor: 'pointer' }}
                  onClick={() => {
                    if (calMonth === 11) {
                      setCalMonth(0);
                      setCalYear(calYear + 1);
                    } else {
                      setCalMonth(calMonth + 1);
                    }
                  }}
                >
                  chevron_right
                </span>
              </div>

              {/* 曜日ヘッダー */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '14px', fontWeight: 'bold', color: '#666' }}>
                {['日', '月', '火', '水', '木', '金', '土'].map((w) => (
                  <span key={w}>{w}</span>
                ))}
              </div>

              {/* 日付グリッド */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', fontSize: '14px' }}>
                {calendarCells.map((dateNum, index) => {
                  const { isToday, isSelected } = getCalendarDayStatus(dateNum);

                  let cellBg = 'transparent';
                  let cellTextColor = '#333';
                  if (isSelected) {
                    cellBg = '#ffdd55';
                    cellTextColor = 'white';
                  } else if (isToday) {
                    cellBg = '#e8f0fe';
                  }

                  return (
                    <div key={index} style={{ width: '100%', aspectRatio: '1', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      {dateNum && (
                        <button
                          onClick={() => {
                            setBaseDate(new Date(calYear, calMonth, dateNum));
                            setCurrentProgress(0);
                            setShowMiniCalendar(false);
                            setIsPlaying(false);
                          }}
                          style={{
                            width: '100%',
                            height: '100%',
                            border: 'none',
                            background: cellBg,
                            color: cellTextColor,
                            borderRadius: '50%',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                          }}
                        >
                          {dateNum}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 下段：シークバー ＆ 選択日のラベル表示 */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 'clamp(4px, 1vw, 8px)' }}>
        <input
          type="range"
          min="0"
          max="6"
          value={currentProgress}
          onChange={(e) => {
            setCurrentProgress(Number(e.target.value));
            setIsPlaying(false);
          }}
          style={{
            width: '100%',
            cursor: 'pointer',
            accentColor: 'white',
            background: 'rgba(255, 255, 255, 0.3)',
            height: 'clamp(6px, 1vw, 10px)', // スライダーの太さも可変
            borderRadius: '5px',
            outline: 'none',
          }}
        />

        <div style={{ fontSize: 'clamp(12px, 1.8vw, 24px)', textAlign: 'left', color: '#e0e0e0', fontWeight: 'bold', paddingLeft: '4px' }}>
          選択日: <span style={{ color: '#ffdd55' }}>{formattedSelectedDate}</span>
        </div>
      </div>
    </div>
  );
}