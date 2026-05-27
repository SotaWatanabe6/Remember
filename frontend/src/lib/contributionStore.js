// Simple in-memory store — holds files until submit
// Clears when browser tab closes

let store = {
  photos: [],  // { file: File, previewUrl: string, caption: string }
  voice: [],   // { file: File, title: string }
};

export function addPhotos(files, caption = null) {
  const newPhotos = files.map((file) => ({
    file,
    id: `pending-${Date.now()}-${Math.random()}`,
    previewUrl: URL.createObjectURL(file),
    caption,
  }));
  store.photos = [...store.photos, ...newPhotos];
  return newPhotos;
}

export function removePhoto(id) {
  store.photos = store.photos.filter((p) => p.id !== id);
}

export function addVoice(file, title) {
  const recording = {
    file,
    id: `voice-${Date.now()}`,
    title,
    previewUrl: URL.createObjectURL(file),
  };
  store.voice = [...store.voice, recording];
  return recording;
}

export function removeVoice(id) {
  store.voice = store.voice.filter((v) => v.id !== id);
}

export function getStore() {
  return store;
}

export function clearStore() {
  store = { photos: [], voice: [] };
}

export function updateVoiceTitle(id, newTitle) {
  store.voice = store.voice.map((v) =>
    v.id === id ? { ...v, title: newTitle } : v
  );
}