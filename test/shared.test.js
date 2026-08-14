const assert = require("node:assert/strict");
const test = require("node:test");

const {
  freqRange,
  freqFromValue,
  freqFraction,
  freqTicks,
} = require("../public/shared");

test("freqTicks.semitones covers the 19 notes strictly inside the range", () => {
  assert.equal(freqTicks.semitones.length, 19);

  for (let i = 1; i < freqTicks.semitones.length; i += 1) {
    assert.ok(freqTicks.semitones[i] > freqTicks.semitones[i - 1]);
  }

  // The range endpoints (1000 / 3000 Hz) are not notes: no tick at either.
  assert.ok(freqTicks.semitones[0] > freqRange.min);
  assert.ok(freqTicks.semitones.at(-1) < freqRange.max);

  // C6 = 1046.502 Hz and F#7 = 2959.955 Hz (A4 = 440 Hz).
  assert.ok(Math.abs(freqTicks.semitones[0] - 440 * 2 ** (15 / 12)) < 1e-9);
  assert.ok(Math.abs(freqTicks.semitones.at(-1) - 440 * 2 ** (33 / 12)) < 1e-9);
});

test("freqTicks.labeled marks the center note and its upper/lower fifth", () => {
  assert.deepEqual(
    freqTicks.labeled.map((entry) => entry.name),
    ["E", "B", "F#"],
  );

  // E6 = B6's lower fifth (midi 88), F#7 = B6's upper fifth (midi 102).
  const expected = [
    { name: "E", midi: 88 },
    { name: "B", midi: 95 },
    { name: "F#", midi: 102 },
  ];
  const semitoneSet = new Set(freqTicks.semitones);

  freqTicks.labeled.forEach((entry, index) => {
    assert.ok(
      entry.freq > freqRange.min && entry.freq < freqRange.max,
      `${entry.name} sits inside the range`,
    );
    assert.ok(semitoneSet.has(entry.freq), `${entry.name} is a semitone tick`);
    assert.ok(
      Math.abs(entry.freq - 440 * 2 ** ((expected[index].midi - 69) / 12)) <
        1e-9,
      `${entry.name} is ${expected[index].name}`,
    );
  });

  // The center label is the semitone tick nearest the range center (2000 Hz).
  const center = freqTicks.labeled[1];
  const nearest = freqTicks.semitones.reduce((best, freq) =>
    Math.abs(freq - 2000) < Math.abs(best - 2000) ? freq : best,
  );
  assert.equal(center.freq, nearest);
});

test("freq helpers invert the linear fader ↔ Hz mapping", () => {
  assert.equal(freqFromValue(0), freqRange.min);
  assert.equal(freqFromValue(1), freqRange.max);
  assert.equal(freqFromValue(0.5), 2000);
  assert.equal(freqFraction(freqRange.min), 0);
  assert.equal(freqFraction(freqRange.max), 1);
  assert.equal(freqFraction(freqFromValue(0.25)), 0.25);
});
