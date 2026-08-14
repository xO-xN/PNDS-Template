// Shared constants for both browser pages and the score server.
//
// Works as a plain browser global (window.PNDS) and as a Node module.
//
// Single source of truth:
//   Ports   → manifest.json (browser gets them via __config.js injected by the server)
//   Events  → here (events)
//   Freq    → here (freqRange, freqTicks)
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

  // Frequency range (Hz) of the performer FREQ fader, mapped linearly:
  // fader value 0..1 → freqRange.min..max. Single source of truth for the
  // performer display (freqFromValue) and audio/controller.js mapFreq().
  var freqRange = { min: 1000, max: 3000 };

  // A4 = 440 Hz reference (midi 69).
  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // Pitch-reference scale for the performer FREQ fader. The range
  // (1000–3000 Hz) does not land on notes, so the scale marks the 19 notes
  // that fall inside it (C6 … F#7); the two range endpoints get no tick and
  // no label. Only three notes get letter names: the center note B6 (the
  // semitone tick nearest the range center, 2000 Hz) and its fifth above
  // (F#7) and below (E6) — a chain of fifths E6 → B6 → F#7.
  var freqTicks = (function () {
    var semitones = [];
    for (var midi = 84; midi <= 102; midi += 1) {
      semitones.push(midiToFreq(midi));
    }

    var labeled = [
      { name: "E", midi: 88 }, // B6 下五度
      { name: "B", midi: 95 }, // 中心音（最接近 2000 Hz）
      { name: "F#", midi: 102 }, // B6 上五度
    ].map(function (entry) {
      return { name: entry.name, freq: midiToFreq(entry.midi) };
    });

    return { semitones: semitones, labeled: labeled };
  })();

  return {
    // Read from manifest.json (or __config.js in the browser).
    // Change ports ONLY in manifest.json.
    performerPort: ports.performerPort,
    monitorPort: ports.monitorPort,

    maxClients: 16,
    freqRange: freqRange,

    // Linear fader ↔ Hz helpers (same mapping as freqRange).
    freqFromValue: function (value01) {
      return freqRange.min + value01 * (freqRange.max - freqRange.min);
    },
    freqFraction: function (freq) {
      return (freq - freqRange.min) / (freqRange.max - freqRange.min);
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
