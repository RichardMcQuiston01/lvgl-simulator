import { describe, expect, it, vi } from 'vitest';
import { EventEmitter } from './EventEmitter.js';

interface TestEventMap {
  ping: { readonly value: number };
  pong: { readonly value: string };
}

describe('EventEmitter', () => {
  it('calls a subscribed listener with the emitted event', () => {
    const emitter = new EventEmitter<TestEventMap>();
    const listener = vi.fn();

    emitter.on('ping', listener);
    emitter.emit('ping', { value: 1 });

    expect(listener).toHaveBeenCalledWith({ value: 1 });
  });

  it('calls every listener subscribed to the same type', () => {
    const emitter = new EventEmitter<TestEventMap>();
    const first = vi.fn();
    const second = vi.fn();

    emitter.on('ping', first);
    emitter.on('ping', second);
    emitter.emit('ping', { value: 1 });

    expect(first).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('does not call listeners subscribed to a different type', () => {
    const emitter = new EventEmitter<TestEventMap>();
    const pingListener = vi.fn();
    const pongListener = vi.fn();

    emitter.on('ping', pingListener);
    emitter.on('pong', pongListener);
    emitter.emit('ping', { value: 1 });

    expect(pingListener).toHaveBeenCalledTimes(1);
    expect(pongListener).not.toHaveBeenCalled();
  });

  it('emitting with no subscribers does not throw', () => {
    const emitter = new EventEmitter<TestEventMap>();

    expect(() => emitter.emit('ping', { value: 1 })).not.toThrow();
  });

  it('off() unsubscribes a listener', () => {
    const emitter = new EventEmitter<TestEventMap>();
    const listener = vi.fn();

    emitter.on('ping', listener);
    emitter.off('ping', listener);
    emitter.emit('ping', { value: 1 });

    expect(listener).not.toHaveBeenCalled();
  });

  it('off() for a listener that was never added is a no-op', () => {
    const emitter = new EventEmitter<TestEventMap>();

    expect(() => emitter.off('ping', vi.fn())).not.toThrow();
  });

  it('snapshots listeners so one removing another during emit does not skip it', () => {
    const emitter = new EventEmitter<TestEventMap>();
    const second = vi.fn();
    const first = vi.fn(() => emitter.off('ping', second));

    emitter.on('ping', first);
    emitter.on('ping', second);
    emitter.emit('ping', { value: 1 });

    expect(second).toHaveBeenCalledTimes(1);
  });

  it('a listener added during emit does not run for that same emit', () => {
    const emitter = new EventEmitter<TestEventMap>();
    const late = vi.fn();
    const first = vi.fn(() => emitter.on('ping', late));

    emitter.on('ping', first);
    emitter.emit('ping', { value: 1 });

    expect(late).not.toHaveBeenCalled();

    emitter.emit('ping', { value: 2 });
    expect(late).toHaveBeenCalledTimes(1);
  });
});
