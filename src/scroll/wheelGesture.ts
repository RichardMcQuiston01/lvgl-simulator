/**
 * Tells one wheel or trackpad gesture from the next. A gesture is a run of
 * scroll events with less than `windowMs` between them (a trackpad sends a
 * stream of small ones, and keeps sending after the fingers lift). A paging
 * widget steps one page or tile per gesture, not per event, so a stream of
 * small events does not race through several pages.
 */
export class WheelGesture {
  private lastEventAt = -Infinity;
  private stepped = false;

  /** Creates a tracker that reads time from `now` (ms) and ends a gesture after `windowMs` of quiet. */
  constructor(
    private readonly now: () => number,
    private readonly windowMs = 200,
  ) {}

  /**
   * Call for each scroll event that would step a page. Returns whether it may:
   * `true` for the first such event of a gesture, `false` for the rest of it.
   */
  allowStep(): boolean {
    const time = this.now();
    if (time - this.lastEventAt >= this.windowMs) {
      this.stepped = false;
    }
    this.lastEventAt = time;
    if (this.stepped) {
      return false;
    }
    this.stepped = true;
    return true;
  }
}
