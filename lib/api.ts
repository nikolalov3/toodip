import "server-only";

import { NextResponse } from "next/server";
import { ZodError, type ZodType } from "zod";

import { getSession, type Session } from "@/lib/auth/session";

/**
 * Small helpers so every route handler answers in the same shape:
 * { data } on success, { error, details? } on failure.
 */

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function fail(message: string, status = 400, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

export async function requireApiSession(): Promise<
  { session: Session } | { response: NextResponse }
> {
  const session = await getSession();
  if (!session) return { response: fail("Not authenticated.", 401) };
  return { session };
}

export async function parseJson<T>(
  request: Request,
  schema: ZodType<T>,
): Promise<{ data: T } | { response: NextResponse }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { response: fail("Body must be valid JSON.", 400) };
  }

  try {
    return { data: schema.parse(body) };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        response: fail("Validation failed.", 422, error.issues),
      };
    }
    throw error;
  }
}

export function handleError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error.";
  return fail(message, 500);
}
