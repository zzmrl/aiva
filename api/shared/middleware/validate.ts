import type { RequestHandler } from "express";
import type { z } from "zod";
import { ValidationError } from "../errors";

type SchemaConfig<
  TBody extends z.ZodTypeAny = z.ZodTypeAny,
  TQuery extends z.ZodTypeAny = z.ZodTypeAny,
  TParams extends z.ZodTypeAny = z.ZodTypeAny,
> = {
  body?: TBody;
  query?: TQuery;
  params?: TParams;
};

export function validate<
  TBody extends z.ZodTypeAny,
  TQuery extends z.ZodTypeAny,
  TParams extends z.ZodTypeAny,
>(schema: SchemaConfig<TBody, TQuery, TParams>): RequestHandler {
  return (req, _res, next) => {
    const errors: Record<string, string[]> = {};

    if (schema.body) {
      const result = schema.body.safeParse(req.body);
      if (!result.success) {
        errors.body = result.error.issues.map(
          (e: z.core.$ZodIssue) => `${e.path.join(".")}: ${e.message}`,
        );
      } else {
        req.body = result.data;
      }
    }

    if (schema.query) {
      const result = schema.query.safeParse(req.query);
      if (!result.success) {
        errors.query = result.error.issues.map(
          (e: z.core.$ZodIssue) => `${e.path.join(".")}: ${e.message}`,
        );
      }
    }

    if (schema.params) {
      const result = schema.params.safeParse(req.params);
      if (!result.success) {
        errors.params = result.error.issues.map(
          (e: z.core.$ZodIssue) => `${e.path.join(".")}: ${e.message}`,
        );
      }
    }

    if (Object.keys(errors).length > 0) {
      next(new ValidationError("Validation failed", errors));
      return;
    }

    next();
  };
}
