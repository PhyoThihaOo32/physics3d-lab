const faces = ['front', 'right', 'back', 'left', 'top', 'bottom'] as const;

export function PrismCube() {
  return (
    <span className="brand-cube" aria-hidden="true">
      {faces.map((face) => (
        <span className={`brand-cube-face brand-cube-${face}`} key={face} />
      ))}
    </span>
  );
}
