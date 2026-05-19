const fs = require("fs");
const path = require("path");

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function mustContain(src, token, label) {
  if (!src.includes(token)) throw new Error(`Missing ${label}: ${token}`);
}

try {
  const server = read("server/server.js");
  const render = read("public/js/workwear/workwearRender.js");
  const events = read("public/js/workwear/workwearEvents.js");
  const state = read("public/js/workwear/workwearState.js");
  const api = read("public/js/workwear/workwearApi.js");
  const namespace = read("public/js/core/namespace.js");
  const css = read("public/styles.css");

  mustContain(server, "apiRouter.post('/store/product-link-preview'", "store link preview endpoint");
  mustContain(server, "assertStorePreviewUrlSafe", "SSRF URL safety check");
  mustContain(server, "isPrivateStorePreviewIp", "private IP block");
  mustContain(server, "parseStoreProductLinkPreview", "HTML metadata parser");
  mustContain(server, "extractStorePreviewMetaAll", "multi image metadata extraction");
  mustContain(server, "extractStorePreviewHtmlImages", "HTML gallery image extraction");
  mustContain(server, "rankStorePreviewImageCandidates", "product image ranking");
  mustContain(server, "storePreviewImageLooksBad", "logo/placeholder image penalty");
  mustContain(server, "STORE_LINK_PREVIEW_MAX_BYTES", "link preview response size limit");
  mustContain(server, "storeProductLinkPreviewLimiter", "link preview rate limiter");

  mustContain(api, "workwearApiPreviewProductLink", "client link preview API");
  mustContain(render, "workwearProductLinkPreviewState", "link preview UI state");
  mustContain(render, "workwear-link-preview-card", "link preview card UI");
  mustContain(render, "workwear-link-preview-thumbs", "multiple preview image thumbnails");
  mustContain(render, "workwear-image-gallery-preview", "applied gallery image preview UI");
  mustContain(render, "workwear-image-remove-btn", "image remove button UI");
  mustContain(render, 'data-cmax-action="workwear.removeWizardImage"', "wizard image remove action");
  mustContain(render, 'data-cmax-action="workwear.removeProductLinkPreviewImage"', "preview image remove action");
  mustContain(render, 'data-cmax-action="workwear.previewProductLink"', "preview button action");
  mustContain(render, 'data-cmax-action="workwear.applyProductLinkPreview"', "apply preview action");
  mustContain(events, "workwearPreviewProductLink", "preview event handler");
  mustContain(events, "workwearApplyProductLinkPreview", "apply preview handler");
  mustContain(events, "workwearRemoveWizardImage", "remove wizard image handler");
  mustContain(events, "workwearRemoveProductLinkPreviewImage", "remove preview image handler");
  mustContain(events, "mergedImageUrls", "apply all preview images to wizard");
  mustContain(events, "product_link_preview_applied", "preview apply audit");
  mustContain(namespace, "previewProductLink", "preview action namespace");
  mustContain(namespace, "removeWizardImage", "wizard image remove namespace");
  mustContain(namespace, "removeProductLinkPreviewImage", "preview image remove namespace");

  mustContain(state, "updateStoreSizePreset", "size preset update helper");
  mustContain(state, "archiveStoreSizePreset", "size preset archive/delete helper");
  mustContain(state, "restoreStoreSizePreset", "size preset restore helper");
  mustContain(render, "Preseti velicina", "manager size presets section");
  mustContain(render, 'data-cmax-action="workwear.archiveManagerSizePreset"', "size preset archive action");
  mustContain(events, "workwearArchiveManagerSizePreset", "size preset archive handler");
  mustContain(events, "size_preset_deleted", "size preset delete audit");
  mustContain(namespace, "archiveManagerSizePreset", "size preset namespace archive");
  mustContain(css, ".workwear-link-preview-result", "link preview responsive CSS");

  console.log(JSON.stringify({ ok: true, checks: 38 }, null, 2));
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}
