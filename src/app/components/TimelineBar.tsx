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
        bottom: '40px',
        left: '30px',
        width: 'calc(100% - 150px)',
        maxWidth: '1200px',
        background: '#888',
        borderRadius: '24px',
        minHeight: '180px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '24px 32px',
        color: 'white',
        gap: '16px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
        boxSizing: 'border-box',
        pointerEvents: 'auto',
      }}
    >
      {/* 上段：再生ボタン / タイムラインタブ / ミニカレンダーボタン */}
      <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: '24px' }}>
        {/* 再生 / 一時停止ボタン */}
        <button
          className="play-btn"
          onClick={() => setIsPlaying(!isPlaying)}
          style={{
            width: '80px',
            height: '80px',
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
          <span className="material-symbols-outlined" style={{ fontSize: '56px' }}>
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
            fontSize: '30px',
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
                borderBottom: currentDayIndex === idx ? '4px solid #ffdd55' : 'none',
                paddingBottom: '4px',
                cursor: 'pointer',
                fontWeight: currentDayIndex === idx ? 'bold' : 'normal',
              }}
            >
              {day.label}
            </span>
          ))}
        </div>

        {/* ミニカレンダーポップアップ ＆ トグルアイコン */}
        <div style={{ position: 'relative', flexShrink: 0, width: '64px', height: '64px' }}>
          <span
            className="material-symbols-outlined"
            onClick={() => setShowMiniCalendar(!showMiniCalendar)}
            style={{ fontSize: '56px', color: 'white', cursor: 'pointer' }}
          >
            calendar_today
          </span>

          {/* ミニカレンダーピッカー */}
          {showMiniCalendar && (
            <div
              style={{
                position: 'absolute',
                bottom: '80px',
                right: '0px',
                background: 'white',
                color: '#333',
                borderRadius: '16px',
                padding: '16px',
                width: '320px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                zIndex: 100,
              }}
            >
              {/* 年月ヘッダー / 前月・次月移動 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '20px', fontWeight: 'bold' }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', fontSize: '16px' }}>
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
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
            height: '10px',
            borderRadius: '5px',
            outline: 'none',
          }}
        />

        <div style={{ fontSize: '24px', textAlign: 'left', color: '#e0e0e0', fontWeight: 'bold', paddingLeft: '4px' }}>
          選択日: <span style={{ color: '#ffdd55' }}>{formattedSelectedDate}</span>
        </div>
      </div>
    </div>
  );
}