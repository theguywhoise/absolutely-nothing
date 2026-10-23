importScripts("/node_modules/@mercuryworkshop/scramjet-controller/dist/controller.sw.js");

addEventListener("fetch", (event) => {
  if ($scramjetController.shouldRoute(event)) {
    event.respondWith($scramjetController.route(event));
  }
});
