import fp from "fastify-plugin";
import type { FastifyPluginAsync, FastifyError } from "fastify";
import { ZodError } from "zod";
import { ApiError } from "../utils/errors.js";
import type { ApiErrorBody } from "@watchtower/shared";

const errorHandlerPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.setErrorHandler<FastifyError | ApiError | ZodError>((error, request, reply) => {
    if (error instanceof ApiError) {
      const body: ApiErrorBody = { code: error.code, message: error.message, details: error.details };
      reply.status(error.statusCode).send(body);
      return;
    }

    if (error instanceof ZodError) {
      const body: ApiErrorBody = {
        code: "VALIDATION_ERROR",
        message: "Request validation failed",
        details: { issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
      };
      reply.status(400).send(body);
      return;
    }

    if (error.validation) {
      const body: ApiErrorBody = { code: "VALIDATION_ERROR", message: "Request validation failed" };
      reply.status(400).send(body);
      return;
    }

    if (error.statusCode === 429) {
      const body: ApiErrorBody = { code: "RATE_LIMITED", message: "Too many requests" };
      reply.status(429).send(body);
      return;
    }

    request.log.error({ err: error }, "Unhandled error");
    const body: ApiErrorBody = { code: "INTERNAL_ERROR", message: "An unexpected error occurred" };
    reply.status(500).send(body);
  });
};

export default fp(errorHandlerPlugin);
