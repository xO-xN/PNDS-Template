// Socket.IO performer protocol: join, claim-token identity, reconnect
// restore, control forwarding and state broadcast.
//
// Reusable PNDS core: every work built on the template speaks this
// protocol with its performer and monitor pages. The module owns the
// reconnect-restore rule — voice state is persisted per claim token in
// the shape projectAudio.voiceState() returns and restored through
// projectAudio.restoreVoice(); raw fader values, never mapped ones.
//
// Work-specific semantics (what a control means, how voices sound) stay
// in audio/controller.js. Event names come from public/shared.js via the
// caller, so each work keeps its own wire vocabulary.

function attachProtocol(io, { events, registry, projectAudio }) {
  // Last known voice state per claim token, restored when the client
  // reconnects. (Ids are reused after a disconnect; the token is the
  // persistent identity.)
  const lastControls = new Map();

  function persist(id, token) {
    if (token === null) {
      return;
    }

    const state = projectAudio.voiceState(id);

    if (state) {
      lastControls.set(token, state);
    }
  }

  function broadcastState() {
    io.emit(events.state, {
      clients: projectAudio.snapshot(),
    });
  }

  io.on("connection", (socket) => {
    socket.on(events.join, async (payload) => {
      const result = registry.allocate({
        socketId: socket.id,
        claimToken: payload && payload.token,
      });

      if (result.status === "rejected") {
        console.log(`[protocol] join rejected: ${result.message}`);
        socket.emit(events.rejected, {
          reason: result.message,
        });
        socket.disconnect(true);
        return;
      }

      try {
        if (!projectAudio.hasVoice(result.id)) {
          await projectAudio.addVoice(result.id);
        }

        // State recovery is keyed by the persistent claim token, not the
        // id: ids are reused after a disconnect, the token is the identity.
        const last = lastControls.get(result.token);

        if (last) {
          await projectAudio.restoreVoice(result.id, last);
        }

        console.log(
          `[protocol] join: client ${result.id} (${result.status})`,
        );

        socket.emit(events.joined, {
          id: result.id,
          token: result.token,
          recovered: Boolean(last),
        });

        broadcastState();
      } catch (error) {
        console.error(
          `[protocol] failed to create voice for client ${result.id}:`,
          error,
        );
        registry.release(result.id);
        socket.emit(events.rejected, {
          reason: "Audio voice could not be created.",
        });
        socket.disconnect(true);
      }
    });

    socket.on(events.control, async (payload) => {
      const id = registry.findIdBySocket(socket.id);

      if (id === null) {
        return;
      }

      try {
        await projectAudio.setControls(id, {
          amp: payload && payload.amp,
          freq: payload && payload.freq,
          range: payload && payload.range,
        });

        persist(id, registry.getTokenBySocket(socket.id));
        broadcastState();
      } catch (error) {
        console.error(`[protocol] control failed for client ${id}:`, error);
      }
    });

    socket.on(events.setOut, async (payload) => {
      // Two senders: a performer page reassigns its own voice (no id);
      // the monitor page never joins and names the target client instead.
      const id =
        payload && payload.id !== undefined
          ? Number(payload.id)
          : registry.findIdBySocket(socket.id);

      if (
        !Number.isInteger(id) ||
        id < 1 ||
        !payload ||
        payload.out === undefined
      ) {
        return;
      }

      try {
        await projectAudio.setOutChannel(id, payload.out);

        persist(id, registry.getTokenBySocket(socket.id));
        broadcastState();
      } catch (error) {
        console.error(`[protocol] set-out failed for client ${id}:`, error);
      }
    });

    socket.on("disconnect", () => {
      const released = registry.releaseBySocket(socket.id);

      if (!released) {
        return;
      }

      console.log(`[protocol] disconnect: client ${released.id}`);

      // Persist while the voice still exists, then free it.
      persist(released.id, released.claimToken);

      projectAudio
        .removeVoice(released.id)
        .catch((error) => {
          console.error(
            `[protocol] failed to release voice for client ${released.id}:`,
            error,
          );
        })
        .finally(() => {
          broadcastState();
        });
    });
  });
}

module.exports = {
  attachProtocol,
};
