"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchMarketCandles } from "@/lib/api";
import { attachMovingAverages } from "@/lib/chart-ma";
import {
  candleLimitForInterval,
  type ChartInterval,
} from "@/lib/chart-intervals";
import type { BrokerCandle } from "@/components/charts/broker-candlestick-chart";

export interface LiveTickerSnapshot {
  lastPrice: number;
  change24hPct: number;
  volume24h: number;
}

const FAST_MA = 9;
const SLOW_MA = 21;

function streamSymbol(symbol: string) {
  const base = symbol.toUpperCase() === "BNB" ? "bnb" : symbol.toLowerCase();
  return `${base}usdt`;
}

interface BinanceKline {
  t: number;
  o: string;
  h: string;
  l: string;
  c: string;
  v: string;
}

function klineToCandle(k: BinanceKline): BrokerCandle {
  return {
    time: k.t,
    open: parseFloat(k.o),
    high: parseFloat(k.h),
    low: parseFloat(k.l),
    close: parseFloat(k.c),
    volume: parseFloat(k.v),
  };
}

function withMa(candles: BrokerCandle[]): BrokerCandle[] {
  return attachMovingAverages(candles, FAST_MA, SLOW_MA);
}

function mergeCandleLists(existing: BrokerCandle[], incoming: BrokerCandle[]): BrokerCandle[] {
  const map = new Map<number, BrokerCandle>();
  for (const candle of existing) map.set(candle.time, candle);
  for (const candle of incoming) map.set(candle.time, candle);
  return [...map.values()].sort((a, b) => a.time - b.time);
}

export function useLiveCandles(symbol = "BNB", interval: ChartInterval = "1h") {
  const limit = candleLimitForInterval(interval);
  const [candles, setCandles] = useState<BrokerCandle[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [ticker, setTicker] = useState<LiveTickerSnapshot | null>(null);
  const candlesRef = useRef<BrokerCandle[]>([]);
  const loadingMoreRef = useRef(false);

  const applyCandles = useCallback((next: BrokerCandle[]) => {
    const withMovingAverages = withMa(next);
    candlesRef.current = withMovingAverages;
    setCandles(withMovingAverages);
  }, []);

  const mergeCandle = useCallback(
    (incoming: BrokerCandle) => {
      setCandles((prev) => {
        const next = [...prev];
        const idx = next.findIndex((c) => c.time === incoming.time);

        if (idx >= 0) {
          next[idx] = { ...next[idx], ...incoming };
        } else if (next.length === 0 || incoming.time > next[next.length - 1].time) {
          next.push(incoming);
        } else {
          return prev;
        }

        const withMovingAverages = withMa(next);
        candlesRef.current = withMovingAverages;
        return withMovingAverages;
      });
    },
    [],
  );

  const patchLastPrice = useCallback((price: number) => {
    setCandles((prev) => {
      if (prev.length === 0) return prev;
      const next = [...prev];
      const last = { ...next[next.length - 1] };
      last.close = price;
      last.high = Math.max(last.high, price);
      last.low = Math.min(last.low, price);
      const withMovingAverages = withMa(next);
      candlesRef.current = withMovingAverages;
      return withMovingAverages;
    });
  }, []);

  const loadMoreHistory = useCallback(async () => {
    if (loadingMoreRef.current || !hasMoreHistory || candlesRef.current.length === 0) {
      return;
    }

    loadingMoreRef.current = true;
    setLoadingMore(true);

    try {
      const first = candlesRef.current[0];
      const older = await fetchMarketCandles(symbol, limit, interval, first.time - 1);
      if (older.length === 0) {
        setHasMoreHistory(false);
        return;
      }

      const merged = mergeCandleLists(candlesRef.current, older);
      applyCandles(merged);
      if (older.length < limit) {
        setHasMoreHistory(false);
      }
    } catch {
      // keep existing candles on history load failure
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [applyCandles, hasMoreHistory, interval, limit, symbol]);

  useEffect(() => {
    let cancelled = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    setCandles([]);
    candlesRef.current = [];
    setConnected(false);
    setTicker(null);
    setHasMoreHistory(true);

    async function bootstrap() {
      setLoading(true);
      setError(null);

      try {
        const data = await fetchMarketCandles(symbol, limit, interval);
        if (cancelled) return;
        applyCandles(data);
        setHasMoreHistory(data.length >= limit);
        const last = data[data.length - 1];
        if (last) {
          setTicker({
            lastPrice: last.close,
            change24hPct: 0,
            volume24h: last.volume ?? 0,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load market data");
        }
        return;
      } finally {
        if (!cancelled) setLoading(false);
      }

      if (cancelled) return;

      function connect() {
        const pair = streamSymbol(symbol);
        const url = `wss://stream.binance.com:9443/stream?streams=${pair}@kline_${interval}/${pair}@miniTicker`;

        ws = new WebSocket(url);

        ws.onopen = () => {
          if (!cancelled) setConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const envelope = JSON.parse(event.data as string);
            const payload = envelope.data;
            if (!payload) return;

            if (payload.e === "kline" && payload.k) {
              mergeCandle(klineToCandle(payload.k));
            } else if (payload.e === "24hrMiniTicker") {
              const lastPrice = parseFloat(payload.c);
              const change24hPct = parseFloat(payload.P ?? payload.p ?? "0");
              const volume24h = parseFloat(payload.v ?? "0");
              if (Number.isFinite(lastPrice)) {
                patchLastPrice(lastPrice);
                setTicker({
                  lastPrice,
                  change24hPct: Number.isFinite(change24hPct) ? change24hPct : 0,
                  volume24h: Number.isFinite(volume24h) ? volume24h : 0,
                });
              }
            }
          } catch {
            // ignore malformed frames
          }
        };

        ws.onclose = () => {
          setConnected(false);
          if (!cancelled) {
            reconnectTimer = setTimeout(connect, 2500);
          }
        };

        ws.onerror = () => ws?.close();
      }

      connect();
    }

    bootstrap();

    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
      setConnected(false);
    };
  }, [symbol, interval, limit, mergeCandle, patchLastPrice, applyCandles]);

  return {
    candles,
    loading,
    loadingMore,
    error,
    connected,
    interval,
    ticker,
    loadMoreHistory,
    hasMoreHistory,
    fastMaPeriod: FAST_MA,
    slowMaPeriod: SLOW_MA,
  };
}
