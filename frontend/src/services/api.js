const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";

function buildUrl(path) {
  if (/^https?:\/\//.test(path)) {
    return path;
  }
  if (!API_BASE_URL) {
    return path;
  }
  return new URL(path, API_BASE_URL).toString();
}

async function request(path, options = {}) {
  const response = await fetch(buildUrl(path), {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(options.headers ?? {})
    }
  });

  if (!response.ok) {
    let detail = `Request failed with status ${response.status}.`;
    try {
      const payload = await response.json();
      detail = payload.detail ?? detail;
    } catch {
      detail = response.statusText || detail;
    }
    throw new Error(detail);
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  return response.blob();
}

export function buildAssetUrl(path) {
  return buildUrl(path);
}

export const api = {
  uploadFiles(files) {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    return request("/api/files/upload", { method: "POST", body: formData });
  },
  getDocumentMetadata(documentId) {
    return request(`/api/documents/${documentId}/metadata`);
  },
  getDocumentFileUrl(documentId) {
    return buildUrl(`/api/documents/${documentId}/file`);
  },
  getDocumentThumbnails(documentId) {
    return request(`/api/documents/${documentId}/thumbnails`);
  },
  getDocumentSession(documentId) {
    return request(`/api/documents/${documentId}/session`);
  },
  getAnnotations(documentId) {
    return request(`/api/documents/${documentId}/annotations`);
  },
  saveSession(documentId, session) {
    return request(`/api/documents/${documentId}/session`, {
      method: "POST",
      body: JSON.stringify(session)
    });
  },
  patchSession(documentId, patch) {
    return request(`/api/documents/${documentId}/session`, {
      method: "PATCH",
      body: JSON.stringify(patch)
    });
  },
  reorderPages(documentId, pageOrder) {
    return request(`/api/documents/${documentId}/pages/reorder`, {
      method: "POST",
      body: JSON.stringify({ pageOrder })
    });
  },
  deletePages(documentId, pages) {
    return request(`/api/documents/${documentId}/pages/delete`, {
      method: "POST",
      body: JSON.stringify({ pages })
    });
  },
  rotatePage(documentId, page, degrees) {
    return request(`/api/documents/${documentId}/pages/rotate`, {
      method: "POST",
      body: JSON.stringify({ page, degrees })
    });
  },
  splitDocument(documentId, pages) {
    return request(`/api/documents/${documentId}/pages/split`, {
      method: "POST",
      body: JSON.stringify({ pages })
    });
  },
  mergeDocuments(documentIds) {
    return request("/api/documents/merge", {
      method: "POST",
      body: JSON.stringify({ documentIds })
    });
  },
  exportDocument(documentId) {
    return request(`/api/documents/${documentId}/export`, { method: "POST" });
  }
};
