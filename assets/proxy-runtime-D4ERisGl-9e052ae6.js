function loadClassicScript(path, isInitialized) {
  if (isInitialized()) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = new URL(path, import.meta.url).href;
    script.onload = () => {
      if (!isInitialized()) {
        reject(new Error(`Scramjet runtime failed to initialize from ${script.src}`));
        return;
      }
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load ${script.src}`));
    document.head.append(script);
  });
}

await loadClassicScript(
  "../node_modules/@mercuryworkshop/scramjet/dist/scramjet_bundled.js",
  () => Boolean(globalThis.$scramjet)
);
await loadClassicScript(
  "../node_modules/@mercuryworkshop/scramjet-controller/dist/controller.api.js",
  () => Boolean(globalThis.$scramjetController)
);

const { HttpCachePlugin, UrlWatcherPlugin } = await import(
  "../node_modules/@mercuryworkshop/scramjet-utils/dist/scramjet-utils.mjs"
);

const i = globalThis.$scramjetController.ManagedPlugin;
const a = { HttpCachePlugin, UrlWatcherPlugin };

export { a, HttpCachePlugin, UrlWatcherPlugin, i };
