import { expect, it } from 'vitest';
import type { InputType } from '../document';
import { crossSection, type Nib, nibFor } from '../geometry/nib';
import { penWidths, UNIT_LENGTH_CM } from '../geometry/penModel';

type Fixture = {
  name: string;
  input: InputType;
  size: number;
  points: number[];
  samples: number[];
};

const round = (value: number, digits: number) => Number(value.toFixed(digits));

// Raw points every 8 ms through `at`, positions rounded like the native encoders.
function stroke(
  name: string,
  input: InputType,
  size: number,
  count: number,
  at: (i: number) => [number, number, number?],
): Fixture {
  const points: number[] = [];
  for (let i = 0; i < count; i++) {
    const [x, y, pressure = -1] = at(i);
    points.push(round(x, 2), round(y, 2), i * 8, pressure, -1, -1);
  }
  const samples: number[] = [];
  for (let i = 5; i < count - 5; i += 5) samples.push(i);
  return { name, input, size, points, samples: count === 1 ? [0] : samples };
}

// Distance covered after i steps when the speed ramps linearly from 0 to `top` units/ms.
const ramp = (i: number, count: number, top: number) => (top * 8 * i * i) / (2 * (count - 1));

const FIXTURES: Fixture[] = [
  stroke('slow', 'touch', 6, 120, (i) => [20 + i * 0.4, 100]),
  stroke('accelerating', 'touch', 6, 60, (i) => [20 + ramp(i, 60, 3), 100]),
  stroke('down', 'touch', 6, 80, (i) => [100, 20 + i * 2.4]),
  stroke('arc', 'touch', 8, 40, (i) => {
    const angle = (i * 4) / 80;
    return [100 + 80 * Math.sin(angle), 100 + 80 - 80 * Math.cos(angle)];
  }),
  stroke('pressure', 'stylus', 6, 100, (i) => [20 + i * 2.4, 100, round(0.5 + i * 0.005, 3)]),
  stroke('mouse', 'mouse', 4, 60, (i) => [20 + i * 16, 100]),
  stroke('tap', 'touch', 10, 1, () => [50, 50]),
];

// Highlighters keep their size, so their fixtures hold the chisel's cross-section across each point instead.
const HIGHLIGHTERS: Fixture[] = [
  stroke('highlighter-right', 'touch', 20, 30, (i) => [20 + i * 8, 100]),
  stroke('highlighter-down', 'touch', 20, 30, (i) => [100, 20 + i * 8]),
  stroke('highlighter-down-right', 'touch', 20, 30, (i) => [20 + i * 6, 20 + i * 6]),
  stroke('highlighter-up-right', 'touch', 20, 30, (i) => [20 + i * 6, 300 - i * 6]),
];

function crossSections(fixture: Fixture): number[] {
  const nib = nibFor({
    brush: { type: 'highlighter', color: '#FFE600FF', size: fixture.size },
    input: fixture.input,
    points: fixture.points,
  }) as Nib;
  const count = fixture.points.length / 6;
  return Array.from({ length: count }, (_, i) => {
    const before = Math.max(0, i - 1) * 6;
    const after = Math.min(count - 1, i + 1) * 6;
    const dx = (fixture.points[after] as number) - (fixture.points[before] as number);
    const dy = (fixture.points[after + 1] as number) - (fixture.points[before + 1] as number);
    const length = Math.hypot(dx, dy);
    return round(crossSection(nib, -dy / length, dx / length), 4);
  });
}

it('keeps the shared pen width fixtures current', async () => {
  const pens = FIXTURES.map((fixture) => ({
    ...fixture,
    brush: 'pen',
    widths: penWidths(fixture.points, fixture.size, fixture.input).map((w) => round(w, 4)),
  }));
  const highlighters = HIGHLIGHTERS.map((fixture) => ({
    ...fixture,
    brush: 'highlighter',
    widths: crossSections(fixture),
  }));
  const strokes = [...pens, ...highlighters];
  const json = `${JSON.stringify({ unitLengthCm: UNIT_LENGTH_CM, strokes }, null, 1)}\n`;
  await expect(json).toMatchFileSnapshot('../__fixtures__/pen-widths.json');
});
