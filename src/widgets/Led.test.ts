import { describe, expect, it } from 'vitest';
import { createFakeCanvasContext } from '../testing/fakeCanvasContext.js';
import { mixColors } from '../style/color.js';
import { Led, LED_BRIGHTNESS_MAX, LED_BRIGHTNESS_MIN } from './Led.js';

describe('Led', () => {
  it('is fully lit and not clickable by default', () => {
    const led = new Led({ width: 20, height: 20 });
    expect(led.brightness).toBe(LED_BRIGHTNESS_MAX);
    expect(led.clickable).toBe(false);
  });

  it('turns on, off, and toggles', () => {
    const led = new Led({ width: 20, height: 20 });
    led.off();
    expect(led.brightness).toBe(LED_BRIGHTNESS_MIN);
    led.toggle();
    expect(led.brightness).toBe(LED_BRIGHTNESS_MAX);
    led.toggle();
    expect(led.brightness).toBe(LED_BRIGHTNESS_MIN);
    led.on();
    expect(led.brightness).toBe(LED_BRIGHTNESS_MAX);
  });

  it('clamps brightness into 0-255', () => {
    const led = new Led({ width: 20, height: 20, brightness: 999 });
    expect(led.brightness).toBe(255);
    led.setBrightness(-5);
    expect(led.brightness).toBe(0);
  });

  it('never draws dimmer than the off level, with no glow there', () => {
    const led = new Led({ width: 20, height: 20, brightness: 0 });
    expect(led.effectiveBrightness).toBe(LED_BRIGHTNESS_MIN);
    expect(led.glowRatio).toBe(0);
    expect(new Led({ width: 20, height: 20 }).glowRatio).toBe(1);
  });

  it('paints the body in the LED color when fully lit, with a glow behind it', () => {
    const context = createFakeCanvasContext();
    new Led({ width: 20, height: 20, color: '#ff0000' }).render(context);
    expect(context.fillStyle).toBe('#ff0000');
    // glow caster + body
    expect(context.fill).toHaveBeenCalledTimes(2);
  });

  it('tints the body darker and drops the glow when off', () => {
    const context = createFakeCanvasContext();
    new Led({ width: 20, height: 20, color: '#ff0000', brightness: 0 }).render(context);
    expect(context.fillStyle).toBe(mixColors('#ff0000', '#000000', LED_BRIGHTNESS_MIN / 255));
    expect(context.fill).toHaveBeenCalledTimes(1);
  });
});
