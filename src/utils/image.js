/**
 * 圖片處理工具
 * 包含圖片下載、Telegraph 上傳、Base64 轉換等功能
 */

import { Cache } from './cache.js';

export const IMAGE_CACHE = new Cache();

export async function fetchImage(url) {
  if (IMAGE_CACHE[url]) {
    return IMAGE_CACHE.get(url);
  }
  return fetch(url)
    .then((resp) => resp.blob())
    .then((blob) => {
      IMAGE_CACHE.set(url, blob);
      return blob;
    });
}

export async function uploadImageToTelegraph(url) {
  if (url.startsWith("https://telegra.ph")) {
    return url;
  }
  
  const raw = await fetchImage(url);
  const formData = new FormData();
  formData.append("file", raw, "blob");
  
  const resp = await fetch("https://telegra.ph/upload", {
    method: "POST",
    body: formData
  });
  
  let [{ src }] = await resp.json();
  src = `https://telegra.ph${src}`;
  IMAGE_CACHE.set(src, raw);
  return src;
}

export async function urlToBase64String(url) {
  try {
    const { Buffer } = await import("node:buffer");
    return fetchImage(url)
      .then((blob) => blob.arrayBuffer())
      .then((buffer) => Buffer.from(buffer).toString("base64"));
  } catch {
    return fetchImage(url)
      .then((blob) => blob.arrayBuffer())
      .then((buffer) => btoa(String.fromCharCode.apply(null, new Uint8Array(buffer))));
  }
}

export function getImageFormatFromBase64(base64String) {
  const firstChar = base64String.charAt(0);
  switch (firstChar) {
    case "/":
      return "jpeg";
    case "i":
      return "png";
    case "R":
      return "gif";
    case "U":
      return "webp";
    default:
      throw new Error("Unsupported image format");
  }
}

export async function imageToBase64String(url) {
  const base64String = await urlToBase64String(url);
  const format = getImageFormatFromBase64(base64String);
  return {
    data: base64String,
    format: `image/${format}`
  };
}

export function renderBase64DataURI(params) {
  return `data:${params.format};base64,${params.data}`;
}
