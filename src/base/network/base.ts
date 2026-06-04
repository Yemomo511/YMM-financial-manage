import axios, { AxiosError } from 'axios';

import type {
  AxiosAdapter,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  RawAxiosRequestHeaders,
} from 'axios';

export type YFHttpMethod = 'DELETE' | 'GET' | 'PATCH' | 'POST' | 'PUT';

export interface YFRequestConfig<TData = unknown> {
  data?: TData;
  headers?: Record<string, string>;
  method: YFHttpMethod;
  params?: Record<string, unknown>;
  timeoutMs?: number;
  url: string;
}

export interface YFResponse<TData = unknown> {
  data: TData;
  headers: Record<string, unknown>;
  status: number;
}

export interface YFNetworkMiddleware {
  onError?: (error: YFNetworkError) => Promise<YFNetworkError | void> | YFNetworkError | void;
  onRequest?: <TData>(config: YFRequestConfig<TData>) => Promise<YFRequestConfig<TData>> | YFRequestConfig<TData>;
  onResponse?: <TData>(response: YFResponse<TData>) => Promise<YFResponse<TData>> | YFResponse<TData>;
}

export interface YFNetworkPlugin {
  name: string;
  setup: (client: YFNetworkClient) => void;
}

export interface YFNetworkClient {
  request: <TResponse, TData = unknown>(config: YFRequestConfig<TData>) => Promise<YFResponse<TResponse>>;
  use: (middleware: YFNetworkMiddleware) => void;
  usePlugin: (plugin: YFNetworkPlugin) => void;
}

export interface YFNetworkClientOptions {
  adapter?: AxiosAdapter;
  baseURL?: string;
  headers?: Record<string, string>;
  middlewares?: YFNetworkMiddleware[];
  plugins?: YFNetworkPlugin[];
  timeoutMs?: number;
}

interface YFNetworkErrorOptions {
  cause?: unknown;
  code?: string;
  status?: number;
  url?: string;
}

export class YFNetworkError extends Error {
  readonly code?: string;
  readonly status?: number;
  readonly url?: string;

  constructor(message: string, options: YFNetworkErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.name = 'YFNetworkError';
    this.code = options.code;
    this.status = options.status;
    this.url = options.url;
  }
}

class AxiosYFNetworkClient implements YFNetworkClient {
  private readonly axiosInstance: AxiosInstance;
  private readonly middlewares: YFNetworkMiddleware[] = [];

  constructor(options: YFNetworkClientOptions = {}) {
    this.axiosInstance = axios.create({
      adapter: options.adapter,
      baseURL: options.baseURL,
      headers: options.headers,
      timeout: options.timeoutMs,
    });

    for (const middleware of options.middlewares ?? []) {
      this.use(middleware);
    }

    for (const plugin of options.plugins ?? []) {
      this.usePlugin(plugin);
    }
  }

  async request<TResponse, TData = unknown>(config: YFRequestConfig<TData>): Promise<YFResponse<TResponse>> {
    let nextConfig = config;

    for (const middleware of this.middlewares) {
      if (middleware.onRequest) {
        nextConfig = await middleware.onRequest(nextConfig);
      }
    }

    try {
      const response = await this.axiosInstance.request<TResponse, AxiosResponse<TResponse>, TData>(
        this.toAxiosConfig(nextConfig),
      );
      let yfResponse = this.toYFResponse(response);

      for (const middleware of this.middlewares) {
        if (middleware.onResponse) {
          yfResponse = await middleware.onResponse(yfResponse);
        }
      }

      return yfResponse;
    } catch (error) {
      throw await this.handleError(error, nextConfig.url);
    }
  }

  use(middleware: YFNetworkMiddleware): void {
    this.middlewares.push(middleware);
  }

  usePlugin(plugin: YFNetworkPlugin): void {
    plugin.setup(this);
  }

  private async handleError(error: unknown, fallbackUrl: string): Promise<YFNetworkError> {
    let nextError = this.toYFNetworkError(error, fallbackUrl);

    for (const middleware of this.middlewares) {
      if (middleware.onError) {
        nextError = (await middleware.onError(nextError)) ?? nextError;
      }
    }

    return nextError;
  }

  private toAxiosConfig<TData>(config: YFRequestConfig<TData>): AxiosRequestConfig<TData> {
    return {
      data: config.data,
      headers: config.headers as RawAxiosRequestHeaders | undefined,
      method: config.method,
      params: config.params,
      timeout: config.timeoutMs,
      url: config.url,
    };
  }

  private toYFNetworkError(error: unknown, fallbackUrl: string): YFNetworkError {
    if (error instanceof YFNetworkError) {
      return error;
    }

    if (error instanceof AxiosError) {
      const url = error.config?.url ?? fallbackUrl;
      const message = error.response
        ? `Network request failed with status ${error.response.status}: ${url}`
        : `Network request failed: ${url}`;

      return new YFNetworkError(message, {
        cause: error,
        code: error.code,
        status: error.response?.status,
        url,
      });
    }

    return new YFNetworkError(`Network request failed: ${fallbackUrl}`, {
      cause: error,
      url: fallbackUrl,
    });
  }

  private toYFResponse<TData>(response: AxiosResponse<TData>): YFResponse<TData> {
    return {
      data: response.data,
      headers: response.headers as Record<string, unknown>,
      status: response.status,
    };
  }
}

export function createYFNetworkClient(options?: YFNetworkClientOptions): YFNetworkClient {
  return new AxiosYFNetworkClient(options);
}

export const yfNetworkClient = createYFNetworkClient();
