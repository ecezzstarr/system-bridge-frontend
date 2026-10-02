export type PanelPosition = { x: number; y: number }

export function clampPanelPosition(position: PanelPosition, size: { width: number; height: number }, viewport: { width: number; height: number }) {
  return {
    x: Math.max(8, Math.min(position.x, Math.max(8, viewport.width - size.width - 8))),
    y: Math.max(8, Math.min(position.y, Math.max(8, viewport.height - size.height - 8))),
  }
}
