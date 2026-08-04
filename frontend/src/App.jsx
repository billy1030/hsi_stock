import React, { useState, useEffect, useRef } from 'react';
import './App.css';

function App() {
  const [code, setCode] = useState(() => {
    return localStorage.getItem('activeStockCode') || '02513';
  });
  const [inputValue, setInputValue] = useState(code);
  const [intervalSec, setIntervalSec] = useState(10);
  const [isPlaying, setIsPlaying] = useState(true);
  const [stockData, setStockData] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [flashClass, setFlashClass] = useState('');
  const [showLogs, setShowLogs] = useState(false);
  const [theme, setTheme] = useState('light');
  const [isMiniMode, setIsMiniMode] = useState(() => {
    const saved = localStorage.getItem('isMiniMode');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [showMiniNames, setShowMiniNames] = useState(() => {
    const saved = localStorage.getItem('showMiniNames');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [showMiniGraph, setShowMiniGraph] = useState(() => {
    const saved = localStorage.getItem('showMiniGraph');
    return saved !== null ? JSON.parse(saved) : false;
  });
  const [hsiData, setHsiData] = useState(null);

  useEffect(() => {
    localStorage.setItem('isMiniMode', JSON.stringify(isMiniMode));
  }, [isMiniMode]);

  useEffect(() => {
    setInputValue(code);
    localStorage.setItem('activeStockCode', code);
  }, [code]);

  const toggleMiniNames = () => {
    setShowMiniNames(prev => {
      const newVal = !prev;
      localStorage.setItem('showMiniNames', JSON.stringify(newVal));
      return newVal;
    });
  };

  const toggleMiniGraph = () => {
    setShowMiniGraph(prev => {
      const newVal = !prev;
      localStorage.setItem('showMiniGraph', JSON.stringify(newVal));
      return newVal;
    });
  };

  const handlePrevStock = () => {
    if (recentStocks.length <= 1) return;
    const currentIndex = recentStocks.indexOf(code);
    if (currentIndex === -1) {
      // If current code not in recentStocks, just pick the first one
      setCode(recentStocks[0]);
      setHistory([]);
      prevPriceRef.current = null;
      return;
    }
    const prevIndex = (currentIndex - 1 + recentStocks.length) % recentStocks.length;
    setCode(recentStocks[prevIndex]);
    setHistory([]);
    prevPriceRef.current = null;
  };

  const handleNextStock = () => {
    if (recentStocks.length <= 1) return;
    const currentIndex = recentStocks.indexOf(code);
    if (currentIndex === -1) {
      setCode(recentStocks[0]);
      setHistory([]);
      prevPriceRef.current = null;
      return;
    }
    const nextIndex = (currentIndex + 1) % recentStocks.length;
    setCode(recentStocks[nextIndex]);
    setHistory([]);
    prevPriceRef.current = null;
  };

  // Capture last 20 used stock codes (persisted in localStorage)
  const [recentStocks, setRecentStocks] = useState(() => {
    const saved = localStorage.getItem('recentStocks');
    return saved ? JSON.parse(saved) : ['00700', '09988', '09992', '00100', '02513'];
  });

  // Track price, day high, and day low for each recent stock
  const [recentPrices, setRecentPrices] = useState(() => {
    const saved = localStorage.getItem('recentPrices');
    return saved ? JSON.parse(saved) : {};
  });

  // Sorting state for mini mode
  const [sortKey, setSortKey] = useState('default'); // 'default' | 'code' | 'name' | 'price' | 'change'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'

  const handleSort = (key) => {
    if (sortKey === key) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortKey('default');
        setSortOrder('asc');
      }
    } else {
      setSortKey(key);
      setSortOrder(key === 'code' || key === 'name' ? 'asc' : 'desc');
    }
  };

  const getSortedStocks = () => {
    if (sortKey === 'default') return recentStocks;
    const stocks = [...recentStocks];
    stocks.sort((a, b) => {
      let valA, valB;
      if (sortKey === 'code') {
        valA = parseInt(a, 10);
        valB = parseInt(b, 10);
      } else if (sortKey === 'name') {
        valA = recentPrices[a]?.name || '';
        valB = recentPrices[b]?.name || '';
        return sortOrder === 'asc' ? valA.localeCompare(valB, 'zh-HK') : valB.localeCompare(valA, 'zh-HK');
      } else if (sortKey === 'price') {
        const priceA = recentPrices[a]?.price;
        const priceB = recentPrices[b]?.price;
        valA = priceA && priceA !== '...' ? parseFloat(priceA.replace(/,/g, '')) : -Infinity;
        valB = priceB && priceB !== '...' ? parseFloat(priceB.replace(/,/g, '')) : -Infinity;
      } else if (sortKey === 'change') {
        const changeA = recentPrices[a]?.change || '';
        const changeB = recentPrices[b]?.change || '';
        const matchA = changeA.match(/([+-]?\d+(?:\.\d+)?)/);
        const matchB = changeB.match(/([+-]?\d+(?:\.\d+)?)/);
        valA = matchA ? parseFloat(matchA[1]) * (changeA.includes('-') ? -1 : 1) : -Infinity;
        valB = matchB ? parseFloat(matchB[1]) * (changeB.includes('-') ? -1 : 1) : -Infinity;
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return stocks;
  };

  const timerRef = useRef(null);
  const batchTimerRef = useRef(null);
  const prevPriceRef = useRef(null);
  const isFetchingBatchRef = useRef(false);

  const fetchHsi = async () => {
    try {
      const response = await fetch('http://localhost:3300/api/hsi');
      if (response.ok) {
        const data = await response.json();
        setHsiData(data);
      }
    } catch (err) {
      console.error('Failed to fetch HSI:', err);
    }
  };

  useEffect(() => {
    fetchHsi();
    const hsiInterval = setInterval(fetchHsi, 30000);
    return () => clearInterval(hsiInterval);
  }, []);

  useEffect(() => {
    document.body.className = `${theme}-theme ${isMiniMode ? 'mini-body' : ''}`;
  }, [theme, isMiniMode]);

  const updateRecentStocks = (validCode) => {
    setRecentStocks((prev) => {
      const filtered = prev.filter(c => c !== validCode);
      const updated = [validCode, ...filtered].slice(0, 20);
      localStorage.setItem('recentStocks', JSON.stringify(updated));
      return updated;
    });
  };

  const removeRecentStock = (targetCode, e) => {
    e.stopPropagation();
    
    const updatedStocks = recentStocks.filter(c => c !== targetCode);
    setRecentStocks(updatedStocks);
    localStorage.setItem('recentStocks', JSON.stringify(updatedStocks));

    setRecentPrices((prev) => {
      const updated = { ...prev };
      delete updated[targetCode];
      localStorage.setItem('recentPrices', JSON.stringify(updated));
      return updated;
    });

    // If we are currently monitoring the stock that is being removed, switch active monitoring
    if (code === targetCode) {
      if (updatedStocks.length > 0) {
        setCode(updatedStocks[0]);
        setHistory([]);
        prevPriceRef.current = null;
      } else {
        setIsPlaying(false);
        setStockData(null);
        setHistory([]);
        prevPriceRef.current = null;
      }
    }
  };

  const clearAllRecentStocks = () => {
    setRecentStocks([]);
    localStorage.setItem('recentStocks', JSON.stringify([]));
    setRecentPrices({});
    localStorage.setItem('recentPrices', JSON.stringify({}));
    setIsPlaying(false);
    setStockData(null);
    setHistory([]);
    prevPriceRef.current = null;
  };

  // Grab and update prices, highs, and lows for all last 20 monitored stocks
  const fetchAllRecentPrices = async () => {
    if (isFetchingBatchRef.current) return;
    isFetchingBatchRef.current = true;
    
    const codesToFetch = [...recentStocks];
    for (const recentCode of codesToFetch) {
      try {
        const response = await fetch(`http://localhost:3300/api/quote?code=${recentCode}`);
        if (response.ok) {
          const data = await response.json();
          setRecentPrices((prev) => {
            const changeMatch = data.change ? data.change.match(/\(([^)]+)\)/) : null;
            const pct = changeMatch ? changeMatch[1] : '';
            const priceNum = data.price ? parseFloat(data.price.replace(/,/g, '')) : null;
            const existingHist = prev[recentCode]?.history || [];
            let newHist = existingHist;
            if (priceNum !== null && !isNaN(priceNum) && priceNum > 0) {
              if (existingHist.length === 0 || existingHist[existingHist.length - 1] !== priceNum) {
                newHist = [...existingHist, priceNum].slice(-30);
              }
            }
            const updated = { 
              ...prev, 
              [recentCode]: {
                name: data.name,
                price: data.price,
                high: data.highest,
                low: data.lowest,
                volume: data.volume,
                change: pct,
                history: newHist
              }
            };
            localStorage.setItem('recentPrices', JSON.stringify(updated));
            return updated;
          });
        }
      } catch (err) {
        console.error(`Failed batch fetch for code ${recentCode}:`, err);
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    isFetchingBatchRef.current = false;
  };

  const fetchStock = async (currentCode) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`http://localhost:3300/api/quote?code=${currentCode}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to fetch stock data');
      }
      const data = await response.json();
      setStockData(data);

      // Save valid code & update active price, high, and low
      if (data.code) {
        setRecentStocks((prev) => {
          if (prev.includes(data.code)) return prev;
          const updated = [data.code, ...prev].slice(0, 20);
          localStorage.setItem('recentStocks', JSON.stringify(updated));
          return updated;
        });
        setRecentPrices((prev) => {
          const changeMatch = data.change ? data.change.match(/\(([^)]+)\)/) : null;
          const pct = changeMatch ? changeMatch[1] : '';
          const priceNum = data.price ? parseFloat(data.price.replace(/,/g, '')) : null;
          const existingHist = prev[data.code]?.history || [];
          let newHist = existingHist;
          if (priceNum !== null && !isNaN(priceNum) && priceNum > 0) {
            if (existingHist.length === 0 || existingHist[existingHist.length - 1] !== priceNum) {
              newHist = [...existingHist, priceNum].slice(-30);
            }
          }
          const updated = { 
            ...prev, 
            [data.code]: {
              name: data.name,
              price: data.price,
              high: data.highest,
              low: data.lowest,
              volume: data.volume,
              change: pct,
              history: newHist
            }
          };
          localStorage.setItem('recentPrices', JSON.stringify(updated));
          return updated;
        });
      }

      if (prevPriceRef.current !== null && prevPriceRef.current !== data.price) {
        const prevPriceNum = parseFloat(prevPriceRef.current.replace(/,/g, ''));
        const newPriceNum = parseFloat(data.price.replace(/,/g, ''));
        if (newPriceNum > prevPriceNum) {
          setFlashClass('flash-green');
        } else if (newPriceNum < prevPriceNum) {
          setFlashClass('flash-red');
        }
        setTimeout(() => setFlashClass(''), 1000);
      }
      prevPriceRef.current = data.price;

      setHistory((prev) => {
        const isUp = data.change.includes('+');
        const isDown = data.change.includes('-');
        const direction = isUp ? 'up' : isDown ? 'down' : 'unchanged';
        
        const newLog = {
          id: Date.now(),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          price: data.price,
          change: data.change,
          volume: data.volume,
          direction
        };
        return [newLog, ...prev].slice(0, 40);
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFetch = () => {
    prevPriceRef.current = null;
    fetchStock(code);
    fetchAllRecentPrices();
  };

  useEffect(() => {
    if (isPlaying) {
      fetchStock(code);
      timerRef.current = setInterval(() => {
        fetchStock(code);
      }, intervalSec * 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, code, intervalSec]);

  // Background watchlist update loop (every 30 seconds)
  useEffect(() => {
    fetchAllRecentPrices();
    batchTimerRef.current = setInterval(() => {
      fetchAllRecentPrices();
    }, 30000);

    return () => {
      if (batchTimerRef.current) clearInterval(batchTimerRef.current);
    };
  }, [recentStocks]);

  const isPriceUp = stockData?.change?.includes('+');
  const isPriceDown = stockData?.change?.includes('-');
  const priceColorClass = isPriceUp ? 'price-up' : isPriceDown ? 'price-down' : '';

  // Render SVG Chart helper
  const renderChart = () => {
    if (history.length < 2) {
      return <div className="chart-placeholder">Waiting for more data...</div>;
    }

    const points = [...history].reverse().map((log, idx, arr) => {
      const priceVal = parseFloat(log.price.replace(/,/g, '')) || 0;
      let volVal = parseFloat(log.volume) || 0;
      if (log.volume?.includes('億')) volVal *= 100000;
      else if (log.volume?.includes('百萬')) volVal *= 1000;
      else if (log.volume?.includes('萬')) volVal *= 10;
      
      let direction = 'unchanged';
      if (idx > 0) {
        const prevPrice = arr[idx - 1].price;
        const prevPriceVal = parseFloat(prevPrice.replace(/,/g, '')) || 0;
        if (priceVal > prevPriceVal) direction = 'up';
        else if (priceVal < prevPriceVal) direction = 'down';
      } else {
        direction = log.direction;
      }

      return { price: priceVal, volume: volVal, time: log.time, direction };
    });

    const prices = points.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    const width = 450;
    const height = 120;
    const rightYAxisWidth = 45;
    const topMargin = 8;
    const bottomMargin = 17;
    
    const pricePaneHeight = 65;
    const volumePaneHeight = 22;
    const paneGap = 7;

    const chartWidth = width - rightYAxisWidth - 10;

    const pricePoints = points.map((p, idx) => {
      const x = 5 + (idx / (points.length - 1)) * chartWidth;
      const y = topMargin + pricePaneHeight - ((p.price - minPrice) / priceRange) * pricePaneHeight;
      return { x, y };
    });

    const linePath = pricePoints.reduce((acc, p, idx) => {
      return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
    }, '');

    const areaPath = linePath ? `${linePath} L ${pricePoints[pricePoints.length - 1].x} ${topMargin + pricePaneHeight} L ${pricePoints[0].x} ${topMargin + pricePaneHeight} Z` : '';

    const volumeDifferences = points.map((p, idx) => {
      if (idx === 0) return 0;
      return Math.max(0, p.volume - points[idx - 1].volume);
    });
    const maxDiffVolume = Math.max(...volumeDifferences) || 1;

    return (
      <div className="svg-chart-container">
        <svg viewBox={`0 0 ${width} ${height}`} className="stock-svg-chart">
          <defs>
            <linearGradient id="price-line-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--accent-blue)" stopOpacity="0.25"/>
              <stop offset="100%" stopColor="var(--accent-blue)" stopOpacity="0.0"/>
            </linearGradient>
          </defs>

          <rect x="2" y={topMargin} width={chartWidth + 6} height={pricePaneHeight} fill="rgba(15, 23, 42, 0.1)" rx="2"/>
          <line x1="2" y1={topMargin} x2={chartWidth + 8} y2={topMargin} stroke="var(--panel-border)" strokeWidth="0.5" strokeDasharray="2,2"/>
          <line x1="2" y1={topMargin + pricePaneHeight / 2} x2={chartWidth + 8} y2={topMargin + pricePaneHeight / 2} stroke="var(--panel-border)" strokeWidth="0.5" strokeDasharray="2,2"/>
          <line x1="2" y1={topMargin + pricePaneHeight} x2={chartWidth + 8} y2={topMargin + pricePaneHeight} stroke="var(--panel-border)" strokeWidth="0.5"/>

          {areaPath && <path d={areaPath} fill="url(#price-line-grad)" />}
          {linePath && <path d={linePath} fill="none" stroke="var(--accent-blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}

          {pricePoints.map((p, idx) => (
            <circle
              key={idx}
              cx={p.x}
              cy={p.y}
              r="1.5"
              fill={idx === pricePoints.length - 1 ? "var(--accent-purple)" : "var(--accent-blue)"}
              className={idx === pricePoints.length - 1 ? "pulse-dot" : ""}
            />
          ))}

          <text x={chartWidth + 10} y={topMargin + 8} fill="var(--text-secondary)" fontSize="12" fontWeight="bold">{maxPrice.toFixed(2)}</text>
          <text x={chartWidth + 10} y={topMargin + pricePaneHeight / 2 + 4} fill="var(--text-secondary)" fontSize="12">{((maxPrice + minPrice) / 2).toFixed(2)}</text>
          <text x={chartWidth + 10} y={topMargin + pricePaneHeight + 2} fill="var(--text-secondary)" fontSize="12" fontWeight="bold">{minPrice.toFixed(2)}</text>

          {/* X-Axis Time Labels at the bottom */}
          <text x="6" y="117" fill="var(--text-secondary)" fontSize="12" opacity="0.75">{points[0].time}</text>
          <text x={chartWidth / 2} y="117" fill="var(--text-secondary)" fontSize="12" opacity="0.75" textAnchor="middle">{points[Math.floor(points.length / 2)].time}</text>
          <text x={chartWidth + 2} y="117" fill="var(--text-secondary)" fontSize="12" opacity="0.75" textAnchor="end">{points[points.length - 1].time}</text>

          <rect x="2" y={topMargin + pricePaneHeight + paneGap} width={chartWidth + 6} height={volumePaneHeight} fill="rgba(15, 23, 42, 0.1)" rx="2"/>
          <line x1="2" y1={height - bottomMargin} x2={chartWidth + 8} y2={height - bottomMargin} stroke="var(--panel-border)" strokeWidth="0.5"/>

          {points.map((p, idx) => {
            const diffVol = volumeDifferences[idx];
            const barHeight = maxDiffVolume > 0 ? (diffVol / maxDiffVolume) * (volumePaneHeight - 2) : 1;
            const barWidth = Math.max(2, (chartWidth / points.length) * 0.7);
            const x = 5 + (idx / (points.length - 1)) * chartWidth - barWidth / 2;
            const y = height - bottomMargin - barHeight;
            const barColor = p.direction === 'up' ? 'var(--accent-green)' : p.direction === 'down' ? 'var(--accent-red)' : 'var(--text-secondary)';

            return (
              <rect
                key={idx}
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={barColor}
                opacity="0.8"
                rx="0.5"
              />
            );
          })}
        </svg>
      </div>
    );
  };

  // Helper to render compact Area Graph (no volume pane) for each stock item in Mini Mode
  const renderMiniAreaGraph = (priceData, stockCode) => {
    const history = priceData.history || [];
    const highVal = priceData.high ? parseFloat(priceData.high.replace(/,/g, '')) : null;
    const lowVal = priceData.low ? parseFloat(priceData.low.replace(/,/g, '')) : null;
    const priceVal = priceData.price ? parseFloat(priceData.price.replace(/,/g, '')) : null;

    let points = [...history];
    if (points.length === 0 && priceVal !== null) {
      points = [lowVal || priceVal, priceVal, highVal || priceVal].filter(v => v !== null && !isNaN(v));
    } else if (points.length === 1) {
      points = [points[0] * 0.998, points[0], points[0] * 1.002];
    }

    if (points.length < 2) {
      return <div className="mini-graph-empty">-</div>;
    }

    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || (min * 0.01) || 1;

    const w = 140;
    const h = 24;
    const p = 3;

    const coords = points.map((val, idx) => {
      const x = p + (idx / (points.length - 1)) * (w - 2 * p);
      const y = (h - p) - ((val - min) / range) * (h - 2 * p);
      return { x, y };
    });

    const lineD = coords.reduce((acc, pt, idx) => {
      return idx === 0 ? `M ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}` : `${acc} L ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`;
    }, '');

    const firstX = coords[0].x.toFixed(1);
    const lastX = coords[coords.length - 1].x.toFixed(1);
    const areaD = `${lineD} L ${lastX} ${h} L ${firstX} ${h} Z`;

    const isUp = priceData.change?.includes('+');
    const isDown = priceData.change?.includes('-');
    const colorVar = isUp ? 'var(--accent-green)' : isDown ? 'var(--accent-red)' : 'var(--accent-blue)';
    const gradId = `mini-grad-${stockCode}`;

    const lastCoord = coords[coords.length - 1];

    return (
      <div className="mini-area-graph-container">
        <svg viewBox={`0 0 ${w} ${h}`} className="mini-sparkline-svg" preserveAspectRatio="none">
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colorVar} stopOpacity="0.35" />
              <stop offset="100%" stopColor={colorVar} stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <path d={areaD} fill={`url(#${gradId})`} />
          <path d={lineD} fill="none" stroke={colorVar} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={lastCoord.x} cy={lastCoord.y} r="2" fill={colorVar} className="pulse-dot" />
        </svg>
      </div>
    );
  };

  // 1. Very Compact / Mini Mode Layout
  if (isMiniMode) {
    return (
      <div className="app-container light-theme mini-mode-wrapper">
        <div className="mini-widget-card">
          {/* Top Bar with Expand Icon */}
          <div className="mini-widget-header">
            <span className="mini-widget-title">Live Watchlist <span style={{ fontSize: '10px', opacity: 0.55, fontWeight: 'normal', marginLeft: '4px' }}>v2026v0803</span></span>
            {hsiData && (
              <div className="mini-hsi-ticker">
                <span className="mini-lbl">{hsiData.label || '恒指'}</span>
                <span className="mini-hsi-val">{hsiData.value}</span>
                <span className={`mini-hsi-change ${hsiData.change.includes('+') ? 'up-color' : hsiData.change.includes('-') ? 'down-color' : ''}`}>
                  {hsiData.change}
                </span>
              </div>
            )}
            <div className="mini-header-actions">
              {recentStocks.length > 0 && (
                <>
                  <button 
                    className={`mini-sort-btn ${sortKey !== 'default' ? 'active' : ''}`}
                    onClick={() => {
                      const keys = ['default', 'code', 'price', 'change'];
                      const nextKey = keys[(keys.indexOf(sortKey) + 1) % keys.length];
                      handleSort(nextKey);
                    }}
                    title={`Current Sort: ${sortKey === 'default' ? 'Default' : sortKey.toUpperCase() + ' (' + sortOrder + ')'}`}
                  >
                    {sortKey === 'default' ? 'Sort ↕' : `${sortKey.toUpperCase()} ${sortOrder === 'asc' ? '▲' : '▼'}`}
                  </button>
                  <button 
                    className="btn-icon mini-clear-btn"
                    onClick={clearAllRecentStocks}
                    title="Clean All Watchlist Stocks"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </>
              )}
              <button 
                className={`btn-icon mini-toggle-graph ${showMiniGraph ? 'active' : ''}`} 
                onClick={toggleMiniGraph}
                title={showMiniGraph ? "Show Numerical Stats (高/低/量)" : "Show Dynamic Area Graph (面積圖)"}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
              </button>
              <button 
                className="btn-icon mini-toggle-names" 
                onClick={toggleMiniNames}
                title={showMiniNames ? "Hide Company Names" : "Show Company Names"}
              >
                {showMiniNames ? (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                )}
              </button>
              <button 
                className="btn-icon mini-expand" 
                onClick={() => setIsMiniMode(false)}
                title="Expand Dashboard"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="15 3 21 3 21 9"></polyline>
                  <polyline points="9 21 3 21 3 15"></polyline>
                  <line x1="21" y1="3" x2="14" y2="10"></line>
                  <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
              </button>
            </div>
          </div>

          {/* Column Header Bar for Sorting */}
          {recentStocks.length > 0 && (
            <div className={`mini-list-header ${showMiniGraph ? 'with-graph' : ''} ${showMiniNames ? 'with-name' : 'no-name'}`}>
              <span className={`mini-col-header sortable ${sortKey === 'code' ? 'active' : ''}`} onClick={() => handleSort('code')} title="Sort by Code">
                Code {sortKey === 'code' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </span>
              {showMiniNames && (
                <span className={`mini-col-header sortable ${sortKey === 'name' ? 'active' : ''}`} onClick={() => handleSort('name')} title="Sort by Name">
                  Name {sortKey === 'name' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
                </span>
              )}
              {showMiniGraph ? (
                <span className="mini-col-header disabled graph-col-header">Trend Area</span>
              ) : (
                <>
                  <span className="mini-col-header disabled">高</span>
                  <span className="mini-col-header disabled">低</span>
                  <span className="mini-col-header disabled">量</span>
                </>
              )}
              <span className={`mini-col-header sortable ${sortKey === 'price' ? 'active' : ''}`} onClick={() => handleSort('price')} title="Sort by Price">
                Price {sortKey === 'price' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </span>
              <span className={`mini-col-header sortable ${sortKey === 'change' ? 'active' : ''}`} onClick={() => handleSort('change')} title="Sort by Change %">
                Change {sortKey === 'change' ? (sortOrder === 'asc' ? '▲' : '▼') : ''}
              </span>
              <span></span>
            </div>
          )}

          {/* Watchlist */}
          <div className="mini-stock-list">
            {getSortedStocks().map((c) => {
              const isActive = code === c;
              const priceData = recentPrices[c] || { name: '', price: '...', high: '...', low: '...', volume: '...' };
              return (
                <div 
                  key={c} 
                  className={`mini-stock-item ${isActive ? 'active' : ''} ${isActive ? flashClass : ''} ${showMiniGraph ? 'with-graph' : ''} ${showMiniNames ? 'with-name' : 'no-name'}`}
                  onClick={() => {
                    if (!isActive) {
                      setCode(c);
                      setHistory([]);
                      prevPriceRef.current = null;
                    }
                  }}
                >
                  <span className="mini-item-code">{c}</span>
                  
                  {showMiniNames && (
                    <span className="mini-item-name" title={priceData.name || ''}>
                      {priceData.name || '-'}
                    </span>
                  )}
                  
                  {showMiniGraph ? (
                    renderMiniAreaGraph(priceData, c)
                  ) : (
                    <>
                      <span className="mini-stat-high">
                        <span className="mini-lbl">高</span> {priceData.high || '-'}
                      </span>

                      <span className="mini-stat-low">
                        <span className="mini-lbl">低</span> {priceData.low || '-'}
                      </span>

                      <span className="mini-stat-vol">
                        <span className="mini-lbl">量</span> {priceData.volume || '-'}
                      </span>
                    </>
                  )}

                  <span className={`mini-item-price ${isActive ? priceColorClass : ''}`}>
                    {priceData.price || '-'}
                  </span>

                  <span className={`mini-item-pct ${priceData.change?.includes('+') ? 'up-color' : priceData.change?.includes('-') ? 'down-color' : ''}`}>
                    {priceData.change || '-'}
                  </span>
                  
                  <button 
                    className="mini-item-remove"
                    onClick={(e) => removeRecentStock(c, e)}
                    title="Remove"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Bottom Index Bar (Mini Mode) */}
          {hsiData && (
            <div className="mini-bottom-index-bar">
              <div className="mini-index-item">
                <span className="idx-label">期指:</span>
                <span className="idx-val">{hsiData.futuresValue || '25,990'}</span>
                {hsiData.futuresChange && (
                  <span className={`idx-change ${hsiData.futuresChange.includes('+') ? 'up-color' : hsiData.futuresChange.includes('-') ? 'down-color' : ''}`}>
                    {hsiData.futuresChange}
                  </span>
                )}
              </div>
              <div className="mini-index-item">
                <span className="idx-label">恒指:</span>
                <span className="idx-val">{hsiData.hsiValue || hsiData.value || '--'}</span>
                {hsiData.hsiChange && (
                  <span className={`idx-change ${hsiData.hsiChange.includes('+') ? 'up-color' : hsiData.hsiChange.includes('-') ? 'down-color' : ''}`}>
                    {hsiData.hsiChange}
                  </span>
                )}
              </div>
              {hsiData.high && (
                <div className="mini-index-item">
                  <span className="idx-label">高:</span>
                  <span className="idx-val up-color">{hsiData.high}</span>
                </div>
              )}
              {hsiData.low && (
                <div className="mini-index-item">
                  <span className="idx-label">低:</span>
                  <span className="idx-val down-color">{hsiData.low}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. Full Mode Layout
  return (
    <div className={`app-container ${theme}-theme ${showLogs ? 'has-logs' : 'no-logs'}`}>
      {/* Top Bar */}
      <header className="compact-header">
        <div className="title-area">
          {hsiData && (
            <div className="hsi-ticker">
              <span className="hsi-label">{hsiData.label || '恒指'}</span>
              <span className="hsi-val">{hsiData.value}</span>
              <span className={`hsi-change ${hsiData.change.includes('+') ? 'up-color' : hsiData.change.includes('-') ? 'down-color' : ''}`}>
                {hsiData.change}
              </span>
            </div>
          )}
        </div>

        <div className="controls-area">
          <button 
            className="btn-icon nav-prev"
            onClick={handlePrevStock}
            title="Previous Stock"
            disabled={recentStocks.length <= 1}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>

          <input
            className="input-code"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                setCode(inputValue);
                setHistory([]);
                prevPriceRef.current = null;
              }
            }}
            placeholder="02513"
          />

          <button 
            className="btn-icon nav-next"
            onClick={handleNextStock}
            title="Next Stock"
            disabled={recentStocks.length <= 1}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
          
          <input
            className="input-interval"
            type="number"
            min="2"
            value={intervalSec}
            onChange={(e) => setIntervalSec(Math.max(2, parseInt(e.target.value) || 10))}
          />

          <button
            className={`btn-icon ${isPlaying ? 'pause' : 'play'}`}
            onClick={() => setIsPlaying(!isPlaying)}
            title={isPlaying ? "Pause" : "Resume"}
          >
            {isPlaying ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            )}
          </button>

          <button className="btn-icon" onClick={handleFetch} title="Refresh">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"></path></svg>
          </button>

          <button 
            className={`btn-icon logs ${showLogs ? 'active' : ''}`}
            onClick={() => setShowLogs(!showLogs)}
            title="Toggle Logs"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
          </button>

          <button 
            className="btn-icon theme-toggle"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === 'dark' ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            )}
          </button>

          {/* Mini Mode Toggle Button */}
          <button 
            className="btn-icon mini-toggle"
            onClick={() => setIsMiniMode(true)}
            title="Switch to Mini Widget"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="4 14 10 14 10 20"></polyline>
              <polyline points="20 10 14 10 14 4"></polyline>
              <line x1="14" y1="10" x2="21" y2="3"></line>
              <line x1="10" y1="14" x2="3" y2="21"></line>
            </svg>
          </button>
        </div>

        <div className="status-indicator">
          <span className={`status-dot ${isPlaying ? 'active' : ''}`}></span>
        </div>
      </header>

      {error && (
        <div className="compact-error">
          {error}
        </div>
      )}

      {/* Main Content Area */}
      <main className={`dashboard-layout ${showLogs ? 'with-logs' : 'no-logs'}`}>
        <section className={`price-panel ${flashClass}`}>
          {stockData ? (
            <>
              {/* Inline Stock Header & Price */}
              <div className="price-row">
                <div className="stock-info">
                  <span className="stock-name">{stockData.name}</span>
                  <span className="stock-code">{stockData.code}</span>
                </div>
                <div className="price-info">
                  <span className={`price-text ${priceColorClass}`}>{stockData.price}</span>
                  <span className={`price-pct ${priceColorClass}`}>{stockData.change}</span>
                </div>
                <span className="last-checked">{stockData.timestamp}</span>
              </div>

              {/* SVG Price & Volume Graph */}
              {renderChart()}

              {/* Ultra Compact Grid */}
              <div className="micro-stats">
                <div className="stat-row">
                  <div className="cell"><span className="lbl">開</span><span className="val">{stockData.open}</span></div>
                  <div className="cell"><span className="lbl">收</span><span className="val">{stockData.prevClose}</span></div>
                  <div className="cell"><span className="lbl">高</span><span className="val up-color">{stockData.highest}</span></div>
                  <div className="cell"><span className="lbl">低</span><span className="val down-color">{stockData.lowest}</span></div>
                </div>
                <div className="stat-row">
                  <div className="cell"><span className="lbl">量</span><span className="val">{stockData.volume}</span></div>
                  <div className="cell"><span className="lbl">額</span><span className="val">{stockData.turnover}</span></div>
                  <div className="cell"><span className="lbl">市</span><span className="val">{stockData.marketCap}</span></div>
                  <div className="cell"><span className="lbl">空</span><span className="val">{stockData.shortSell}</span></div>
                </div>
                <div className="stat-row">
                  <div className="cell"><span className="lbl">52周高</span><span className="val up-color">{stockData.yearHigh}</span></div>
                  <div className="cell"><span className="lbl">52周低</span><span className="val down-color">{stockData.yearLow}</span></div>
                  <div className="cell"><span className="lbl">1月高</span><span className="val up-color">{stockData.monthHigh}</span></div>
                  <div className="cell"><span className="lbl">1月低</span><span className="val down-color">{stockData.monthLow}</span></div>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">
              {loading ? 'Loading...' : 'No Data'}
            </div>
          )}
        </section>

        {showLogs && (
          <section className="logs-panel">
            <div className="logs-list">
              {history.length > 0 ? (
                history.map((log) => (
                  <div key={log.id} className={`log-row ${log.direction}`}>
                    <span className="time">{log.time}</span>
                    <span className="val">{log.price}</span>
                    <span className="diff">{log.change}</span>
                  </div>
                ))
              ) : (
                <div className="empty-state">No logs</div>
              )}
            </div>
          </section>
        )}

        {/* Bottom Index Bar (Main Mode) */}
        {hsiData && (
          <footer className="bottom-index-bar">
            <div className="index-item">
              <span className="idx-label">期指:</span>
              <span className="idx-val">{hsiData.futuresValue || '25,990'}</span>
              {hsiData.futuresChange && (
                <span className={`idx-change ${hsiData.futuresChange.includes('+') ? 'up-color' : hsiData.futuresChange.includes('-') ? 'down-color' : ''}`}>
                  {hsiData.futuresChange}
                </span>
              )}
            </div>
            <div className="index-item">
              <span className="idx-label">恒指:</span>
              <span className="idx-val">{hsiData.hsiValue || hsiData.value || '--'}</span>
              {hsiData.hsiChange && (
                <span className={`idx-change ${hsiData.hsiChange.includes('+') ? 'up-color' : hsiData.hsiChange.includes('-') ? 'down-color' : ''}`}>
                  {hsiData.hsiChange}
                </span>
              )}
            </div>
            {hsiData.high && (
              <div className="index-item">
                <span className="idx-label">高:</span>
                <span className="idx-val up-color">{hsiData.high}</span>
              </div>
            )}
            {hsiData.low && (
              <div className="index-item">
                <span className="idx-label">低:</span>
                <span className="idx-val down-color">{hsiData.low}</span>
              </div>
            )}
          </footer>
        )}
      </main>
    </div>
  );
}

export default App;
