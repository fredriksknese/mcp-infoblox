export interface InfobloxConfig {
  host: string;
  username: string;
  password: string;
  wapiVersion: string;
  allowSelfSigned: boolean;
}

export class InfobloxClient {
  private baseUrl: string;
  private authHeader: string;

  constructor(private config: InfobloxConfig) {
    this.baseUrl = `https://${config.host}/wapi/v${config.wapiVersion}`;
    this.authHeader = `Basic ${Buffer.from(`${config.username}:${config.password}`).toString("base64")}`;

    if (config.allowSelfSigned) {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
    }
  }

  private async request(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string>,
  ): Promise<unknown> {
    const url = new URL(`${this.baseUrl}/${path}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        url.searchParams.set(key, value);
      }
    }

    const options: RequestInit = {
      method,
      headers: {
        Authorization: this.authHeader,
        "Content-Type": "application/json",
      },
    };

    if (body && (method === "POST" || method === "PUT")) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url.toString(), options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Infoblox API error (${response.status}): ${errorText}`,
      );
    }

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return response.json();
    }
    return response.text();
  }

  async get(
    objectType: string,
    params?: Record<string, string>,
  ): Promise<unknown[]> {
    return this.request("GET", objectType, undefined, params) as Promise<
      unknown[]
    >;
  }

  async getByRef(
    ref: string,
    params?: Record<string, string>,
  ): Promise<unknown> {
    return this.request("GET", ref, undefined, params);
  }

  async create(
    objectType: string,
    data: Record<string, unknown>,
  ): Promise<string> {
    return this.request("POST", objectType, data) as Promise<string>;
  }

  async update(
    ref: string,
    data: Record<string, unknown>,
  ): Promise<string> {
    return this.request("PUT", ref, data) as Promise<string>;
  }

  async delete(ref: string): Promise<string> {
    return this.request("DELETE", ref) as Promise<string>;
  }

  async callFunction(
    ref: string,
    functionName: string,
    data?: Record<string, unknown>,
  ): Promise<unknown> {
    const params: Record<string, string> = { _function: functionName };
    return this.request("POST", ref, data, params);
  }
}
