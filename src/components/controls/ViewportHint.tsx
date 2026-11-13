export function ViewportHint() {
  return (
    <div className="view-hint">
      <span className="view-hint-pointer">
        Drag to orbit · Scroll to zoom · Arrow keys to pan
      </span>
      <span className="view-hint-touch">Drag to orbit · Pinch to zoom</span>
    </div>
  );
}
