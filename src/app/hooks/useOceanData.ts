import { useState, useEffect, useRef } from 'react';
import { OceanDataPoint, EDnaDataPoint, Hotpoint } from '../types/google-maps';

export function useOceanData(API_BASE_URL: string) {
  const oceanPointsRef = useRef<OceanDataPoint[]>([]);
  const eDnaPointsRef = useRef<EDnaDataPoint[]>([]);
  const [oceanLoading, setOceanLoading] = useState(true);
  const [oceanError, setOceanError] = useState<string | null>(null);
  const [oceanPointCount, setOceanPointCount] = useState(0);
  const [hotpoints, setHotpoints] = useState<Hotpoint[]>([]);
  const [oceanRetryKey, setOceanRetryKey] = useState(0);
  const [dataVersion, setDataVersion] = useState(0);

  // 海洋データの取得
  useEffect(() => {
    let cancelled = false;
    async function fetchOceanData() {
      try {
        const start = '2026-05-01T00:00:00'; const end = '2026-05-31T23:59:59';
        const res = await fetch(`${API_BASE_URL}/ocean/range/?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
        if (!res.ok) throw new Error(`データ取得失敗 (status: ${res.status})`);
        const data: OceanDataPoint[] = await res.json();
        if (cancelled) return;
        oceanPointsRef.current = data;
        setOceanPointCount(data.length);
        
        // ダミーのeDNAデータ生成（APIが整備されるまでの繋ぎとして）
        eDnaPointsRef.current = data.filter((_, i) => i % 5 === 0).map(p => ({
          ...p, detected_species: 'マダイ', score: Math.random() * 10
        }));

        setDataVersion(v => v + 1);
      } catch (err) {
        if (!cancelled) setOceanError(err instanceof Error ? err.message : 'エラーが発生しました');
      } finally {
        if (!cancelled) setOceanLoading(false);
      }
    }
    setOceanLoading(true); setOceanError(null);
    fetchOceanData();
    return () => { cancelled = true; };
  }, [oceanRetryKey, API_BASE_URL]);

  // ホットポイントの取得
  useEffect(() => {
    async function fetchHotpoints() {
      try {
        const res = await fetch(`${API_BASE_URL}/fish/hotpoints/high-score?min_score=0.5&limit=20`);
        if (res.ok) setHotpoints(await res.json());
      } catch (err) { console.error('サジェスト取得エラー', err); }
    }
    fetchHotpoints();
  }, [API_BASE_URL]);

  return {
    oceanPointsRef, eDnaPointsRef, oceanLoading, oceanError, oceanPointCount, hotpoints, setOceanRetryKey, dataVersion
  };
}