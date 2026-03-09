function createId(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 11)}`;
}

export function normalizedPoint(pointer, width, height) {
  return {
    x: Math.max(0, Math.min(pointer.x / width, 1)),
    y: Math.max(0, Math.min(pointer.y / height, 1))
  };
}

export function createDraftAnnotation({ type, page, start, color, strokeWidth, opacity, fillColor }) {
  return {
    id: createId(type),
    type,
    page,
    x: start.x,
    y: start.y,
    width: 0.001,
    height: 0.001,
    rotation: 0,
    color,
    strokeWidth,
    opacity,
    text: "",
    fontSize: 18,
    fontFamily: "IBM Plex Sans",
    imageRef: null,
    path: [],
    fillColor,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function finalizeBoxAnnotation(annotation, end) {
  const x = Math.min(annotation.x, end.x);
  const y = Math.min(annotation.y, end.y);
  const width = Math.max(Math.abs(end.x - annotation.x), 0.01);
  const height = Math.max(Math.abs(end.y - annotation.y), 0.01);
  return {
    ...annotation,
    x,
    y,
    width,
    height,
    updatedAt: new Date().toISOString()
  };
}

export function createTextAnnotation({ type, page, point, text, color, opacity }) {
  const isSignature = type === "signature";
  return {
    id: createId(type),
    type,
    page,
    x: point.x,
    y: point.y,
    width: isSignature ? 0.34 : 0.22,
    height: isSignature ? 0.1 : 0.07,
    rotation: 0,
    color,
    strokeWidth: 1,
    opacity,
    text,
    fontSize: isSignature ? 24 : 18,
    fontFamily: isSignature ? "Baskerville" : "IBM Plex Sans",
    imageRef: null,
    path: [],
    fillColor: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function createImageAnnotation({ page, point, imageRef }) {
  return {
    id: createId("image"),
    type: "image",
    page,
    x: point.x,
    y: point.y,
    width: 0.2,
    height: 0.12,
    rotation: 0,
    color: "#ffffff",
    strokeWidth: 1,
    opacity: 1,
    text: "",
    fontSize: 16,
    fontFamily: "IBM Plex Sans",
    imageRef,
    path: [],
    fillColor: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function updateFreehandPath(annotation, point) {
  return {
    ...annotation,
    path: [...annotation.path, point],
    updatedAt: new Date().toISOString()
  };
}

export function dataUrlFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}
