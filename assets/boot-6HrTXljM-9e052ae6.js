import "./proxy-runtime-D4ERisGl-9e052ae6.js";
import { S as getSettings } from "./settings-ChUBnUQR-9e052ae6.js";
import EpoxyTransport from "../node_modules/@mercuryworkshop/epoxy-transport/dist/index.mjs";
import LibcurlTransport from "../node_modules/@mercuryworkshop/libcurl-transport/dist/index.mjs";

const workerUrl = new URL(
  "../479c6c.js",
  import.meta.url
);
const scopeUrl = new URL("../", import.meta.url);

function waitForActiveWorker(registration, expectedUrl, timeoutMs) {
  const current = registration.active;
  const matchesExpectedWorker = (worker) =>
    worker?.scriptURL === expectedUrl && worker.state === "activated";
  if (matchesExpectedWorker(current)) return Promise.resolve(current);

  return new Promise((resolve, reject) => {
    const workers = new Set();
    const timeout = setTimeout(() => {
      for (const worker of workers) {
        worker.removeEventListener("statechange", onStateChange);
      }
      registration.removeEventListener("updatefound", onUpdateFound);
      reject(new Error("Timed out waiting for the Scramjet service worker."));
    }, timeoutMs);

    const onStateChange = (event) => {
      const worker = event.currentTarget;
      if (matchesExpectedWorker(registration.active)) {
        clearTimeout(timeout);
        for (const candidate of workers) {
          candidate.removeEventListener("statechange", onStateChange);
        }
        registration.removeEventListener("updatefound", onUpdateFound);
        resolve(registration.active);
      } else if (
        worker.scriptURL === expectedUrl &&
        worker.state === "redundant"
      ) {
        clearTimeout(timeout);
        for (const candidate of workers) {
          candidate.removeEventListener("statechange", onStateChange);
        }
        registration.removeEventListener("updatefound", onUpdateFound);
        reject(new Error("Scramjet service worker became redundant."));
      }
    };

    const watchWorker = (worker) => {
      if (!worker || workers.has(worker)) return;
      workers.add(worker);
      worker.addEventListener("statechange", onStateChange);
      onStateChange({ currentTarget: worker });
    };
    const onUpdateFound = () => watchWorker(registration.installing);
    registration.addEventListener("updatefound", onUpdateFound);
    watchWorker(registration.installing);
    watchWorker(registration.waiting);
    watchWorker(registration.active);
  });
}

class RetryingEpoxyTransport extends EpoxyTransport {
  geforceFallback = null;
  geforceFallbackPromise = null;
  geforceFallbackEnabled = false;

  isGeForceNowHost(hostname) {
    const normalizedHostname = hostname.toLowerCase();
    return (
      normalizedHostname === "geforcenow.com" ||
      normalizedHostname.endsWith(".geforcenow.com")
    );
  }

  async getGeForceFallback() {
    if (!this.geforceFallbackPromise) {
      this.geforceFallbackPromise = (async () => {
        const transport = new EpoxyTransport({ wisp: "wss://anura.pro/" });
        await transport.init();
        this.geforceFallback = transport;
        return transport;
      })();
    }
    return this.geforceFallbackPromise;
  }

  async request(remote, method, body, headers, signal) {
    const hostname = remote.hostname.toLowerCase();
    if (this.geforceFallbackEnabled && this.isGeForceNowHost(hostname)) {
      return this.geforceFallback.request(remote, method, body, headers, signal);
    }

    try {
      return await super.request(remote, method, body, headers, signal);
    } catch (error) {
      const message =
        error instanceof Error
          ? `${error.message} ${error.cause ?? ""}`
          : String(error);
      const canRetry =
        (method === "GET" || method === "HEAD") &&
        body == null &&
        !signal?.aborted &&
        /tls handshake eof|websocket did not open/i.test(message);
      if (!canRetry) throw error;

      await new Promise((resolve) => setTimeout(resolve, 250));
      try {
        return await super.request(remote, method, body, headers, signal);
      } catch (retryError) {
        const retryMessage =
          retryError instanceof Error
            ? `${retryError.message} ${retryError.cause ?? ""}`
            : String(retryError);
        if (
          !this.isGeForceNowHost(hostname) ||
          !/tls handshake eof|websocket did not open/i.test(retryMessage)
        ) {
          throw retryError;
        }

        const fallback = await this.getGeForceFallback();
        const response = await fallback.request(
          remote,
          method,
          body,
          headers,
          signal
        );
        this.geforceFallbackEnabled = true;
        return response;
      }
    }
  }

  connect(url, protocols, requestHeaders, onopen, onmessage, onclose, onerror) {
    const hostname = url.hostname.toLowerCase();
    if (this.geforceFallbackEnabled && this.isGeForceNowHost(hostname)) {
      return this.geforceFallback.connect(
        url,
        protocols,
        requestHeaders,
        onopen,
        onmessage,
        onclose,
        onerror
      );
    }
    return super.connect(
      url,
      protocols,
      requestHeaders,
      onopen,
      onmessage,
      onclose,
      onerror
    );
  }
}

async function bootControllerWithRetry() {
  const controllerApi = globalThis.$scramjetController;
  const scramjet = globalThis.$scramjet;
  if (!controllerApi?.Controller || !scramjet?.defaultConfigDev) {
    throw new Error("Scramjet runtime is not initialized.");
  }
  if (!("serviceWorker" in navigator)) {
    throw new Error("This browser does not support service workers.");
  }

  const settings = getSettings();
  if (!settings || typeof settings !== "object") {
    throw new TypeError("Proxy settings are unavailable.");
  }
  const transportTypes = new Map([
    ["epoxy", RetryingEpoxyTransport],
    ["libcurl", LibcurlTransport],
  ]);
  const Transport = transportTypes.get(settings?.transport);
  if (!Transport) {
    throw new Error(`Unsupported proxy transport: ${settings?.transport}`);
  }
  if (
    settings.rewriterFlags != null &&
    (typeof settings.rewriterFlags !== "object" ||
      Array.isArray(settings.rewriterFlags))
  ) {
    throw new TypeError("Scramjet rewriter flags must be an object.");
  }
  if (typeof settings.wisp !== "string" || !settings.wisp) {
    throw new Error("A Wisp server URL is required to initialize the proxy.");
  }

  const wispUrl = new URL(settings.wisp);
  if (wispUrl.protocol !== "ws:" && wispUrl.protocol !== "wss:") {
    throw new TypeError("The Wisp server URL must use ws:// or wss://.");
  }

  let registration;
  let serviceWorker;
  let lastError;
  let pendingRegistration = globalThis.__swRegistration;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      registration = pendingRegistration
        ? await pendingRegistration
        : await navigator.serviceWorker.register(workerUrl.href, {
            scope: scopeUrl.href,
            updateViaCache: "all",
          });
      serviceWorker = await waitForActiveWorker(
        registration,
        workerUrl.href,
        10000
      );
      break;
    } catch (error) {
      lastError = error;
      pendingRegistration = undefined;
      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }
  }
  if (!registration || !serviceWorker) {
    throw new Error("Failed to activate the Scramjet service worker.", {
      cause: lastError,
    });
  }

  const transport = new Transport({ wisp: wispUrl.toString() });
  const controller = new controllerApi.Controller({
    serviceworker: serviceWorker,
    transport,
    config: {
      scramjetPath: new URL(
        "../node_modules/@mercuryworkshop/scramjet/dist/scramjet.js",
        import.meta.url
      ).pathname,
      wasmPath: new URL(
        "../node_modules/@mercuryworkshop/scramjet/dist/scramjet.wasm",
        import.meta.url
      ).pathname,
      injectPath: new URL(
        "../node_modules/@mercuryworkshop/scramjet-controller/dist/controller.inject.js",
        import.meta.url
      ).pathname,
    },
    scramjetConfig: {
      ...scramjet.defaultConfigDev,
      flags: {
        ...scramjet.defaultConfigDev.flags,
        ...(settings.rewriterFlags ?? {}),
      },
    },
  });
  await controller.wait();
  return controller;
}

export { bootControllerWithRetry, RetryingEpoxyTransport };
