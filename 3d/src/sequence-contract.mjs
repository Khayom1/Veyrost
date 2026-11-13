// Deterministic timeline contract shared by the scene and its tests.
export const SEQUENCE = Object.freeze([
  ["VEHICLE_APPROACH", 0, 3],
  ["SIDE_DOORS_OPEN", 3, 4],
  ["TECHNICIANS_EXIT", 4, 7],
  ["WALK_TO_SERVICE_PANEL", 7, 11],
  ["INDIVIDUAL_WIRE_CONNECTIONS", 11, 31],
  ["MENU_REINSTALL", 31, 35],
  ["RETURN_TO_VEHICLE", 35, 40],
  ["BOARDING_AND_DOORS_CLOSE", 40, 44],
  ["VEHICLE_DEPARTURE", 44, 46],
]);
export const SEQUENCE_DURATION = SEQUENCE.at(-1)[2];
export function stageAt(time) {
  const t = Math.max(0, Math.min(SEQUENCE_DURATION, Number(time) || 0));
  return SEQUENCE.find(([, start, end], index) => t >= start && (t < end || index === SEQUENCE.length - 1))[0];
}
export function wireProgress(time, index) {
  if (!Number.isInteger(index) || index < 0 || index > 6) throw new RangeError("wire index must be 0..6");
  const start = 14 + index * 1.8;
  return Math.max(0, Math.min(1, (time - start) / 1.1));
}
