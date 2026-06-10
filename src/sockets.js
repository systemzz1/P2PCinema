export function initSockets(io) {
  let isStreamActive = false;
  let hostSocketId = null;
  let roomEmotesEnabled = true;
  let roomSoundsEnabled = true;
  let currentStreamTitle = "Waiting for Host...";

  io.on('connection', (socket) => {
    socket.emit('room-emotes-toggled', roomEmotesEnabled);
    socket.emit('room-sounds-toggled', roomSoundsEnabled);
    socket.emit('stream-title-updated', currentStreamTitle);

    if (isStreamActive && hostSocketId) {
      socket.emit('stream-started');
    }

    socket.on('request-stream-start', (callback) => {
      if (isStreamActive && hostSocketId && hostSocketId !== socket.id) {
        if (callback) callback({ error: "Another Host is already streaming on this server." });
      } else {
        if (callback) callback({ success: true });
      }
    });

    socket.on('host-stream-ready', () => {
      socket.broadcast.emit('host-stream-ready');
    });

    socket.on('stream-started', () => {
      isStreamActive = true;
      hostSocketId = socket.id;
      socket.broadcast.emit('stream-started');
    });

    socket.on('stream-ended', () => {
      isStreamActive = false;
      hostSocketId = null;
      socket.broadcast.emit('host-stream-ended');
    });

    socket.on('guest-request-stream', () => {
      if (hostSocketId) {
        io.to(hostSocketId).emit('request-offer-for-new-guest', { guestId: socket.id });
      }
    });

    socket.on('webrtc-offer', (data) => {
      io.to(data.targetId).emit('webrtc-offer', {
        offer: data.offer,
        hostId: socket.id
      });
    });

    socket.on('webrtc-answer-to-host', (data) => {
      io.to(data.hostId).emit('webrtc-answer', {
        answer: data.answer,
        guestId: socket.id
      });
    });

    socket.on('ice-candidate', (data) => {
      io.to(data.targetId).emit('ice-candidate', {
        candidate: data.candidate,
        senderId: socket.id
      });
    });

    socket.on('ice-candidate-forward', (data) => {
      io.to(data.targetId).emit('ice-candidate', {
        candidate: data.candidate,
        senderId: socket.id
      });
    });

    socket.on('webrtc-candidate', (data) => {
      socket.to(data.to).emit('webrtc-candidate', { candidate: data.candidate, from: socket.id });
    });

    socket.on('set-stream-title', (title) => {
      currentStreamTitle = title;
      io.emit('stream-title-updated', title);
    });

    socket.on('broadcast-trivia', (triviaData) => {
      io.emit('trivia-broadcast', triviaData);
    });

    socket.on('chat-message', (data) => {
      io.emit('chat-message', data);
    });

    socket.on('toggle-room-emotes', (enabled) => {
      if (socket.id === hostSocketId) {
        roomEmotesEnabled = enabled;
        io.emit('room-emotes-toggled', enabled);
      }
    });

    socket.on('toggle-room-sounds', (enabled) => {
      if (socket.id === hostSocketId) {
        roomSoundsEnabled = enabled;
        io.emit('room-sounds-toggled', enabled);
      }
    });

    socket.on('spawn-emote', (emote) => {
      if (roomEmotesEnabled) {
        io.emit('spawn-emote', emote);
      }
    });

    socket.on('spawn-sound', (soundId) => {
      if (roomSoundsEnabled) {
        io.emit('spawn-sound', soundId);
      }
    });

    socket.on('disconnect', () => {
      if (socket.id === hostSocketId) {
        isStreamActive = false;
        hostSocketId = null;
        socket.broadcast.emit('host-stream-ended');
      } else if (isStreamActive && hostSocketId) {
        io.to(hostSocketId).emit('peer-disconnected', { peerId: socket.id });
      }
    });
  });
}
