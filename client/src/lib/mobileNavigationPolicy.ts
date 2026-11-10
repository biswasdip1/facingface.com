export type MobileNavigationScrollState = {
  position: number;
  direction: -1 | 0 | 1;
  travel: number;
  hidden: boolean;
};

/** Reset navigation to visible without treating the initial position as travel. */
export function createMobileNavigationScrollState(
  position = 0
): MobileNavigationScrollState {
  return {
    position: Number.isFinite(position) ? Math.max(0, position) : 0,
    direction: 0,
    travel: 0,
    hidden: false,
  };
}

/**
 * Advance using scroll coordinates only; no DOM or viewport access is needed.
 * Invalid samples/bounds are ignored rather than fabricating a jump to the top.
 */
export function advanceMobileNavigationScroll(
  state: MobileNavigationScrollState,
  rawPosition: number,
  maxPosition: number
): MobileNavigationScrollState {
  if (!Number.isFinite(rawPosition) || !Number.isFinite(maxPosition)) {
    return state;
  }

  const maximum = Math.max(0, maxPosition);
  const position = Math.min(maximum, Math.max(0, rawPosition));
  // Clamp the previous coordinate too: a shorter page is not an upward scroll.
  const previousPosition = Math.min(maximum, Math.max(0, state.position));
  const movement = position - previousPosition;

  if (movement === 0) {
    // In particular, bottom overscroll and its return must not reveal navigation.
    if (position === state.position) return state;
    return {
      ...state,
      position,
      hidden: position <= 32 ? false : state.hidden,
    };
  }

  const direction: -1 | 1 = movement > 0 ? 1 : -1;
  const distance = Math.abs(movement);
  const travel =
    direction === state.direction
      ? Math.min(Number.MAX_VALUE, state.travel + distance)
      : distance;

  let hidden = state.hidden;
  if (position <= 32) {
    hidden = false;
  } else if (direction === 1 && travel >= 24 && position > 96) {
    hidden = true;
  } else if (direction === -1 && travel >= 12) {
    hidden = false;
  }

  return { position, direction, travel, hidden };
}
