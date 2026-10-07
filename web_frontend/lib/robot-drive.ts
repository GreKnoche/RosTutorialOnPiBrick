import { DEFAULT_CHASSIS } from "@/lib/ev3-core";

const ROBOT_API = process.env.NEXT_PUBLIC_ROBOT_API ?? "http://127.0.0.1:8000";

export type DriveResult = { ok: boolean; message: string };

/** Centimetres one default wheel rolls in a single revolution. */
export const wheelCircumferenceCm = 2 * Math.PI * DEFAULT_CHASSIS.wheelRadius * 100;

export function pathCmToRevolutions(pathCm: number): number {
  return pathCm / wheelCircumferenceCm;
}

/** Ask the brick to roll two wheel paths. The twin does not wait on this. */
export function drivePathsCm(leftCm: number, rightCm: number): Promise<DriveResult> {
  return driveWheels(pathCmToRevolutions(leftCm), pathCmToRevolutions(rightCm));
}

/** Ask the real brick to turn both wheels. The twin does not wait on this. */
export async function driveWheels(left: number, right: number): Promise<DriveResult> {
  try {
    const response = await fetch(`${ROBOT_API}/drive`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ left, right }),
    });
    const data: unknown = await response.json();
    if (data && typeof data === "object" && "ok" in data) {
      const body = data as { ok?: unknown; message?: unknown };
      return {
        ok: body.ok === true,
        message: typeof body.message === "string" ? body.message : "",
      };
    }
    return { ok: false, message: "Roboter nicht verbunden" };
  } catch {
    return { ok: false, message: "Roboter nicht verbunden" };
  }
}

export function hardwareNotice(message: string): string {
  const text = message.trim() || "Roboter nicht verbunden";
  return `${text}. Der Twin fährt weiter.`;
}
