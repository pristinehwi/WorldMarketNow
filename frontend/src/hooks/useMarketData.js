import { useState, useEffect } from 'react';
import axios from 'axios';

const DATA_URL = 'https://raw.githubusercontent.com/pristinehwi/WorldMarketNow/main/data/latest.json';

function useMarketData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      // 캐시 방지용 타임스탬프
      const url = `${DATA_URL}?t=${Date.now()}`;
      const res = await axios.get(url);
      setData(res.data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // 30분마다 자동 갱신
    const interval = setInterval(fetchData, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return { data, loading, error, refetch: fetchData };
}

export default useMarketData;