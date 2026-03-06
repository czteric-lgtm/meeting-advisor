import { NextResponse } from "next/server";

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, { status: 200, ...init });
}

export function created<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, { status: 201, ...init });
}

export function badRequest(message: string, init?: ResponseInit) {
  return NextResponse.json({ error: message }, { status: 400, ...init });
}

export function notFound(message = "Not found", init?: ResponseInit) {
  return NextResponse.json({ error: message }, { status: 404, ...init });
}

export function serverError(message = "Internal server error", init?: ResponseInit) {
  return NextResponse.json({ error: message }, { status: 500, ...init });
}

