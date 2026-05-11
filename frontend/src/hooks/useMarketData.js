import { useState, useEffect } from 'react';
import axios from 'axios';

const BASE = 'https://raw.githubusercontent.com/pristinehwi/WorldMarketNow/main/data';

const urls = {
  latest:       `${BASE}/latest.json`,
  prices:       `${BASE}/prices.json`,
  yieldCurve:   `${BASE}/yield_curve.json`,
  fedBalance:   `${BASE}/fed_balance.json`,
  curveSim:     `${BASE}/curve_similarity.json`,
  implications: `${BASE}/implications.json`,
  persistence:  `${BASE}/persistence.json`,
  edgeStats:    `${BASE}/edge_stats.json`,
};

const safe = (promise) => promise.catch(() => ({ data: null }));

function useMarketData() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const t = Date.now();
      const qs = `?t=${t}`;

      // Critical: latest + prices (병렬, 즉시 렌더)
      const [latestRes, pricesRes] = await Promise.all([
        axios.get(urls.latest + qs),
        safe(axios.get(urls.prices + qs)),
      ]);

      const raw = latestRes.data;

      setData(prev => ({
        ...raw,
        prices:           pricesRes.data?.prices   || {},
        indices:          pricesRes.data?.indices  || {},
        yield_curve:      null,
        fed_balance:      null,
        curve_similarity: null,
        implications:     null,
        persistence:      null,
        edgeStats:        null,
        dataAsOf:         raw.data_as_of || null,
      }));
      setError(null);

      // Secondary: 금리·연준·유사도 (병렬)
      const [yieldRes, fedRes, simRes] = await Promise.all([
        safe(axios.get(urls.yieldCurve + qs)),
        safe(axios.get(urls.fedBalance + qs)),
        safe(axios.get(urls.curveSim   + qs)),
      ]);

      setData(prev => ({
        ...prev,
        yield_curve: yieldRes.data?.yield_curve || null,
        fed_balance: fedRes.data?.fed_balance
          ? { ...fedRes.data.fed_balance, insight: fedRes.data.insight || null }
          : null,
        curve_similarity: simRes.data?.similarity     || null,
        curve_regime:     simRes.data?.curve_regime   || null,
      }));

      // Tertiary: 함의·지속성·엣지통계 (백그라운드)
      const [implRes, persRes, edgeRes] = await Promise.all([
        safe(axios.get(urls.implications + qs)),
        safe(axios.get(urls.persistence  + qs)),
        safe(axios.get(urls.edgeStats    + qs)),
      ]);

      setData(prev => ({
        ...prev,
        implications: implRes.data || null,
        persistence:  persRes.data || null,
        edgeStats:    edgeRes.data || null,
      }));

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
