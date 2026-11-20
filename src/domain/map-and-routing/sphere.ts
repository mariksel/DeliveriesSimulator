/** The Earth's mean radius, in metres, which every distance over the sphere uses. */
export const EARTH_RADIUS_METRES = 6_371_000;
const DEGREES_PER_HALF_TURN = 180;

/** An angle in radians, from degrees. */
export const radians = (degrees: number): number => (degrees * Math.PI) / DEGREES_PER_HALF_TURN;
