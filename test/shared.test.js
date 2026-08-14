const assert = require("node:assert/strict");
const test = require("node:test");

const {
  freqRange,
  freqFromValue,
  freqFraction,
  freqTicks,
  registers,
  defaultRegister,
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

test("registers expose three bands with the same 19-tick structure", () => {
  assert.deepEqual(Object.keys(registers).map(Number), [1, 2, 3]);

  for (const key of [1, 2, 3]) {
    const reg = registers[key];
    assert.equal(reg.freqTicks.semitones.length, 19);
    assert.equal(reg.freqTicks.labeled.length, 3);

    for (let i = 1; i < reg.freqTicks.semitones.length; i += 1) {
      assert.ok(reg.freqTicks.semitones[i] > reg.freqTicks.semitones[i - 1]);
    }

    // Band endpoints are not notes: extreme ticks sit strictly inside.
    assert.ok(reg.freqTicks.semitones[0] > reg.freqRange.min);
    assert.ok(reg.freqTicks.semitones.at(-1) < reg.freqRange.max);

    // Labeled notes are semitone ticks with distinct letters.
    const letters = new Set(reg.freqTicks.labeled.map((e) => e.name));
    assert.equal(letters.size, 3);
    const semitoneSet = new Set(reg.freqTicks.semitones);
    for (const entry of reg.freqTicks.labeled) {
      assert.ok(semitoneSet.has(entry.freq), `${entry.name} is a semitone tick`);
    }

    // The center note sits at the same fader fraction in every register
    // (the bands are exact shifts of each other).
    const referenceCenterFraction = freqFraction(
      registers[3].freqTicks.labeled[1].freq,
    );
    const centerFraction = freqFraction(
      reg.freqTicks.labeled[1].freq,
      reg.freqRange,
    );
    assert.ok(Math.abs(centerFraction - referenceCenterFraction) < 1e-12);
  }
});

test("register bands descend in fifths (upper fifth = two fifths below the previous center)", () => {
  // register 2's upper fifth A5 = two fifths below register 3's center B6.
  const upper2 = registers[2].freqTicks.labeled[2].freq;
  const center3 = registers[3].freqTicks.labeled[1].freq;
  assert.ok(Math.abs(upper2 - center3 / 2 ** (14 / 12)) < 1e-9);

  // register 1's upper fifth C4 = two fifths below register 2's center D5.
  const upper1 = registers[1].freqTicks.labeled[2].freq;
  const center2 = registers[2].freqTicks.labeled[1].freq;
  assert.ok(Math.abs(upper1 - center2 / 2 ** (14 / 12)) < 1e-9);

  // Bands shift by 21 semitones per register.
  assert.ok(Math.abs(registers[2].freqRange.min - 1000 * 2 ** (-21 / 12)) < 1e-9);
  assert.ok(Math.abs(registers[1].freqRange.min - 1000 * 2 ** (-42 / 12)) < 1e-9);

  assert.deepEqual(
    registers[3].freqTicks.labeled.map((e) => e.name),
    ["E", "B", "F#"],
  );
  assert.deepEqual(
    registers[2].freqTicks.labeled.map((e) => e.name),
    ["G", "D", "A"],
  );
  assert.deepEqual(
    registers[1].freqTicks.labeled.map((e) => e.name),
    ["A#", "F", "C"],
  );
});

test("default register is 3 and freqRange/freqTicks alias it", () => {
  assert.equal(defaultRegister, 3);
  assert.deepEqual(freqRange, registers[3].freqRange);
  assert.deepEqual(freqTicks, registers[3].freqTicks);
});
