export interface ServiceEventEnvelope<TPayload> {
  eventId: string;
  topic: string;
  source: string;
  traceId: string;
  occurredAt: string;
  payload: TPayload;
}

export interface ServerBroadcastPayload<TPayload> {
  channel: string;
  data: TPayload;
}

export interface AiUnderstandingPayload {
  symbol?: string;
  summary: string;
  sourceTopic: string;
}

export interface AiDecisionPayload {
  symbol?: string;
  action: 'hold' | 'observe';
  reason: string;
}
