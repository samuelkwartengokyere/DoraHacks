"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

interface EligibleTokenSelectProps {
  id?: string;
  value: string;
  onChange: (symbol: string) => void;
  className?: string;
}

export function EligibleTokenSelect({ id = "token", value, onChange, className }: EligibleTokenSelectProps) {
  const [symbols, setSymbols] = useState<string[]>(["BNB", "CAKE", "ETH", "USDT"]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getEligibleTokens()
      .then((res) => {
        if (res.symbols?.length) setSymbols(res.symbols);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={className}>
      <Label htmlFor={id}>Eligible token (Track 1 competition)</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        className="mt-1.5 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
      >
        {symbols.map((sym) => (
          <option key={sym} value={sym}>
            {sym}
          </option>
        ))}
      </select>
      <p className="mt-1 text-xs text-slate-500">149 BEP-20 symbols listed on CoinMarketCap</p>
    </div>
  );
}
