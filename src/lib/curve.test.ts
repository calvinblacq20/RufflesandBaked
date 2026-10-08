import { describe, expect, it } from "vitest";
import { ARC, cylinderPose, SINK } from "./curve";

describe("curved gallery", () => {
  const half = 400;

  it("sinks the middle card straight back, unturned", () => {
    const pose = cylinderPose(0, half);
    expect(pose.x).toBeCloseTo(0);
    expect(pose.z).toBeCloseTo(-SINK * half);
    expect(pose.turn).toBeCloseTo(0);
  });

  it("brings the cards at the row's edge forward, turned by the full arc towards the middle", () => {
    const right = cylinderPose(half, half);
    expect(right.z).toBeGreaterThan(cylinderPose(0, half).z);
    expect(right.turn).toBeCloseTo(-ARC);
    expect(cylinderPose(-half, half).turn).toBeCloseTo(ARC);
  });

  it("mirrors left and right", () => {
    const left = cylinderPose(-250, half);
    const right = cylinderPose(250, half);
    expect(left.x).toBeCloseTo(-right.x);
    expect(left.z).toBeCloseTo(right.z);
    expect(left.turn).toBeCloseTo(-right.turn);
  });

  it("keeps the cards in order across the row, so none crosses its neighbour", () => {
    const placed = [-600, -400, -200, 0, 200, 400, 600].map((offset) => offset + cylinderPose(offset, half).x);
    for (let i = 1; i < placed.length; i++) expect(placed[i]).toBeGreaterThan(placed[i - 1] as number);
  });

  it("stops turning far off screen, so a card can never flip round", () => {
    for (const offset of [2000, -2000, 50_000]) expect(Math.abs(cylinderPose(offset, half).turn)).toBeLessThanOrEqual(1.35);
  });

  it("leaves a row with no width flat", () => {
    expect(cylinderPose(120, 0)).toEqual({ x: 0, z: 0, turn: 0 });
  });
});
