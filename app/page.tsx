'use client';

import React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface MarketQuotePayload {
  name?: string;
  lastPrice: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  prevClose: number;
  volume: number;
  turnover: number;
  changeAmount: number;
  changePercent: number;
}

interface MarketQuoteEnvelope {
  eventId: string;
  topic: 'market.stock.tick';
  symbol: string;
  traceId: string;
  publishedAt: string;
  payload: MarketQuotePayload;
}

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export default function MarketDashboardPage() {
  const [symbolsText, setSymbolsText] = useState('600519.SH,000001.SZ');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [quotes, setQuotes] = useState<Record<string, MarketQuoteEnvelope>>({});
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const quoteRows = useMemo(() => {
    return Object.values(quotes).sort((left, right) => left.symbol.localeCompare(right.symbol));
  }, [quotes]);

  const getSymbols = useCallback(() => {
    return symbolsText
      .split(',')
      .map((symbol) => symbol.trim())
      .filter(Boolean);
  }, [symbolsText]);

  const subscribe = useCallback(() => {
    const socket = socketRef.current;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(JSON.stringify({
      type: 'subscribe',
      topics: ['market.stock.tick'],
      symbols: getSymbols(),
    }));
  }, [getSymbols]);

  const renderHeader = useCallback(() => {
    const statusText = {
      connecting: '连接中',
      connected: '已连接',
      disconnected: '已断开，重连中',
    }[connectionStatus];

    return (
      <header>
        <h1>A 股实时行情看板</h1>
        <div className="status">
          <span className={`dot ${connectionStatus === 'connected' ? 'connected' : ''}`} />
          <span>{statusText}</span>
        </div>
      </header>
    );
  }, [connectionStatus]);

  const renderToolbar = useCallback(() => {
    return (
      <section className="toolbar" aria-label="订阅设置">
        <input
          aria-label="股票代码"
          value={symbolsText}
          onChange={(event) => setSymbolsText(event.target.value)}
        />
        <button type="button" onClick={subscribe}>订阅</button>
      </section>
    );
  }, [subscribe, symbolsText]);

  const renderQuoteItem = useCallback((quote: MarketQuoteEnvelope) => {
    const direction = quote.payload.changeAmount >= 0 ? 'up' : 'down';

    return (
      <tr key={quote.symbol}>
        <td>{quote.symbol}</td>
        <td>{quote.payload.name ?? quote.symbol}</td>
        <td>{quote.payload.lastPrice.toFixed(2)}</td>
        <td className={direction}>{quote.payload.changeAmount.toFixed(2)}</td>
        <td className={direction}>{quote.payload.changePercent.toFixed(3)}%</td>
        <td>{quote.payload.volume.toLocaleString('zh-CN')}</td>
        <td>{quote.traceId}</td>
        <td>{new Date(quote.publishedAt).toLocaleTimeString('zh-CN')}</td>
      </tr>
    );
  }, []);

  const renderQuoteList = useCallback(() => {
    if (quoteRows.length === 0) {
      return (
        <tr>
          <td className="empty" colSpan={8}>等待实时行情推送</td>
        </tr>
      );
    }

    return quoteRows.map((quote) => renderQuoteItem(quote));
  }, [quoteRows, renderQuoteItem]);

  const renderQuoteTable = useCallback(() => {
    return (
      <section className="table-wrap" aria-label="实时行情">
        <table>
          <thead>
            <tr>
              <th>代码</th>
              <th>名称</th>
              <th>最新价</th>
              <th>涨跌额</th>
              <th>涨跌幅</th>
              <th>成交量</th>
              <th>Trace ID</th>
              <th>推送时间</th>
            </tr>
          </thead>
          <tbody>{renderQuoteList()}</tbody>
        </table>
      </section>
    );
  }, [renderQuoteList]);

  useEffect(() => {
    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${protocol}//${window.location.host}/ws/market`);
      socketRef.current = socket;
      setConnectionStatus('connecting');

      socket.addEventListener('open', () => {
        setConnectionStatus('connected');
        subscribe();
      });

      socket.addEventListener('close', () => {
        setConnectionStatus('disconnected');
        reconnectTimerRef.current = setTimeout(connect, 1500);
      });

      socket.addEventListener('message', (event) => {
        const envelope = JSON.parse(event.data) as MarketQuoteEnvelope;

        if (envelope.topic !== 'market.stock.tick') {
          return;
        }

        setQuotes((currentQuotes) => ({
          ...currentQuotes,
          [envelope.symbol]: envelope,
        }));
      });
    };

    connect();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }

      socketRef.current?.close();
    };
  }, [subscribe]);

  return (
    <main>
      {renderHeader()}
      {renderToolbar()}
      {renderQuoteTable()}
    </main>
  );
}
