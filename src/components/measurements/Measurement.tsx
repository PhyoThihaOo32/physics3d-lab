export function Measurement({
  label,
  value,
  unit,
  testId,
}: {
  label: string;
  value: string;
  unit?: string;
  testId?: string;
}) {
  return (
    <div className="measurement">
      <span className="measurement-label">{label}</span>
      <div>
        <output data-testid={testId} aria-live="off">
          {value}
        </output>
        {unit && <span className="unit">{unit}</span>}
      </div>
    </div>
  );
}
