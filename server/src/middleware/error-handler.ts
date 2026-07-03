import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../lib/http";

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.status(error.status).json({
      message: error.message,
      details: error.details
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      message: "Invalid request.",
      details: error.flatten()
    });
    return;
  }

  console.error(error);
  res.status(500).json({
    message: "Unexpected server error."
  });
};

