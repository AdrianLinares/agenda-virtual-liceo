/**
 * Lightweight telemetry module for auth events.
 * Currently logs to console; can be replaced with infra logging later.
 */

export interface TelemetryEvent {
  name: string
  payload?: Record<string, unknown>
}

/**
 * Records a telemetry event.
 * @param name Event name
 * @param payload Optional payload
 */
export function recordEvent(name: string, payload?: Record<string, unknown>): void {
  console.debug('[telemetría]', name, payload)
}