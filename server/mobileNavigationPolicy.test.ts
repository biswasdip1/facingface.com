import { describe, expect, it } from "vitest";
import {
  advanceMobileNavigationScroll,
  createMobileNavigationScrollState,
} from "../client/src/lib/mobileNavigationPolicy";

const advance = advanceMobileNavigationScroll;
const create = createMobileNavigationScrollState;

function hiddenState() {
  return advance(create(200), 224, 500);
}

describe("createMobileNavigationScrollState", () => {
  it("starts visible at zero with no direction or accumulated travel", () => {
    expect(create()).toEqual({
      position: 0,
      direction: 0,
      travel: 0,
      hidden: false,
    });
  });

  it("resets to visible at a supplied position even deep in the page", () => {
    expect(create(240)).toEqual({
      position: 240,
      direction: 0,
      travel: 0,
      hidden: false,
    });
  });

  it("clamps a negative starting position to zero", () => {
    expect(create(-30)).toEqual(create());
  });

  it.each([NaN, Infinity, -Infinity])(
    "normalizes a non-finite starting position (%s) to zero",
    position => {
      expect(create(position)).toEqual(create());
    }
  );
});

describe("advanceMobileNavigationScroll", () => {
  it("hides at exactly 24 pixels of downward travel", () => {
    const beforeThreshold = advance(create(100), 123, 500);
    expect(beforeThreshold).toEqual({
      position: 123,
      direction: 1,
      travel: 23,
      hidden: false,
    });
    expect(advance(beforeThreshold, 124, 500)).toEqual({
      position: 124,
      direction: 1,
      travel: 24,
      hidden: true,
    });
  });

  it("requires position strictly greater than 96 even after sufficient travel", () => {
    const atBoundary = advance(create(), 96, 500);
    expect(atBoundary.travel).toBe(96);
    expect(atBoundary.hidden).toBe(false);
    expect(advance(atBoundary, 97, 500).hidden).toBe(true);
  });

  it("accumulates tiny downward motions rather than discarding them", () => {
    let state = create(100);
    for (let index = 1; index <= 96; index += 1) {
      state = advance(state, 100 + index / 4, 500);
      expect(state.hidden).toBe(index === 96);
    }
    expect(state.travel).toBe(24);
    expect(state.direction).toBe(1);
  });

  it("reveals at exactly 12 pixels of upward travel", () => {
    const beforeThreshold = advance(hiddenState(), 213, 500);
    expect(beforeThreshold).toEqual({
      position: 213,
      direction: -1,
      travel: 11,
      hidden: true,
    });
    expect(advance(beforeThreshold, 212, 500)).toEqual({
      position: 212,
      direction: -1,
      travel: 12,
      hidden: false,
    });
  });

  it("accumulates tiny upward motions across duplicate samples", () => {
    let state = hiddenState();
    for (let index = 1; index <= 24; index += 1) {
      state = advance(state, 224 - index / 2, 500);
      expect(state.hidden).toBe(index < 24);
      expect(advance(state, state.position, 500)).toBe(state);
    }
    expect(state.travel).toBe(12);
  });

  it("resets downward accumulation when movement reverses upward", () => {
    const downward = advance(create(100), 123, 500);
    const reversed = advance(downward, 122, 500);
    expect(reversed).toEqual({
      position: 122,
      direction: -1,
      travel: 1,
      hidden: false,
    });
    const downwardAgain = advance(reversed, 123, 500);
    expect(downwardAgain.travel).toBe(1);
    expect(downwardAgain.hidden).toBe(false);
    expect(advance(downwardAgain, 146, 500).hidden).toBe(true);
  });

  it("resets upward accumulation when movement reverses downward", () => {
    const upward = advance(hiddenState(), 213, 500);
    const downward = advance(upward, 214, 500);
    expect(downward.direction).toBe(1);
    expect(downward.travel).toBe(1);
    const upwardAgain = advance(downward, 213, 500);
    expect(upwardAgain.travel).toBe(1);
    expect(upwardAgain.hidden).toBe(true);
    expect(advance(upwardAgain, 202, 500).hidden).toBe(false);
  });

  it("does not turn alternating one-pixel jitter into accumulated travel", () => {
    let state = hiddenState();
    for (let index = 0; index < 40; index += 1) {
      state = advance(state, index % 2 === 0 ? 223 : 224, 500);
      expect(state.travel).toBe(1);
      expect(state.hidden).toBe(true);
    }
  });

  it("always shows at the inclusive 32-pixel top boundary", () => {
    const state = { ...create(40), hidden: true };
    expect(advance(state, 33, 500).hidden).toBe(true);
    expect(advance(state, 32, 500)).toEqual({
      position: 32,
      direction: -1,
      travel: 8,
      hidden: false,
    });
    expect(advance(create(), 32, 500).hidden).toBe(false);
  });

  it("preserves the state for duplicate positions without resetting travel", () => {
    const state = advance(create(100), 110, 500);
    expect(advance(state, 110, 500)).toBe(state);
    expect(advance(state, 124, 500).hidden).toBe(true);
  });

  it("clamps bottom overscroll before accumulating downward travel", () => {
    const state = advance(create(180), 260, 200);
    expect(state).toEqual({
      position: 200,
      direction: 1,
      travel: 20,
      hidden: false,
    });
  });

  it("does not reveal or reverse direction during a bottom bounce", () => {
    const bottom = advance(create(100), 200, 200);
    expect(bottom.hidden).toBe(true);
    let state = bottom;
    for (const rawPosition of [250, 240, 220, 201, 200, 200]) {
      state = advance(state, rawPosition, 200);
      expect(state).toBe(bottom);
    }
    const realUpwardScroll = advance(state, 199, 200);
    expect(realUpwardScroll.direction).toBe(-1);
    expect(realUpwardScroll.travel).toBe(1);
    expect(realUpwardScroll.hidden).toBe(true);
    expect(advance(realUpwardScroll, 188, 200).hidden).toBe(false);
  });

  it("does not count negative top overscroll or its rebound as travel", () => {
    const top = create();
    for (const rawPosition of [-50, -20, -1, 0]) {
      expect(advance(top, rawPosition, 500)).toBe(top);
    }
    expect(advance(top, 10, 500)).toEqual({
      position: 10,
      direction: 1,
      travel: 10,
      hidden: false,
    });
  });

  it("clamps a negative sample to zero when scrolling toward the top", () => {
    expect(advance(create(40), -30, 500)).toEqual({
      position: 0,
      direction: -1,
      travel: 40,
      hidden: false,
    });
  });

  it("does not treat a shrinking page boundary as upward movement", () => {
    const state = hiddenState();
    const resized = advance(state, 180, 160);
    expect(resized).toEqual({ ...state, position: 160 });
    expect(advance(resized, 160, 160)).toBe(resized);
    const upward = advance(resized, 159, 160);
    expect(upward.travel).toBe(1);
    expect(upward.direction).toBe(-1);
    expect(upward.hidden).toBe(true);
  });

  it("clamps a reset position above the maximum without inventing travel", () => {
    expect(advance(create(300), 220, 200)).toEqual(create(200));
  });

  it("shows when a shrinking page moves the boundary into the top region", () => {
    const state = hiddenState();
    expect(advance(state, 224, 32)).toEqual({
      ...state,
      position: 32,
      hidden: false,
    });
  });

  it.each([0, -100])(
    "handles a non-scrollable page maximum (%s) without a false reversal",
    maximum => {
      const state = hiddenState();
      expect(advance(state, 200, maximum)).toEqual({
        ...state,
        position: 0,
        hidden: false,
      });
      expect(advance(create(), 100, maximum)).toEqual(create());
    }
  );

  it.each([NaN, Infinity, -Infinity])(
    "ignores a non-finite raw position (%s) without revealing or reversing",
    rawPosition => {
      const state = hiddenState();
      expect(advance(state, rawPosition, 500)).toBe(state);
      expect(advance(state, 223, 500).travel).toBe(1);
    }
  );

  it.each([NaN, Infinity, -Infinity])(
    "ignores a non-finite maximum (%s) without manufacturing a boundary",
    maximum => {
      const state = hiddenState();
      expect(advance(state, 0, maximum)).toBe(state);
    }
  );

  it("keeps finite extreme coordinates and accumulated travel finite", () => {
    const state = {
      ...create(Number.MAX_VALUE / 2),
      direction: 1 as const,
      travel: Number.MAX_VALUE,
    };
    const next = advance(state, Number.MAX_VALUE, Number.MAX_VALUE);
    expect(next.position).toBe(Number.MAX_VALUE);
    expect(next.travel).toBe(Number.MAX_VALUE);
    expect(Number.isFinite(next.travel)).toBe(true);
    expect(next.hidden).toBe(true);
  });

  it("does not mutate the supplied state", () => {
    const state = Object.freeze(create(100));
    expect(advance(state, 124, 500).hidden).toBe(true);
    expect(state).toEqual(create(100));
  });
});
