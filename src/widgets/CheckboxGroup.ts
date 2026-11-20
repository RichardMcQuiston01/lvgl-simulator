import type { Checkbox } from './Checkbox.js';

export interface CheckboxGroupOptions {
  /** Whether clicking the checked checkbox unchecks it, leaving none checked (default `false`). */
  readonly allowUncheck?: boolean;
}

/**
 * Makes checkboxes behave like radio buttons: checking one unchecks the
 * others in the group. LVGL has no radio widget; its examples build the same
 * thing by unchecking siblings in a `valueChanged` callback, which this does
 * for you. Pass the group as a checkbox's `group` option, or use
 * {@link CheckboxGroup.add}.
 */
export class CheckboxGroup {
  allowUncheck: boolean;

  private readonly members: Checkbox[] = [];

  /** Creates an empty group; by default the checked checkbox cannot be unchecked by clicking it. */
  constructor(options: CheckboxGroupOptions = {}) {
    this.allowUncheck = options.allowUncheck ?? false;
  }

  /** The checkboxes in this group, in the order they were added. */
  get checkboxes(): readonly Checkbox[] {
    return this.members;
  }

  /** The checked checkbox, or `undefined` when none is. */
  get checked(): Checkbox | undefined {
    return this.members.find((member) => member.checked);
  }

  /** Whether `checkbox` is in this group. */
  has(checkbox: Checkbox): boolean {
    return this.members.includes(checkbox);
  }

  /**
   * Adds `checkbox` to this group, taking it out of any other group first.
   * If it is checked and another member already is, the earlier one stays
   * checked and `checkbox` is unchecked.
   */
  add(checkbox: Checkbox): void {
    if (this.members.includes(checkbox)) {
      return;
    }
    checkbox.group?.remove(checkbox);
    const alreadyChecked = this.checked !== undefined;
    this.members.push(checkbox);
    checkbox.group = this;
    if (alreadyChecked && checkbox.checked) {
      checkbox.checked = false;
    }
  }

  /** Removes `checkbox` from this group. No-op if it is not a member. */
  remove(checkbox: Checkbox): void {
    const index = this.members.indexOf(checkbox);
    if (index === -1) {
      return;
    }
    this.members.splice(index, 1);
    checkbox.group = undefined;
  }
}
