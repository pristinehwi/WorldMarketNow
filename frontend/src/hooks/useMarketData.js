import { useState, useEffect } from 'react';
import axios from 'axios';

const DATA_URL   = 'https://raw.githubusercontent.com/pristinehwi/WorldMarketNow/main/data/latest.json';
const PRICES_URL = 'https://raw.githubusercontent.com/pristinehwi/WorldMarketNow/main/data/prices.json';

function useMarketData() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const t = Date.now();
      const [res, pricesRes] = await Promise.all([
        axios.get(`${DATA_URL}?t=${t}`),
        axios.get(`${PRICES_URL}?t=${t}`).catch(() => ({ data: {} }))
      ]);

      const raw = res.data;

      // data_as_of: GAS가 계산한 값 그대로 사용
      // 없으면 generated_at으로 폴백
      const dataAsOf = raw.data_as_of || null;

      setData({
        ...raw,
        prices:    pricesRes.data.prices  || {},
        indices:   pricesRes.data.indices || {},
        dataAsOf,  // { timestamp_iso, display, timezone }
      });
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error, refetch: fetchData };
}

export default useMarketData;
