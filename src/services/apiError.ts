/**
 * Cloud Security Monitor — Centralized API Error Handling
 * Production-ready typed errors for Microsoft Azure backend integration
 */

export interface ApiErrorDetails {
  status?: number;
  statusText?: string;
  code?: string;
  endpoint?: string;
  raw?: unknown;
  timestamp: string;
}

export class ApiError extends Error {
  public readonly status?: number;
  public readonly code?: string;
  public readonly details?: unknown;
  public readonly isNetworkError: boolean;
  public readonly isAuthError: boolean;
  public readonly userMessage: string;
  public readonly timestamp: string;

  constructor(
    message: string,
    options: {
      status?: number;
      code?: string;
      details?: unknown;
      userMessage?: string;
      isNetworkError?: boolean;
    } = {}
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    this.isNetworkError = options.isNetworkError ?? false;
    this.isAuthError = options.status === 401 || options.status === 403;
    this.timestamp = new Date().toISOString();
    this.userMessage = options.userMessage || ApiError.getDefaultUserMessage(options.status, options.isNetworkError);

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /**
   * Generates a clear, user-facing error message based on HTTP status or error condition
   */
  public static getDefaultUserMessage(status?: number, isNetworkError?: boolean): string {
    if (isNetworkError) {
      return 'Unable to connect to the Azure backend service. Please verify that the API server is online and CORS is configured.';
    }

    switch (status) {
      case 400:
        return 'Invalid request parameters. Please verify your query filters and input fields.';
      case 401:
        return 'Authentication required. Your session may have expired — please sign in again via Microsoft Entra ID.';
      case 403:
        return 'Access denied. Your account lacks sufficient Azure RBAC role permissions to access this security resource.';
      case 404:
        return 'The requested security resource or API endpoint was not found on the Azure backend.';
      case 408:
        return 'The Azure API request timed out before receiving a response.';
      case 429:
        return 'Too many requests. Azure rate limit exceeded — please wait a moment before retrying.';
      case 500:
        return 'Internal Azure backend error. The server encountered an unexpected error while processing security events.';
      case 502:
        return 'Bad Gateway. The Azure API Gateway or reverse proxy could not reach the upstream service.';
      case 503:
        return 'Azure backend service unavailable. The service may be under maintenance or restarting.';
      case 504:
        return 'Gateway Timeout. Upstream Azure service failed to respond within the allowed time limit.';
      default:
        return 'An unexpected error occurred while communicating with the Azure backend.';
    }
  }

  /**
   * Converts any thrown error or response into a typed ApiError
   */
  public static fromError(error: unknown): ApiError {
    if (error instanceof ApiError) {
      return error;
    }

    if (typeof error === 'object' && error !== null) {
      const maybeAxios = error as {
        isAxiosError?: boolean;
        response?: { status: number; statusText: string; data: unknown };
        code?: string;
        message?: string;
      };

      if (maybeAxios.isAxiosError) {
        const status = maybeAxios.response?.status;
        const responseData = maybeAxios.response?.data;
        const isNetwork = !maybeAxios.response && (maybeAxios.code === 'ERR_NETWORK' || maybeAxios.code === 'ECONNABORTED');

        let extractedMessage = maybeAxios.message || 'API request failed';
        if (responseData && typeof responseData === 'object') {
          const dataObj = responseData as Record<string, unknown>;
          if (typeof dataObj.message === 'string') {
            extractedMessage = dataObj.message;
          } else if (typeof dataObj.error === 'string') {
            extractedMessage = dataObj.error;
          }
        }

        return new ApiError(extractedMessage, {
          status,
          code: maybeAxios.code,
          details: responseData,
          isNetworkError: isNetwork,
          userMessage: ApiError.getDefaultUserMessage(status, isNetwork),
        });
      }

      if ('message' in error && typeof (error as { message: unknown }).message === 'string') {
        return new ApiError((error as { message: string }).message);
      }
    }

    return new ApiError(String(error) || 'An unknown error occurred.');
  }
}
