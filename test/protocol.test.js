// Protocol contract tests: join / claim / restore / control / set-out
// against a fake ProjectAudio, a real PlayerRegistry and a fake Socket.IO
// — no process spawn, no UDP.
//
// The fake mirrors the real ProjectAudio contract: it stores raw fader
// values and exposes mapped ones (amp = raw²), so any double-mapping in
// the restore path is detectable.

const { test } = require("node:test");
const assert = require("node:assert");

const { PlayerRegistry } = require("../lib/players");
const { attachProtocol } = require("../lib/protocol");
const shared = require("../public/shared");

const { events: EVENTS } = shared;

function clamp01(value) {
  const number = Number(value);

  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0;
}

class FakeProjectAudio {
  constructor() {
    this.voices = new Map();
    this.setControlsCalls = [];
    this.setOutChannelCalls = [];
    this.failAddVoice = false;
  }

  hasVoice(id) {
    return this.voices.has(id);
  }

  async addVoice(id) {
    if (this.failAddVoice) {
      throw new Error("synth creation failed");
    }

    this.voices.set(id, {
      amp: 0,
      rawAmp: 0,
      rawFreq: 0,
      register: shared.defaultRegister,
      out: id % 2 === 1 ? 1 : 2,
    });
  }

  async setControls(id, { amp, freq, range }) {
    const voice = this.voices.get(id);

    voice.rawAmp = clamp01(amp);
    voice.rawFreq = clamp01(freq);
    voice.register = [1, 2, 3].includes(Number(range))
      ? Number(range)
      : shared.defaultRegister;
    voice.amp = voice.rawAmp ** 2;
    this.setControlsCalls.push({ id, amp, freq, range });
  }

  async setOutChannel(id, out) {
    this.voices.get(id).out = out;
    this.setOutChannelCalls.push({ id, out });
  }

  async restoreVoice(id, state) {
    await this.setControls(id, state);
    await this.setOutChannel(id, state.out);
  }

  voiceState(id) {
    const voice = this.voices.get(id);

    if (!voice) {
      return null;
    }

    return {
      amp: voice.rawAmp,
      freq: voice.rawFreq,
      range: voice.register,
      out: voice.out,
    };
  }

  async removeVoice(id) {
    this.voices.delete(id);
  }

  snapshot() {
    return [...this.voices.entries()].map(([id, voice]) => ({
      id,
      amp: voice.amp,
      register: voice.register,
      out: voice.out,
    }));
  }
}

function createHarness({ maxClients = 3 } = {}) {
  const registry = new PlayerRegistry({ maxClients });
  const audio = new FakeProjectAudio();
  const broadcasts = [];
  const io = {
    on(event, handler) {
      assert.strictEqual(event, "connection");
      io.connection = handler;
    },
    emit(event, payload) {
      broadcasts.push({ event, payload });
    },
  };

  attachProtocol(io, { events: EVENTS, registry, projectAudio: audio });

  let nextSocketId = 0;

  function connect() {
    nextSocketId += 1;

    const handlers = new Map();
    const sent = [];
    const socket = {
      id: `socket-${nextSocketId}`,
      disconnected: false,
      on(event, handler) {
        handlers.set(event, handler);
      },
      emit(event, payload) {
        sent.push({ event, payload });
      },
      disconnect() {
        socket.disconnected = true;
      },
    };

    io.connection(socket);

    return {
      socket,
      sent,
      emit(event, payload) {
        const handler = handlers.get(event);

        assert.ok(handler, `no handler registered for '${event}'`);

        return Promise.resolve(handler(payload));
      },
    };
  }

  return { registry, audio, broadcasts, connect };
}

test("join creates a voice, answers joined and broadcasts state", async () => {
  const { audio, broadcasts, connect } = createHarness();
  const connection = connect();

  await connection.emit(EVENTS.join, { token: null });

  const joined = connection.sent.find((m) => m.event === EVENTS.joined);

  assert.ok(joined);
  assert.strictEqual(joined.payload.id, 1);
  assert.strictEqual(joined.payload.recovered, false);
  assert.match(joined.payload.token, /^[0-9a-f]{48}$/);
  assert.ok(audio.hasVoice(1));

  const state = broadcasts.find((m) => m.event === EVENTS.state);

  assert.ok(state);
  assert.strictEqual(state.payload.clients.length, 1);
});

test("join is rejected when the registry is full", async () => {
  const { audio, connect } = createHarness({ maxClients: 1 });
  const first = connect();

  await first.emit(EVENTS.join, { token: null });

  const second = connect();

  await second.emit(EVENTS.join, { token: null });

  const rejected = second.sent.find((m) => m.event === EVENTS.rejected);

  assert.ok(rejected);
  assert.match(rejected.payload.reason, /full/i);
  assert.strictEqual(second.socket.disconnected, true);
  assert.strictEqual(audio.voices.size, 1);
});

test("a failed voice creation releases the id and rejects the client", async () => {
  const { audio, registry, connect } = createHarness({ maxClients: 2 });

  audio.failAddVoice = true;

  const connection = connect();

  await connection.emit(EVENTS.join, { token: null });

  const rejected = connection.sent.find((m) => m.event === EVENTS.rejected);

  assert.ok(rejected);
  assert.strictEqual(connection.socket.disconnected, true);
  assert.strictEqual(registry.size, 0);

  audio.failAddVoice = false;

  const retry = connect();

  await retry.emit(EVENTS.join, { token: null });

  const joined = retry.sent.find((m) => m.event === EVENTS.joined);

  assert.strictEqual(joined.payload.id, 1);
});

test("control forwards the raw payload to setControls", async () => {
  const { audio, broadcasts, connect } = createHarness();
  const connection = connect();

  await connection.emit(EVENTS.join, { token: null });

  const broadcastsBefore = broadcasts.length;

  await connection.emit(EVENTS.control, {
    amp: 0.5,
    freq: 0.25,
    range: 1,
  });

  assert.deepStrictEqual(audio.setControlsCalls.at(-1), {
    id: 1,
    amp: 0.5,
    freq: 0.25,
    range: 1,
  });
  assert.strictEqual(broadcasts.length, broadcastsBefore + 1);
});

test("control from an unregistered socket is ignored", async () => {
  const { audio, connect } = createHarness();
  const connection = connect();

  await connection.emit(EVENTS.control, { amp: 0.5, freq: 0.5 });

  assert.deepStrictEqual(audio.setControlsCalls, []);
  assert.strictEqual(audio.voices.size, 0);
});

test("set-out from an operator socket (explicit id) reassigns that client", async () => {
  // The monitor page never joins — it names the target client instead.
  const { audio, connect } = createHarness();
  const performer = connect();

  await performer.emit(EVENTS.join, { token: null });

  const operator = connect();

  await operator.emit(EVENTS.setOut, { id: 1, out: 4 });

  assert.deepStrictEqual(audio.setOutChannelCalls, [{ id: 1, out: 4 }]);
});

test("set-out followed by a reconnect restores raw values with register", async () => {
  // Regression: the set-out path once persisted already-mapped values and
  // dropped the register — restoring that state double-mapped amp and
  // reset the register to the default.
  const { audio, connect } = createHarness();
  const first = connect();

  await first.emit(EVENTS.join, { token: null });

  const { token } = first.sent.find((m) => m.event === EVENTS.joined).payload;

  await first.emit(EVENTS.control, { amp: 0.5, freq: 0.5, range: 2 });
  await first.emit(EVENTS.setOut, { out: 3 });
  await first.emit("disconnect");

  const second = connect();

  await second.emit(EVENTS.join, { token });

  const joined = second.sent.find((m) => m.event === EVENTS.joined);

  assert.strictEqual(joined.payload.recovered, true);
  assert.strictEqual(joined.payload.id, 1);

  // The restore must re-feed the raw fader values and the register.
  assert.deepStrictEqual(audio.setControlsCalls.at(-1), {
    id: 1,
    amp: 0.5,
    freq: 0.5,
    range: 2,
  });
  assert.deepStrictEqual(audio.setOutChannelCalls.at(-1), {
    id: 1,
    out: 3,
  });
});

test("disconnect persists state and frees the voice", async () => {
  const { audio, connect } = createHarness();
  const connection = connect();

  await connection.emit(EVENTS.join, { token: null });
  await connection.emit(EVENTS.control, { amp: 0.8, freq: 0.6 });
  await connection.emit("disconnect");

  // The disconnect handler frees the voice on a promise chain.
  await new Promise((resolve) => setImmediate(resolve));

  assert.strictEqual(audio.voices.size, 0);
});

test("a join with an unknown token starts from defaults", async () => {
  const { audio, connect } = createHarness();
  const connection = connect();

  await connection.emit(EVENTS.join, {
    token: `unknown-${"a".repeat(24)}`,
  });

  const joined = connection.sent.find((m) => m.event === EVENTS.joined);

  assert.strictEqual(joined.payload.recovered, false);
  assert.deepStrictEqual(audio.setControlsCalls, []);
});
