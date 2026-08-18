const assert = require("node:assert/strict");
const test = require("node:test");

const {
  AudioEngine,
  resolveOutputBus,
  resolveOutputChannels,
} = require("../lib/audio-engine");
const {
  mapFreq,
  mapAmp,
  resolveRegister,
  defaultOutChannel,
  validateOutChannel,
} = require("../audio/controller");

test("resolveOutputBus honours the PNDS contract", () => {
  assert.equal(resolveOutputBus({}), 0);
  assert.equal(resolveOutputBus({ PNDS_AUDIO_OUTPUT_BUS: "" }), 0);
  assert.equal(resolveOutputBus({ PNDS_AUDIO_OUTPUT_BUS: "2" }), 2);

  assert.throws(() => resolveOutputBus({ PNDS_AUDIO_OUTPUT_BUS: "-1" }));
  assert.throws(() => resolveOutputBus({ PNDS_AUDIO_OUTPUT_BUS: "left" }));
});

test("resolveOutputChannels falls back to manifest, then to 2", () => {
  assert.equal(
    resolveOutputChannels({}, { audio: { outputChannels: 16 } }),
    16,
  );
  assert.equal(resolveOutputChannels({}, {}), 2);
  assert.equal(
    resolveOutputChannels({ PNDS_AUDIO_OUTPUT_CHANNELS: "8" }, {}),
    8,
  );

  assert.throws(() =>
    resolveOutputChannels({ PNDS_AUDIO_OUTPUT_CHANNELS: "0" }, {}),
  );
  assert.throws(() =>
    resolveOutputChannels({ PNDS_AUDIO_OUTPUT_CHANNELS: "65" }, {}),
  );
});

test("engine commands after stop() are no-ops (shutdown race)", async () => {
  const engine = new AudioEngine({
    mode: "none",
    target: "127.0.0.1:57110",
    projectRoot: ".",
    manifest: {},
    environment: {},
  });

  await engine.start();
  await engine.stop();

  // Late voice releases from the protocol's disconnect handler arrive
  // while the transport is already closed — they must not throw.
  await engine.freeNode(1001);
  await engine.setControls(1001, { amp: 0 });
  await engine.send("/c1/amp", [0]);
});

const { freqRange } = require("../public/shared");

function midFreq(value01) {
  return Math.round(
    freqRange.min + value01 * (freqRange.max - freqRange.min),
  );
}

test("mapFreq maps the fader 0..1 to the freqRange from shared.js", () => {
  assert.equal(mapFreq(0), Math.round(freqRange.min));
  assert.equal(mapFreq(1), Math.round(freqRange.max));
  assert.equal(mapFreq(0.5), midFreq(0.5));
  assert.equal(mapFreq(-1), Math.round(freqRange.min));   // clamped
  assert.equal(mapFreq(2), Math.round(freqRange.max));    // clamped
});

const { registers } = require("../public/shared");

test("mapFreq maps over the selected register's band", () => {
  assert.equal(mapFreq(0, 1), Math.round(registers[1].freqRange.min));
  assert.equal(mapFreq(1, 1), Math.round(registers[1].freqRange.max));
  assert.equal(mapFreq(0, 2), Math.round(registers[2].freqRange.min));
  assert.equal(mapFreq(1, 2), Math.round(registers[2].freqRange.max));
  assert.equal(
    mapFreq(0.5, 2),
    Math.round(
      registers[2].freqRange.min +
        0.5 * (registers[2].freqRange.max - registers[2].freqRange.min),
    ),
  );
  assert.equal(mapFreq(0.5, 99), mapFreq(0.5)); // invalid register -> default
});

test("resolveRegister coerces 1|2|3 and defaults to 3", () => {
  assert.equal(resolveRegister(1), 1);
  assert.equal(resolveRegister("2"), 2);
  assert.equal(resolveRegister(3), 3);
  assert.equal(resolveRegister(undefined), 3);
  assert.equal(resolveRegister(null), 3);
  assert.equal(resolveRegister(0), 3);
  assert.equal(resolveRegister("x"), 3);
});

test("mapAmp applies an audio-taper (squared) curve", () => {
  assert.equal(mapAmp(0), 0);
  assert.equal(mapAmp(1), 1);
  assert.equal(mapAmp(0.5), 0.25);
  assert.ok(Math.abs(mapAmp(0.1) - 0.01) < 1e-12); // 0.1^2 is not exact in binary
  assert.equal(mapAmp(-1), 0);
  assert.equal(mapAmp(2), 1);
});

test("defaultOutChannel: odd ids to channel 1, even ids to channel 2", () => {
  assert.equal(defaultOutChannel(1), 1);
  assert.equal(defaultOutChannel(2), 2);
  assert.equal(defaultOutChannel(3), 1);
  assert.equal(defaultOutChannel(16), 2);
});

test("validateOutChannel rejects out-of-range channels", () => {
  assert.equal(validateOutChannel(1, 16), 1);
  assert.equal(validateOutChannel(16, 16), 16);

  assert.throws(() => validateOutChannel(0, 16));
  assert.throws(() => validateOutChannel(17, 16));
  assert.throws(() => validateOutChannel("x", 16));
});
