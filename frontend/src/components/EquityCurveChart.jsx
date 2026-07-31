import { useEffect, useRef } from 'react';
import { createChart, CrosshairMode, LineSeries } from 'lightweight-charts';

const EquityCurveChart = ({ equityCurve }) => {
    const chartContainerRef = useRef();

    useEffect(() => {
        if (!equityCurve || equityCurve.length === 0) return;

        const chart = createChart(chartContainerRef.current, {
            width: chartContainerRef.current.clientWidth,
            height: 260,
            layout: {
                background: { color: 'transparent' },
                textColor: '#92a0b8',
            },
            grid: {
                vertLines: { color: '#1b212c' },
                horzLines: { color: '#1b212c' },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderColor: '#232a38',
            },
            rightPriceScale: {
                borderColor: '#232a38',
            },
        });

        const lineSeries = chart.addSeries(LineSeries, {
            color: '#34d399',
            lineWidth: 2,
            priceLineVisible: false,
            lastValueVisible: true,
        });

        const data = equityCurve.map(point => ({ time: point.time, value: point.equity }));
        lineSeries.setData(data);
        chart.timeScale().fitContent();

        const handleResize = () => {
            chart.applyOptions({ width: chartContainerRef.current.clientWidth });
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [equityCurve]);

    return <div ref={chartContainerRef} style={{ position: 'relative', width: '100%', border: '1px solid #1b212c', borderRadius: '10px', overflow: 'hidden' }} />;
};

export default EquityCurveChart;
