from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import os

ROOT = os.path.dirname(os.path.abspath(__file__))

class FernHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        if self.path.split('?', 1)[0].endswith(('.js', '.wasm')):
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

    def _serve_placeholder(self, status=200, content=b'', content_type='application/javascript', cache='no-store'):
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Cache-Control', cache)
        self.send_header('Content-Length', str(len(content)))
        self.end_headers()
        if content:
            self.wfile.write(content)

    def do_GET(self):
        asset_aliases = {
            '/1gaih/kvvp0i.js': (
                '/node_modules/@mercuryworkshop/scramjet/dist/scramjet.js'
            ),
            '/1gaih/y1uuv2.wasm': (
                '/node_modules/@mercuryworkshop/scramjet/dist/scramjet.wasm'
            ),
            '/kiacl/xrdxxj.js': (
                '/node_modules/@mercuryworkshop/scramjet-controller/dist/controller.api.js'
            ),
        }
        asset_path = self.path.split('?', 1)[0]
        if asset_path in asset_aliases:
            original_path = self.path
            self.path = asset_aliases[asset_path]
            try:
                return super().do_GET()
            finally:
                self.path = original_path

        if self.path.startswith('/api/'):
            self._serve_placeholder(204, b'', 'application/json')
            return

        if self.path.endswith(('.js', '.json', '.css', '.woff2', '.svg', '.png', '.jpg', '.jpeg', '.webp')):
            full_path = os.path.abspath(os.path.join(ROOT, self.path.lstrip('/')))
            if not os.path.exists(full_path):
                if self.path.endswith('.js'):
                    self.send_error(404, 'JavaScript asset not found')
                    return
                if self.path.endswith('.json'):
                    self._serve_placeholder(200, b'{}', 'application/json', 'no-store')
                elif self.path.endswith('.css'):
                    self._serve_placeholder(200, b'', 'text/css', 'no-store')
                else:
                    self._serve_placeholder(200, b'console.info("fern asset fallback loaded");', 'application/javascript', 'no-store')
                return

        if not os.path.exists(self.translate_path(self.path)):
            route_path = self.path.split('?', 1)[0].rstrip('/')
            if not os.path.splitext(os.path.basename(route_path))[1]:
                original_path = self.path
                self.path = '/index.html'
                try:
                    return super().do_GET()
                finally:
                    self.path = original_path

        return super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api/'):
            self._serve_placeholder(204, b'', 'application/json')
            return
        self.send_response(501)
        self.send_header('Content-Type', 'text/plain; charset=utf-8')
        self.end_headers()
        self.wfile.write(b'Unsupported method')

    def log_message(self, format, *args):
        return

if __name__ == '__main__':
    port = 3000
    httpd = ThreadingHTTPServer(('0.0.0.0', port), FernHandler)
    print(f'Serving Fern mirror at http://0.0.0.0:{port}/')
    httpd.serve_forever()
