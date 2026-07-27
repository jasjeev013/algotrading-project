import { useEffect, useRef } from 'react';
import { createChart, CrosshairMode, CandlestickSeries, createSeriesMarkers } from 'lightweight-charts';

const TradingChart = ({ priceData, tradeLog }) => {
    const chartContainerRef = useRef();
    const chartRef = useRef();

    useEffect(() => {
        if (!priceData || priceData.length === 0) return;

        // 1. Initialize Chart
        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 400,
            layout: {
                background: { color: '#1e1e1e' },
                textColor: '#d1d4dc',
            },
            grid: {
                vertLines: { color: '#2B2B43' },
                horzLines: { color: '#2B2B43' },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
        });
        chartRef.current = chart;

        // 2. Add Candlestick Series (v5 Syntax)
        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#4CAF50',
            downColor: '#f44336',
            borderVisible: false,
            wickUpColor: '#4CAF50',
            wickDownColor: '#f44336',
        });
        candleSeries.setData(priceData);

        // 3. Generate Trade Markers (Buy/Sell Arrows)
        const markers = [];
        tradeLog.forEach(trade => {
            // Entry Marker
            markers.push({
                time: trade.entry_date,
                position: trade.type === 'LONG' ? 'belowBar' : 'aboveBar',
                color: trade.type === 'LONG' ? '#4CAF50' : '#f44336',
                shape: trade.type === 'LONG' ? 'arrowUp' : 'arrowDown',
                text: `Entry ${trade.type}`,
            });
            // Exit Marker
            markers.push({
                time: trade.exit_date,
                position: trade.type === 'LONG' ? 'aboveBar' : 'belowBar',
                color: '#FF9800', // Orange for exits
                shape: trade.type === 'LONG' ? 'arrowDown' : 'arrowUp',
                text: 'Exit',
            });
        });

        // Sort markers by time (required by lightweight-charts)
        markers.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
        
        // --- NEW: Add Markers using v5 createSeriesMarkers plugin ---
        createSeriesMarkers(candleSeries, markers);

        // Handle window resize
        const handleResize = () => {
            chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        };
        window.addEventListener('resize', handleResize);

        // Cleanup function
        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [priceData, tradeLog]);

    return <div ref={chartContainerRef} style={{ position: 'relative', width: '100%', border: '1px solid #333', borderRadius: '8px', overflow: 'hidden' }} />;
};

export default TradingChart;