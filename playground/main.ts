import { createSimulator } from '@lvgl-simulator';

const DEFAULT_WIDTH = 320;
const DEFAULT_HEIGHT = 240;

function readResolutionFromQuery(): { width: number; height: number } {
  const params = new URLSearchParams(window.location.search);
  const width = Number(params.get('width'));
  const height = Number(params.get('height'));

  return {
    width: Number.isFinite(width) && width > 0 ? width : DEFAULT_WIDTH,
    height: Number.isFinite(height) && height > 0 ? height : DEFAULT_HEIGHT,
  };
}

const container = document.querySelector<HTMLDivElement>('#app');
if (!container) {
  throw new Error('Missing #app container element in playground/index.html.');
}

const { width, height } = readResolutionFromQuery();

// Override the resolution via query params, e.g. ?width=480&height=320
createSimulator(container, { width, height });
