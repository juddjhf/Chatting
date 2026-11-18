import { AppError } from "../utils/AppError.js";

export function validate(schema, source = "body") {
  return function validateRequest(req, _res, next) {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      }));
      next(new AppError(400, "Invalid request.", "VALIDATION_ERROR", details));
      return;
    }
    if (source === "query") req.validatedQuery = result.data;
    else req[source] = result.data;
    next();
  };
}
