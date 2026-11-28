/* A giant Arabic letter that writes itself (outline first, then the ink floods in) when its room is visible. */
export function Letter({ ch }: { ch: string }) {
  return (
    <svg className="letter" viewBox="0 0 1000 1000" aria-hidden="true">
      <text x="500" y="640" textAnchor="middle" fontSize="720">{ch}</text>
    </svg>
  );
}
