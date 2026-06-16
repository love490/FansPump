export class AdminAuthError extends Error {
    constructor(
      message: string,
      public statusCode: number = 401
    ) {
      super(message);
      this.name = "AdminAuthError";
    }
  }
  
  export function isAdminAuthError(err: unknown): err is AdminAuthError {
    return err instanceof AdminAuthError;
  }