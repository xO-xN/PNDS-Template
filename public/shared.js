// Shared constants for both browser pages and the score server.
//
// Works as a plain browser global (window.PNDS) and as a Node module.
//
// Single source of truth:
//   Ports   → manifest.json (browser gets them via __config.js injected by the server)
//   Events  → here (events)
//   Freq    → here (registers: freqRange + freqTicks per register)
//   Token   → here (tokenKey)

(function (root, factory) {
  if (typeof module !== "undefined" && module.exports) {
    module.exports = factory({ readPorts: readManifestPorts });
  } else {
    root.PNDS = factory({
      readPorts: function () {
        var cfg = root.__PNDS_PORTS__;
        if (!cfg) throw new Error("__PNDS_PORTS__ not set — ensure __config.js loads before shared.js");
        return cfg;
      },
    });
  }
})(typeof self !== "undefined" ? self : this, function (deps) {
  var ports = deps.readPorts();

  // A4 = 440 Hz reference (midi 69).
  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  var NOTE_NAMES = [
    "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B",
  ];

  function noteName(midi) {
    return NOTE_NAMES[((midi % 12) + 12) % 12];
  }

  // Three fader registers (1 = low, 2 = mid, 3 = high) selectable by the
  // 3-position switch on the performer page. Every register has the same
  // shape as the original 1000–3000 Hz range (register 3): the fader maps
  // linearly over its freqRange, the scale marks the 19 notes inside it
  // (the band endpoints are not notes, so the extreme ticks sit just
  // inside the ends), and the center note (tick 12) with its fifth above /
  // below gets a brighter tick and a letter name. Registers descend in
  // fifths: register 2's upper fifth (A5) is two fifths below register 3's
  // center (B6), and register 1's upper fifth (C4) two fifths below
  // register 2's center (D5) — so the centers are B6 / D5 / F3 and each
  // band is 21 semitones lower than the previous one.
  function buildRegister(centerMidi) {
    var shift = (centerMidi - 95) / 12; // semitones relative to register 3
    var factor = Math.pow(2, shift);

    var semitones = [];
    for (var midi = centerMidi - 11; midi <= centerMidi + 7; midi += 1) {
      semitones.push(midiToFreq(midi));
    }

    var labeled = [
      { name: noteName(centerMidi - 7), midi: centerMidi - 7 }, // lower fifth
      { name: noteName(centerMidi), midi: centerMidi }, // center note
      { name: noteName(centerMidi + 7), midi: centerMidi + 7 }, // upper fifth
    ].map(function (entry) {
      return { name: entry.name, freq: midiToFreq(entry.midi) };
    });

    return {
      freqRange: { min: 1000 * factor, max: 3000 * factor },
      freqTicks: { semitones: semitones, labeled: labeled },
    };
  }

  var registers = {
    1: buildRegister(53), // F3 center, fifths A#2 / C4
    2: buildRegister(74), // D5 center, fifths G4 / A5
    3: buildRegister(95), // B6 center, fifths E6 / F#7 (original 1000-3000 Hz)
  };

  // Register 3 is the default (the original 1000–3000 Hz range); these
  // aliases keep code that works with the default register unchanged.
  var defaultRegister = 3;
  var freqRange = registers[defaultRegister].freqRange;
  var freqTicks = registers[defaultRegister].freqTicks;

  return {
    // Read from manifest.json (or __config.js in the browser).
    // Change ports ONLY in manifest.json.
    performerPort: ports.performerPort,
    monitorPort: ports.monitorPort,

    maxClients: 16,

    // The three fader registers (1 = low, 2 = mid, 3 = high) selectable by
    // the performer page's 3-position switch. freqRange / freqTicks below
    // are aliases of registers[defaultRegister].
    registers: registers,
    defaultRegister: defaultRegister,
    freqRange: freqRange,

    // Linear fader ↔ Hz helpers. Pass a register's freqRange to map a
    // non-default register; it defaults to the default register's range.
    freqFromValue: function (value01, range) {
      range = range || freqRange;
      return range.min + value01 * (range.max - range.min);
    },
    freqFraction: function (freq, range) {
      range = range || freqRange;
      return (freq - range.min) / (range.max - range.min);
    },
    freqTicks: freqTicks,

    // Claim token persisted by the performer page so a reconnect recovers
    // the same client id (localStorage key). Rename this when you base a
    // new work on the template — see docs/creator-guide.md.
    tokenKey: "pnds-template-token",

    events: {
      join: "join",
      joined: "joined",
      rejected: "rejected",
      control: "control",
      setOut: "set-out",
      state: "state",
    },
  };
});

// Node: read ports from manifest.json (the single source of truth).
function readManifestPorts() {
  var fs = require("node:fs");
  var path = require("node:path");
  // shared.js lives in public/; the manifest is one directory up.
  var manifestPath = path.join(__dirname, "..", "manifest.json");
  var manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  return {
    performerPort: manifest.scoreServer.performerPort,
    monitorPort: manifest.scoreServer.monitorPort,
  };
}
