// Socket.IO performer protocol: join, claim-token identity, reconnect
// restore, control forwarding and state broadcast.
//
// Reusable PNDS core: every work built on the template speaks this
// protocol with its performer and monitor pages. The module owns the
// reconnect-restore rule — voice state is persisted per claim token in
// the shape projectAudio.voiceState() returns (raw fader values, never
// mapped ones) and handed to projectAudio.addVoice() so a reconnect
// births the voice already restored; a voice that still exists is
// re-fed through projectAudio.restoreVoice().
//
// Work-specific semantics stay in audio/controller.js — including the
// shape of a control payload: this module forwards it opaquely and the
// work layer validates and clamps every field it reads. Event names
// come from public/shared.js via the caller, so each work keeps its own
// wire vocabulary.

function attachProtocol(io, { events, registry, projectAudio }) {
  // Last known voice state per claim token, restored when the client
  // reconnects. (Ids are reused after a disconnect; the token is the
  // persistent identity.)
  const lastControls = new Map();

  // Persist the voice's current state under the token that owns it. The
  // token is resolved by voice id, never from the sender's socket: the
  // set-out sender is often the operator, who never joins and would
  // otherwise persist nothing. Call while the assignment and the voice
  // both still exist.
  function persist(id) {
    const token = registry.getTokenById(id);

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
        // State recovery is keyed by the persistent claim token, not the
        // id: ids are reused after a disconnect, the token is the identity.
        const last = lastControls.get(result.token);

        if (!projectAudio.hasVoice(result.id)) {
          // Birth the voice with its persisted state when there is one:
          // creating it with defaults and restoring afterwards passes
          // through audible intermediate states (the restored amp
          // sounding on the default channel). Phones locking mid-show
          // make reconnects a regular event, not an edge case.
          await projectAudio.addVoice(result.id, last);
        } else if (last) {
          // Takeover reconnect that raced the old socket's disconnect —
          // the voice is still alive, re-feed it in place.
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
        // The payload is opaque at this seam — its shape is the work
        // layer's vocabulary; projectAudio validates and clamps every
        // field it reads.
        await projectAudio.setControls(id, payload);

        persist(id);
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

        persist(id);
        broadcastState();
      } catch (error) {
        console.error(`[protocol] set-out failed for client ${id}:`, error);
      }
    });

    socket.on("disconnect", () => {
      const id = registry.findIdBySocket(socket.id);

      if (id === null) {
        // Not a joined performer — or a takeover already rebound this id
        // to the new socket, whose live voice this must not free.
        return;
      }

      console.log(`[protocol] disconnect: client ${id}`);

      // Persist while the assignment and the voice still exist, then
      // free both.
      persist(id);

      registry.releaseBySocket(socket.id);

      projectAudio
        .removeVoice(id)
        .catch((error) => {
          console.error(
            `[protocol] failed to release voice for client ${id}:`,
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
