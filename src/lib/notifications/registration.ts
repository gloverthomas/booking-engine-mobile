/**
 * Getting this phone onto the server's notification list. All platform calls come in through `deps`, so
 * the decisions (ask only when undetermined, never twice, survive a failure) are tested without a device.
 */

export type PermissionState = "granted" | "denied" | "undetermined";

export interface RegistrationDeps {
  isPhysicalDevice: boolean;
  /** Expo project id from the EAS setup; push tokens cannot be issued without it. */
  projectId: string | null;
  getPermission(): Promise<PermissionState>;
  requestPermission(): Promise<PermissionState>;
  getToken(projectId: string): Promise<string>;
  /** Tell the server which phone belongs to the signed-in person. */
  registerWithServer(token: string): Promise<void>;
  rememberToken(token: string): Promise<void>;
}

export type RegistrationResult =
  | { status: "registered"; token: string }
  | { status: "denied" }
  | { status: "unsupported"; reason: "simulator" | "no-project" }
  | { status: "failed"; message: string };

export async function registerForPush(
  deps: RegistrationDeps,
): Promise<RegistrationResult> {
  // Simulators cannot receive push, and a missing project id means EAS is not set up yet.
  if (!deps.isPhysicalDevice)
    return { status: "unsupported", reason: "simulator" };
  if (!deps.projectId) return { status: "unsupported", reason: "no-project" };

  try {
    let permission = await deps.getPermission();
    // Ask once, in context. If they said no before, iOS will not show the prompt again.
    if (permission === "undetermined")
      permission = await deps.requestPermission();
    if (permission !== "granted") return { status: "denied" };

    const token = await deps.getToken(deps.projectId);
    await deps.registerWithServer(token);
    await deps.rememberToken(token);
    return { status: "registered", token };
  } catch (error) {
    // Notifications are a convenience: a failure here must never get in the way of using the app.
    return {
      status: "failed",
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/** The appointment a tapped notification is about, or null for anything we did not send. */
export function bookingIdFromNotification(data: unknown): string | null {
  if (typeof data !== "object" || data === null) return null;
  const id = (data as { bookingId?: unknown }).bookingId;
  return typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}
