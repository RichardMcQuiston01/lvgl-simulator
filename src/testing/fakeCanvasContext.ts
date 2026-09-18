import { vi } from 'vitest';

/**
 * A minimal fake `CanvasRenderingContext2D` shared by shape/widget tests.
 * Records the state each drawing primitive touches (fillStyle, etc.) and
 * spies on the methods so tests can assert what was drawn without a real
 * canvas backend. Test-only: excluded from the library build (see
 * tsconfig.build.json).
 */
export function createFakeCanvasContext(): CanvasRenderingContext2D {
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    lineCap: '',
    lineJoin: '',
    font: '',
    textAlign: '',
    textBaseline: '',
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    scale: vi.fn(),
    beginPath: vi.fn(),
    closePath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arcTo: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    drawImage: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}
