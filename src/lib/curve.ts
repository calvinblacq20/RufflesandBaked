/**
 * Bends a flat row of cards around the inside of a cylinder, as if you stood facing its wall: the
 * card in the middle sits furthest back, and the cards towards either edge come forward and turn
 * to face the middle, so the row reads as a curved band that is taller at its ends.
 *
 * Everything scales with the row's half-width, so the shape is the same on a phone and a desktop.
 */

/** How far round the cylinder (radians) the row's edge sits. */
export const ARC = 1;
/** How far the middle of the row sinks back, as a share of the half-width. */
export const SINK = 0.3;
/** Perspective distance, as a multiple of the half-width. Shorter exaggerates the curve. */
export const PERSPECTIVE = 1.45;
/** Cards further round than this (radians) are off screen; they stop turning so they can't flip. */
const MAX_TURN = 1.35;

export interface CardPose {
  /** Sideways shift from the card's flat position, px. */
  x: number;
  /** Depth, px; positive comes towards the viewer. */
  z: number;
  /** Turn about the vertical axis, radians, ready for CSS rotateY. */
  turn: number;
}

/**
 * Where a card goes on the cylinder, given how far its centre sits from the row's centre (`offset`)
 * and the row's half-width. Arc length along the cylinder equals the flat distance, so the gaps
 * between cards stay even all the way round.
 */
export function cylinderPose(offset: number, halfWidth: number): CardPose {
  if (halfWidth <= 0) return { x: 0, z: 0, turn: 0 };
  const radius = halfWidth / ARC;
  const angle = Math.max(-MAX_TURN, Math.min(MAX_TURN, offset / radius));
  return {
    x: radius * Math.sin(angle) - offset,
    z: radius * (1 - Math.cos(angle)) - SINK * halfWidth,
    // CSS rotateY turns positive angles' right edge away, so the right-hand cards turn negative.
    turn: -angle,
  };
}
