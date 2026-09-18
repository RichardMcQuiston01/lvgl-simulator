/**
 * A minimal typed pub/sub emitter. `TEventMap` maps event type names to
 * their payload type, so `on`/`off`/`emit` are type-checked per event type
 * without needing a class hierarchy of event objects.
 */
export class EventEmitter<TEventMap extends object> {
  private readonly listenersByType = new Map<keyof TEventMap, Set<(event: never) => void>>();

  on<K extends keyof TEventMap>(type: K, listener: (event: TEventMap[K]) => void): void {
    let listeners = this.listenersByType.get(type);
    if (!listeners) {
      listeners = new Set();
      this.listenersByType.set(type, listeners);
    }
    listeners.add(listener as (event: never) => void);
  }

  off<K extends keyof TEventMap>(type: K, listener: (event: TEventMap[K]) => void): void {
    this.listenersByType.get(type)?.delete(listener as (event: never) => void);
  }

  emit<K extends keyof TEventMap>(type: K, event: TEventMap[K]): void {
    const listeners = this.listenersByType.get(type);
    if (!listeners) {
      return;
    }
    // Snapshot first: a listener may add/remove listeners during emit.
    for (const listener of [...listeners]) {
      (listener as (event: TEventMap[K]) => void)(event);
    }
  }
}
