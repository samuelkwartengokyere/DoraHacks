"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  createChart,
  createSeriesMarkers,
  type IChartApi,
  type IPriceLine,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";
import { Maximize2, Minimize2, Minus, Plus, RotateCcw, Target } from "lucide-react";
import { CHART_INTERVALS, isShortInterval, type ChartInterval } from "@/lib/chart-intervals";
import { cn } from "@/lib/utils";

export interface BrokerCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  fastMa?: number | null;
  slowMa?: number | null;
}

export interface BrokerMarker {
  time: number;
  action: "BUY" | "SELL" | "HOLD";
  tradeId?: string;
  status?: "open" | "completed" | "cancelled";
  priceUsd?: number;
  highlighted?: boolean;
}

interface BrokerCandlestickChartProps {
  candles: BrokerCandle[];
  symbol?: string;
  interval?: string;
  activeInterval?: ChartInterval;
  onIntervalChange?: (interval: ChartInterval) => void;
  fastPeriod?: number;
  slowPeriod?: number;
  markers?: BrokerMarker[];
  highlightTradeId?: string | null;
  height?: number;
  live?: boolean;
  connected?: boolean;
  ticker?: TickerSnapshot | null;
  showMa?: boolean;
  loadingMore?: boolean;
  onNeedMoreHistory?: () => void;
}

interface OhlcLegend {
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface TickerSnapshot {
  lastPrice: number;
  change24hPct: number;
  volume24h: number;
}

function toUtc(timeMs: number): UTCTimestamp {
  return Math.floor(timeMs / 1000) as UTCTimestamp;
}

function formatPrice(value: number) {
  if (value >= 1000) return value.toFixed(2);
  if (value >= 1) return value.toFixed(4);
  return value.toFixed(6);
}

function formatPriceUsd(value: number) {
  return `$${formatPrice(value)}`;
}

function formatVolume(value: number) {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  return value.toFixed(2);
}

function formatBarTime(timeMs: number, short = false) {
  return new Date(timeMs).toLocaleString(undefined, {
    month: short ? undefined : "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: short ? "2-digit" : undefined,
  });
}

function maSeriesData(candles: BrokerCandle[], key: "fastMa" | "slowMa") {
  return candles
    .filter((c) => c[key] != null)
    .map((c) => ({ time: toUtc(c.time), value: c[key] as number }));
}

const BULL = "#26a69a";
const BEAR = "#ef5350";

export function BrokerCandlestickChart({
  candles,
  symbol = "BNB",
  interval = "1H",
  activeInterval,
  onIntervalChange,
  fastPeriod = 9,
  slowPeriod = 21,
  markers = [],
  highlightTradeId = null,
  height = 420,
  live = false,
  connected = false,
  ticker = null,
  showMa = true,
  loadingMore = false,
  onNeedMoreHistory,
}: BrokerCandlestickChartProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const fastMaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const slowMaSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const priceLineRef = useRef<IPriceLine | null>(null);
  const entryLinesRef = useRef<IPriceLine[]>([]);
  const candlesRef = useRef<BrokerCandle[]>([]);
  const seededRef = useRef(false);
  const lastBarTimeRef = useRef<number | null>(null);
  const firstBarTimeRef = useRef<number | null>(null);
  const atRealtimeRef = useRef(true);
  const historyRequestedRef = useRef(false);
  const [hoveredBar, setHoveredBar] = useState<OhlcLegend | null>(null);
  const [hoveredTime, setHoveredTime] = useState<number | null>(null);
  const [flashUp, setFlashUp] = useState<boolean | null>(null);
  const [atRealtime, setAtRealtime] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [maVisible, setMaVisible] = useState(showMa);
  const prevCloseRef = useRef<number | null>(null);

  useEffect(() => {
    candlesRef.current = candles;
  }, [candles]);

  const lastCandle = candles[candles.length - 1];
  const prevCandle = candles.length > 1 ? candles[candles.length - 2] : null;

  const currentBar: OhlcLegend | null = lastCandle
    ? {
        open: lastCandle.open,
        high: lastCandle.high,
        low: lastCandle.low,
        close: ticker?.lastPrice ?? lastCandle.close,
        volume: lastCandle.volume,
      }
    : null;

  const displayLegend = hoveredBar ?? currentBar;
  const isHovering = hoveredBar != null;

  const barChangePct = useMemo(() => {
    if (!displayLegend?.open) return null;
    return ((displayLegend.close - displayLegend.open) / displayLegend.open) * 100;
  }, [displayLegend]);

  const prevCloseChangePct = useMemo(() => {
    if (!currentBar || !prevCandle?.close) return null;
    const last = ticker?.lastPrice ?? currentBar.close;
    return ((last - prevCandle.close) / prevCandle.close) * 100;
  }, [currentBar, prevCandle, ticker]);

  const markersKey = useMemo(
    () =>
      markers
        .map(
          (m) =>
            `${m.tradeId ?? ""}:${m.time}:${m.action}:${m.status ?? ""}:${m.highlighted ? "1" : "0"}`,
        )
        .join("|"),
    [markers],
  );

  const entryLinesKey = useMemo(
    () =>
      markers
        .filter((m) => m.status === "open" && m.priceUsd != null)
        .map((m) => `${m.tradeId}:${m.priceUsd}`)
        .join("|"),
    [markers],
  );

  const hasData = candles.length > 0;

  useEffect(() => {
    if (!live || !lastCandle) return;
    const liveClose = ticker?.lastPrice ?? lastCandle.close;
    const prev = prevCloseRef.current;
    if (prev != null && prev !== liveClose) {
      setFlashUp(liveClose >= prev);
      const timer = window.setTimeout(() => setFlashUp(null), 350);
      prevCloseRef.current = liveClose;
      return () => window.clearTimeout(timer);
    }
    prevCloseRef.current = liveClose;
  }, [live, lastCandle, ticker?.lastPrice]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !hasData) return;

    const chart = createChart(el, {
      width: el.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#131722" },
        textColor: "#d1d4dc",
        fontSize: 12,
      },
      grid: {
        vertLines: { color: "#1e222d" },
        horzLines: { color: "#1e222d" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "#758696", width: 1, style: 2, labelBackgroundColor: "#2a2e39" },
        horzLine: { color: "#758696", width: 1, style: 2, labelBackgroundColor: "#2a2e39" },
      },
      timeScale: {
        borderColor: "#2a2e39",
        timeVisible: true,
        secondsVisible: activeInterval ? isShortInterval(activeInterval) : false,
        rightOffset: live ? 8 : 0,
        barSpacing: 8,
        minBarSpacing: 2,
      },
      handleScale: {
        axisPressedMouseMove: { time: true, price: true },
        mouseWheel: true,
        pinch: true,
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },
      rightPriceScale: {
        borderColor: "#2a2e39",
        scaleMargins: { top: 0.08, bottom: 0.05 },
      },
      localization: {
        priceFormatter: formatPriceUsd,
      },
    });
    chartRef.current = chart;

    const mainPane = chart.panes()[0];
    mainPane.setStretchFactor(3);

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: BULL,
      downColor: BEAR,
      borderUpColor: BULL,
      borderDownColor: BEAR,
      wickUpColor: BULL,
      wickDownColor: BEAR,
      priceLineVisible: live,
      lastValueVisible: live,
    });
    candleSeriesRef.current = candleSeries;

    const hasFastMa = maVisible && candles.some((c) => c.fastMa != null);
    if (hasFastMa) {
      const fastSeries = chart.addSeries(LineSeries, {
        color: "#2962ff",
        lineWidth: 2,
        title: `MA ${fastPeriod}`,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      fastSeries.setData(maSeriesData(candles, "fastMa"));
      fastMaSeriesRef.current = fastSeries;
    }

    const hasSlowMa = maVisible && candles.some((c) => c.slowMa != null);
    if (hasSlowMa) {
      const slowSeries = chart.addSeries(LineSeries, {
        color: "#e040fb",
        lineWidth: 2,
        title: `MA ${slowPeriod}`,
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      slowSeries.setData(maSeriesData(candles, "slowMa"));
      slowMaSeriesRef.current = slowSeries;
    }

    const volumePane = chart.addPane();
    volumePane.setStretchFactor(1);
    const volumeSeries = volumePane.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceLineVisible: false,
      lastValueVisible: false,
    });
    volumeSeriesRef.current = volumeSeries;

    candleSeries.setData(
      candles.map((c) => ({
        time: toUtc(c.time),
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    );
    volumeSeries.setData(
      candles.map((c) => ({
        time: toUtc(c.time),
        value: c.volume ?? 0,
        color: c.close >= c.open ? "rgba(38, 166, 154, 0.55)" : "rgba(239, 83, 80, 0.55)",
      })),
    );

    seededRef.current = true;
    lastBarTimeRef.current = candles[candles.length - 1]?.time ?? null;
    firstBarTimeRef.current = candles[0]?.time ?? null;

    if (live && lastCandle) {
      priceLineRef.current = candleSeries.createPriceLine({
        price: lastCandle.close,
        color: lastCandle.close >= lastCandle.open ? BULL : BEAR,
        lineWidth: 1,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "",
      });
    }

    if (markers.length > 0) {
      createSeriesMarkers(
        candleSeries,
        markers.map((m) => {
          const isOpen = m.status === "open";
          const isHighlighted = m.highlighted || (highlightTradeId && m.tradeId === highlightTradeId);
          const label = m.priceUsd
            ? `${m.action} $${formatPrice(m.priceUsd)}${isOpen ? " · OPEN" : ""}`
            : `${m.action}${isOpen ? " · OPEN" : ""}`;

          return {
            time: toUtc(m.time),
            position: m.action === "BUY" ? "belowBar" : m.action === "SELL" ? "aboveBar" : "inBar",
            color: isHighlighted
              ? "#f59e0b"
              : isOpen
                ? m.action === "BUY"
                  ? "#4ade80"
                  : "#f87171"
                : m.action === "BUY"
                  ? "#22c55e"
                  : m.action === "SELL"
                    ? "#ef4444"
                    : "#94a3b8",
            shape: m.action === "BUY" ? "arrowUp" : m.action === "SELL" ? "arrowDown" : "circle",
            text: label,
          };
        }),
      );
    }

    for (const line of entryLinesRef.current) {
      candleSeries.removePriceLine(line);
    }
    entryLinesRef.current = [];

    for (const marker of markers) {
      if (marker.status === "open" && marker.priceUsd != null) {
        const line = candleSeries.createPriceLine({
          price: marker.priceUsd,
          color: marker.action === "BUY" ? "#4ade80" : "#f87171",
          lineWidth: marker.tradeId === highlightTradeId ? 2 : 1,
          lineStyle: 2,
          axisLabelVisible: true,
          title: `${marker.action} entry`,
        });
        entryLinesRef.current.push(line);
      }
    }

    chart.timeScale().fitContent();
    if (live) {
      chart.timeScale().scrollToRealTime();
      atRealtimeRef.current = true;
      setAtRealtime(true);
    }

    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (!range) return;

      const lastIndex = candlesRef.current.length - 1;
      const following = lastIndex < 0 || range.to >= lastIndex - 2;
      atRealtimeRef.current = following;
      setAtRealtime(following);

      if (
        onNeedMoreHistory &&
        range.from < 20 &&
        !historyRequestedRef.current &&
        candlesRef.current.length > 0
      ) {
        historyRequestedRef.current = true;
        onNeedMoreHistory();
        window.setTimeout(() => {
          historyRequestedRef.current = false;
        }, 1500);
      }
    });

    chart.subscribeCrosshairMove((param) => {
      if (!param.time) {
        setHoveredBar(null);
        setHoveredTime(null);
        return;
      }

      const candle = param.seriesData.get(candleSeries) as
        | { open?: number; high?: number; low?: number; close?: number }
        | undefined;
      if (!candle?.open) {
        setHoveredBar(null);
        setHoveredTime(null);
        return;
      }

      const timeMs = Number(param.time) * 1000;
      const snapshot = candlesRef.current;
      const idx = snapshot.findIndex((c) => toUtc(c.time) === param.time);
      const isLastBar = idx === snapshot.length - 1;
      const row = idx >= 0 ? snapshot[idx] : null;

      setHoveredTime(timeMs);
      setHoveredBar({
        open: candle.open,
        high: candle.high ?? candle.open,
        low: candle.low ?? candle.open,
        close: isLastBar && live && ticker?.lastPrice != null ? ticker.lastPrice : (candle.close ?? candle.open),
        volume: row?.volume,
      });
    });

    const ro = new ResizeObserver(() => {
      if (el.clientWidth > 0) {
        chart.applyOptions({ width: el.clientWidth });
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      volumeSeriesRef.current = null;
      fastMaSeriesRef.current = null;
      slowMaSeriesRef.current = null;
      priceLineRef.current = null;
      entryLinesRef.current = [];
      seededRef.current = false;
      lastBarTimeRef.current = null;
      firstBarTimeRef.current = null;
      atRealtimeRef.current = true;
      historyRequestedRef.current = false;
    };
  }, [
    hasData,
    height,
    markersKey,
    entryLinesKey,
    highlightTradeId,
    fastPeriod,
    slowPeriod,
    live,
    interval,
    activeInterval,
    maVisible,
    onNeedMoreHistory,
  ]);

  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    const chart = chartRef.current;
    if (!candleSeries || !volumeSeries || !chart || candles.length === 0 || !seededRef.current) {
      return;
    }

    const last = candles[candles.length - 1];
    const first = candles[0];
    const lastTime = toUtc(last.time);
    const liveClose = ticker?.lastPrice ?? last.close;
    const prevBarTime = lastBarTimeRef.current;
    const historyPrepended = first?.time !== firstBarTimeRef.current;

    if (prevBarTime == null || candles.length === 1 || historyPrepended) {
      candleSeries.setData(
        candles.map((c) => ({
          time: toUtc(c.time),
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        })),
      );
      volumeSeries.setData(
        candles.map((c) => ({
          time: toUtc(c.time),
          value: c.volume ?? 0,
          color: c.close >= c.open ? "rgba(38, 166, 154, 0.55)" : "rgba(239, 83, 80, 0.55)",
        })),
      );
      if (maVisible && fastMaSeriesRef.current) {
        fastMaSeriesRef.current.setData(maSeriesData(candles, "fastMa"));
      }
      if (maVisible && slowMaSeriesRef.current) {
        slowMaSeriesRef.current.setData(maSeriesData(candles, "slowMa"));
      }
      lastBarTimeRef.current = last.time;
      firstBarTimeRef.current = first?.time ?? null;
    } else if (last.time === prevBarTime) {
      candleSeries.update({
        time: lastTime,
        open: last.open,
        high: Math.max(last.high, liveClose),
        low: Math.min(last.low, liveClose),
        close: liveClose,
      });
      volumeSeries.update({
        time: lastTime,
        value: last.volume ?? 0,
        color: liveClose >= last.open ? "rgba(38, 166, 154, 0.55)" : "rgba(239, 83, 80, 0.55)",
      });
      if (maVisible && last.fastMa != null) {
        fastMaSeriesRef.current?.update({ time: lastTime, value: last.fastMa });
      }
      if (maVisible && last.slowMa != null) {
        slowMaSeriesRef.current?.update({ time: lastTime, value: last.slowMa });
      }
    } else if (last.time > prevBarTime) {
      candleSeries.update({
        time: lastTime,
        open: last.open,
        high: last.high,
        low: last.low,
        close: liveClose,
      });
      volumeSeries.update({
        time: lastTime,
        value: last.volume ?? 0,
        color: liveClose >= last.open ? "rgba(38, 166, 154, 0.55)" : "rgba(239, 83, 80, 0.55)",
      });
      lastBarTimeRef.current = last.time;
      if (maVisible && fastMaSeriesRef.current) {
        fastMaSeriesRef.current.setData(maSeriesData(candles, "fastMa"));
      }
      if (maVisible && slowMaSeriesRef.current) {
        slowMaSeriesRef.current.setData(maSeriesData(candles, "slowMa"));
      }
    }

    if (live && priceLineRef.current) {
      priceLineRef.current.applyOptions({
        price: liveClose,
        color: liveClose >= last.open ? BULL : BEAR,
      });
      if (atRealtimeRef.current) {
        chart.timeScale().scrollToRealTime();
      }
    }
  }, [candles, live, ticker?.lastPrice, maVisible]);

  function zoomChart(factor: number) {
    const chart = chartRef.current;
    if (!chart) return;
    const range = chart.timeScale().getVisibleLogicalRange();
    if (!range) return;
    const center = (range.from + range.to) / 2;
    const span = Math.max(10, (range.to - range.from) * factor);
    chart.timeScale().setVisibleLogicalRange({
      from: center - span / 2,
      to: center + span / 2,
    });
  }

  function fitChart() {
    chartRef.current?.timeScale().fitContent();
  }

  function goToRealtime() {
    const chart = chartRef.current;
    if (!chart) return;
    chart.timeScale().scrollToRealTime();
    atRealtimeRef.current = true;
    setAtRealtime(true);
  }

  async function toggleFullscreen() {
    const el = rootRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen();
      setFullscreen(true);
    } else {
      await document.exitFullscreen();
      setFullscreen(false);
    }
  }

  useEffect(() => {
    function onFullscreenChange() {
      setFullscreen(Boolean(document.fullscreenElement));
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth });
      }
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  if (candles.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-slate-400">No chart data available.</p>;
  }

  const isUp = displayLegend ? displayLegend.close >= displayLegend.open : true;
  const lastPrice = displayLegend?.close ?? 0;
  const closeFlashClass =
    flashUp === true
      ? "animate-pulse text-[#26a69a]"
      : flashUp === false
        ? "animate-pulse text-[#ef5350]"
        : isUp
          ? "text-[#26a69a]"
          : "text-[#ef5350]";

  const timeLabel = isHovering && hoveredTime
    ? formatBarTime(hoveredTime, activeInterval ? isShortInterval(activeInterval) : false)
    : lastCandle
      ? formatBarTime(lastCandle.time, activeInterval ? isShortInterval(activeInterval) : false)
      : null;

  return (
    <div ref={rootRef} className="overflow-hidden rounded-lg border border-[#2a2e39] bg-[#131722]">
      <div className="border-b border-[#2a2e39] px-3 py-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-[#d1d4dc]">{symbol}/USDT</span>
            <span className="rounded bg-[#2a2e39] px-1.5 py-0.5 text-[10px] font-medium text-[#787b86]">
              {interval}
            </span>
            {live && (
              <span className="flex items-center gap-1.5 rounded bg-[#2a2e39] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#d1d4dc]">
                <span
                  className={`h-1.5 w-1.5 rounded-full ${connected ? "animate-pulse bg-[#26a69a]" : "bg-[#787b86]"}`}
                />
                Live
              </span>
            )}
            {timeLabel && (
              <span className="text-[10px] text-[#787b86]">
                {isHovering ? timeLabel : `Current · ${timeLabel}`}
              </span>
            )}
          </div>

          {live && currentBar && !isHovering && (
            <div className="flex items-baseline gap-2">
              <span className={`text-lg font-bold tabular-nums ${closeFlashClass}`}>
                {formatPriceUsd(ticker?.lastPrice ?? currentBar.close)}
              </span>
              {prevCloseChangePct != null && (
                <span className={prevCloseChangePct >= 0 ? "text-[#26a69a]" : "text-[#ef5350]"}>
                  {prevCloseChangePct >= 0 ? "+" : ""}
                  {prevCloseChangePct.toFixed(2)}%
                </span>
              )}
              {ticker && (
                <span className="text-[10px] text-[#787b86]">
                  24h {ticker.change24hPct >= 0 ? "+" : ""}
                  {ticker.change24hPct.toFixed(2)}%
                </span>
              )}
            </div>
          )}
        </div>

        {displayLegend && (
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <span className="text-[#787b86]">
              O{" "}
              <span className={isUp ? "text-[#26a69a]" : "text-[#ef5350]"}>
                {formatPriceUsd(displayLegend.open)}
              </span>
            </span>
            <span className="text-[#787b86]">
              H <span className="text-[#d1d4dc]">{formatPriceUsd(displayLegend.high)}</span>
            </span>
            <span className="text-[#787b86]">
              L <span className="text-[#d1d4dc]">{formatPriceUsd(displayLegend.low)}</span>
            </span>
            <span className="text-[#787b86]">
              {isHovering ? "C" : "Last"}{" "}
              <span className={closeFlashClass}>{formatPriceUsd(lastPrice)}</span>
            </span>
            {barChangePct != null && (
              <span className={isUp ? "text-[#26a69a]" : "text-[#ef5350]"}>
                {barChangePct >= 0 ? "+" : ""}
                {barChangePct.toFixed(2)}%
              </span>
            )}
            {displayLegend.volume != null && (
              <span className="text-[#787b86]">
                Vol <span className="text-[#d1d4dc]">{formatVolume(displayLegend.volume)}</span>
              </span>
            )}
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2a2e39] px-3 py-1.5">
        {onIntervalChange && activeInterval ? (
          <div className="flex flex-wrap gap-1">
            {CHART_INTERVALS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onIntervalChange(item.id)}
                className={cn(
                  "cursor-pointer rounded px-2.5 py-1 text-[11px] font-semibold transition-colors",
                  activeInterval === item.id
                    ? "bg-[#2962ff] text-white"
                    : "text-[#787b86] hover:bg-[#2a2e39] hover:text-[#d1d4dc]",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        ) : (
          <span />
        )}

        <div className="flex flex-wrap items-center gap-1">
          {live && candles.some((c) => c.fastMa != null) && (
            <button
              type="button"
              onClick={() => setMaVisible((v) => !v)}
              className={cn(
                "cursor-pointer rounded px-2 py-1 text-[10px] font-semibold",
                maVisible ? "bg-[#2a2e39] text-[#d1d4dc]" : "text-[#787b86] hover:bg-[#2a2e39]",
              )}
            >
              MA
            </button>
          )}
          <button
            type="button"
            onClick={() => zoomChart(0.75)}
            className="cursor-pointer rounded p-1.5 text-[#787b86] hover:bg-[#2a2e39] hover:text-[#d1d4dc]"
            aria-label="Zoom in"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => zoomChart(1.35)}
            className="cursor-pointer rounded p-1.5 text-[#787b86] hover:bg-[#2a2e39] hover:text-[#d1d4dc]"
            aria-label="Zoom out"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={fitChart}
            className="cursor-pointer rounded p-1.5 text-[#787b86] hover:bg-[#2a2e39] hover:text-[#d1d4dc]"
            aria-label="Fit chart"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          {live && !atRealtime && (
            <button
              type="button"
              onClick={goToRealtime}
              className="flex cursor-pointer items-center gap-1 rounded bg-[#2962ff] px-2 py-1 text-[10px] font-semibold text-white"
            >
              <Target className="h-3 w-3" />
              Live
            </button>
          )}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="cursor-pointer rounded p-1.5 text-[#787b86] hover:bg-[#2a2e39] hover:text-[#d1d4dc]"
            aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {loadingMore && (
        <p className="border-b border-[#2a2e39] px-3 py-1 text-[10px] text-[#787b86]">
          Loading older candles…
        </p>
      )}

      <div ref={containerRef} className="w-full" style={{ height: fullscreen ? "calc(100vh - 8rem)" : height }} />
      {(markers.length > 0 || (maVisible && candles.some((c) => c.fastMa != null))) && (
        <div className="flex flex-wrap gap-4 border-t border-[#2a2e39] px-3 py-2 text-[11px] text-[#787b86]">
          {candles.some((c) => c.fastMa != null) && (
            <>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 bg-[#2962ff]" /> MA {fastPeriod}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-0.5 w-4 bg-[#e040fb]" /> MA {slowPeriod}
              </span>
            </>
          )}
          {markers.length > 0 && (
            <>
              <span className="flex items-center gap-1.5">
                <span className="text-green-500">▲</span> BUY
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-red-500">▼</span> SELL
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
