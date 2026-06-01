const musicTracks = {
  opening: {
    audio: new Audio("/audio/music/opening.mp3"),
    volume: 0.45,
    startAt: 0,
    fadeFrame: null,
  },
  game: {
    audio: new Audio("/audio/music/game-loop.mp3"),
    volume: 0.3,
    startAt: 5,
    fadeFrame: null,
  },
  forest: {
    audio: new Audio("/audio/music/forest.mp3"),
    volume: 0.02,
    startAt: 0,
    fadeFrame: null,
  },
};

const sfxTracks = {
  victory: {
    audio: new Audio("/audio/sfx/victory.mp3"),
    volume: 0.35,
  },
  action: {
    audio: new Audio("/audio/sfx/place-wall.mp3"),
    volume: 1,
  },
  startGame: {
    audio: new Audio("/audio/sfx/button-start-game.mp3"),
    volume: 0.3,
  },
  menuSelect: {
    audio: new Audio("/audio/sfx/hover-button-select.mp3"),
    volume: 0.2,
  },
  gameButton: {
    audio: new Audio("/audio/sfx/ButtonSelect-6.mp3"),
    volume: 0.45,
  },
};

let desiredMusic = null;
let unlockListenersAttached = false;

for (const track of Object.values(musicTracks)) {
  track.audio.loop = true;
  track.audio.preload = "auto";
  track.audio.volume = track.volume;
}

for (const track of Object.values(sfxTracks)) {
  track.audio.preload = "auto";
  track.audio.volume = track.volume;
}

function cancelFade(track) {
  if (track.fadeFrame !== null) {
    cancelAnimationFrame(track.fadeFrame);
    track.fadeFrame = null;
  }
}

function fadeVolume(track, toVolume, durationMs, onDone) {
  cancelFade(track);

  const startTime = performance.now();
  const fromVolume = track.audio.volume;

  if (durationMs <= 0) {
    track.audio.volume = toVolume;
    onDone?.();
    return;
  }

  function step(now) {
    const progress = Math.min((now - startTime) / durationMs, 1);
    track.audio.volume = fromVolume + (toVolume - fromVolume) * progress;

    if (progress < 1) {
      track.fadeFrame = requestAnimationFrame(step);
      return;
    }

    track.fadeFrame = null;
    onDone?.();
  }

  track.fadeFrame = requestAnimationFrame(step);
}

function fadeOut(track, durationMs = 900) {
  if (track.audio.paused) {
    track.audio.currentTime = 0;
    track.audio.volume = track.volume;
    return;
  }

  fadeVolume(track, 0, durationMs, () => {
    track.audio.pause();
    track.audio.currentTime = 0;
    track.audio.volume = track.volume;
  });
}

function attachUnlockListeners() {
  if (unlockListenersAttached) {
    return;
  }

  unlockListenersAttached = true;
  window.addEventListener("pointerdown", retryDesiredMusic, { once: true });
  window.addEventListener("keydown", retryDesiredMusic, { once: true });
  window.addEventListener("touchstart", retryDesiredMusic, { once: true });
}

function retryDesiredMusic() {
  unlockListenersAttached = false;

  if (desiredMusic) {
    playMusicGroup(desiredMusic, { fadeMs: 0 });
  }
}

function playMusicGroup(names, options = {}) {
  const { fadeMs = 900 } = options;
  const trackNames = Array.isArray(names) ? names : [names];
  const activeTrackNames = new Set(trackNames);

  desiredMusic = trackNames;

  for (const [trackName, track] of Object.entries(musicTracks)) {
    if (!activeTrackNames.has(trackName)) {
      fadeOut(track, fadeMs);
    }
  }

  for (const name of trackNames) {
    const track = musicTracks[name];

    cancelFade(track);

    if (track.audio.paused) {
      track.audio.volume = fadeMs > 0 ? 0 : track.volume;
      track.audio.currentTime = track.startAt;
    }

    track.audio
      .play()
      .then(() => {
        fadeVolume(track, track.volume, fadeMs);
      })
      .catch(() => {
        attachUnlockListeners();
      });
  }
}

function stopMusic(name, options = {}) {
  const { fadeMs = 900 } = options;
  const track = musicTracks[name];

  if (desiredMusic === name) {
    desiredMusic = null;
  }

  fadeOut(track, fadeMs);
}

function playSfx(name) {
  const track = sfxTracks[name];

  track.audio.pause();
  track.audio.currentTime = 0;
  track.audio.volume = track.volume;
  track.audio.play().catch(() => {});
}

export function playOpeningMusic() {
  playMusicGroup("opening");
}

export function stopOpeningMusic(options = {}) {
  stopMusic("opening", options);
}

export function playGameMusic() {
  playMusicGroup(["game", "forest"]);
}

export function stopGameMusic(options = {}) {
  stopMusic("game", options);
  stopMusic("forest", options);
}

export function playVictorySound() {
  playSfx("victory");
}

export function playActionSound() {
  playSfx("action");
}

export function playStartGameSound() {
  playSfx("startGame");
}

export function playMenuSelectSound() {
  playSfx("menuSelect");
}

export function playGameButtonSound() {
  playSfx("gameButton");
}
