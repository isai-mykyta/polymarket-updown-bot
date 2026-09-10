import axios, { AxiosRequestConfig } from "axios";
import qs from "qs";

type ApiClientOptions = {
  baseUrl: string;
}

type HttpRequestOptions<D> = {
  method: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
  path: string;
  params?: any;
  headers?: Record<string, unknown>;
  data?: D;
}

export abstract class ApiClient {
  protected readonly baseUrl: string;

  constructor (options: ApiClientOptions) {
    this.baseUrl = options.baseUrl;
  }

  private serializeParams(params: Record<string, any>): string {
    return qs.stringify(params, { arrayFormat: "comma", encode: false });
  }

  private async request<D, R>(options: HttpRequestOptions<D>): Promise<R> {
    const config: AxiosRequestConfig = {
      url: options.path,
      method: options.method,
      baseURL: this.baseUrl,
      params: options.params,
      data: options.data,
      paramsSerializer: this.serializeParams
    };

    if (options.headers) {
      config.headers = {
        ...options.headers,
        "Accept": "*/*",
        "Connection": "keep-alive",
        "Content-Type": "application/json"
      };
    }

    const response = await axios.request(config);
    return response.data;
  }

  protected async get<R>(options: Omit<HttpRequestOptions<any>, "method" | "data">): Promise<R> {
    return this.request({ ...options, method: "GET" });
  }

  protected async post<R>(options: Omit<HttpRequestOptions<any>, "method">): Promise<R> {
    return this.request({ ...options, method: "POST" });
  }
}
