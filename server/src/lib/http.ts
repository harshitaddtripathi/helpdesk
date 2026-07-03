import type { NextFunction, Request, RequestHandler, Response } from "express";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message);
  }
}

type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<unknown>;

export function asyncHandler(handler: AsyncRouteHandler): RequestHandler {
  return (req, res, next) => {
    void handler(req, res, next).catch(next);
  };
}

export function requireStringParam(
  value: string | string[] | undefined,
  name: string
) {
  if (typeof value === "string" && value.length > 0) {
    return value;
  }

  throw new HttpError(400, `Missing or invalid route parameter: ${name}.`);
}
