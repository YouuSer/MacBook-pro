import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ALERTS_ADMIN_COOKIE = "alerts_admin_session";

function normalizeEnvValue(value: string | undefined) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function getAdminToken() {
  return normalizeEnvValue(process.env.ALERTS_ADMIN_TOKEN);
}

function buildSessionValue(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function isAdminTokenConfigured() {
  return Boolean(getAdminToken());
}

export function getAdminConfigurationError() {
  return isAdminTokenConfigured()
    ? null
    : "ALERTS_ADMIN_TOKEN n'est pas configuré.";
}

export function isValidAdminToken(candidate: string) {
  const configuredToken = getAdminToken();

  if (!configuredToken) {
    return false;
  }

  return candidate === configuredToken;
}

export async function hasAdminSession() {
  const configuredToken = getAdminToken();

  if (!configuredToken) {
    return false;
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ALERTS_ADMIN_COOKIE)?.value;
  return sessionCookie === buildSessionValue(configuredToken);
}

export function attachAdminSession(response: NextResponse) {
  const configuredToken = getAdminToken();

  if (!configuredToken) {
    return response;
  }

  response.cookies.set({
    name: ALERTS_ADMIN_COOKIE,
    value: buildSessionValue(configuredToken),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}

export function clearAdminSession(response: NextResponse) {
  response.cookies.set({
    name: ALERTS_ADMIN_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
