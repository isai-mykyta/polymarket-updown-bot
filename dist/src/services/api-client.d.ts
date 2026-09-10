type ApiClientOptions = {
    baseUrl: string;
};
type HttpRequestOptions<D> = {
    method: "GET" | "POST" | "PATCH" | "DELETE" | "PUT";
    path: string;
    params?: any;
    headers?: Record<string, unknown>;
    data?: D;
};
export declare abstract class ApiClient {
    protected readonly baseUrl: string;
    constructor(options: ApiClientOptions);
    private serializeParams;
    private request;
    protected get<R>(options: Omit<HttpRequestOptions<any>, "method" | "data">): Promise<R>;
    protected post<R>(options: Omit<HttpRequestOptions<any>, "method">): Promise<R>;
}
export {};
