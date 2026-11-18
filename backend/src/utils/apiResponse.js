export function sendSuccess(res, data, message = "Operation successful", statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, data });
}

export function sendError(res, message, statusCode = 500, code = "REQUEST_FAILED", details) {
  const body = { success: false, message, code };
  if (details) body.details = details;
  return res.status(statusCode).json(body);
}
