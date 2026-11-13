export function ViewportHint() {
  return (
    <div className="view-hint">
      <span aria-hidden="true">⤧</span>
      <div>
        Drag to orbit · Scroll to zoom · Right-drag to pan
        <br />
        <span className="keyboard-hint">
          Click view or Tab to it: ↑ ↓ ← → pan · &lt; &gt; sideways · Esc exits
        </span>
      </div>
    </div>
  );
}
