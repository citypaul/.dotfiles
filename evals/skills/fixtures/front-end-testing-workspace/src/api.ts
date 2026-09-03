export type SignupRequest = {
  readonly fullName: string;
  readonly email: string;
};

export type SignupResponse = {
  readonly id: string;
};

export type OrderLineRequest = {
  readonly sku: string;
  readonly quantity: number;
};

export type OrderRequest = {
  readonly lines: ReadonlyArray<OrderLineRequest>;
};

export type OrderResponse = {
  readonly reference: string;
};

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const endpoint = (path: string): string =>
  new URL(path, window.location.origin).toString();

const postJson = async <T>(path: string, body: unknown): Promise<T> => {
  const response = await fetch(endpoint(path), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new ApiError(
      response.status,
      `POST ${path} failed with ${response.status}`,
    );
  }
  return (await response.json()) as T;
};

export const createSignup = (request: SignupRequest): Promise<SignupResponse> =>
  postJson<SignupResponse>("/api/signups", request);

export const placeOrder = (request: OrderRequest): Promise<OrderResponse> =>
  postJson<OrderResponse>("/api/orders", request);
