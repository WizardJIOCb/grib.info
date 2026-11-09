"""Temporary loopback CONNECT relay for the existing server ACME client.

Only the official Let's Encrypt production API is reachable. TLS remains
end-to-end; this relay neither reads certificates nor stores credentials.
Forward this port through SSH and set HTTPS_PROXY for certbot only.
"""
import select
import socket
import socketserver

PORT = 18545
ALLOWED = b'acme-v02.api.letsencrypt.org:443'


class Relay(socketserver.BaseRequestHandler):
    def handle(self):
        self.request.settimeout(15)
        header = b''
        while b'\r\n\r\n' not in header and len(header) < 16384:
            chunk = self.request.recv(4096)
            if not chunk:
                return
            header += chunk
        first = header.split(b'\r\n', 1)[0].split()
        if len(first) != 3 or first[0] != b'CONNECT' or first[1].lower() != ALLOWED:
            self.request.sendall(b'HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n')
            return
        try:
            with socket.create_connection(('acme-v02.api.letsencrypt.org', 443), timeout=15) as remote:
                self.request.sendall(b'HTTP/1.1 200 Connection Established\r\n\r\n')
                extra = header.partition(b'\r\n\r\n')[2]
                if extra:
                    remote.sendall(extra)
                sockets = [self.request, remote]
                while True:
                    readable, _, _ = select.select(sockets, [], [], 120)
                    if not readable:
                        return
                    for source in readable:
                        chunk = source.recv(65536)
                        if not chunk:
                            return
                        (remote if source is self.request else self.request).sendall(chunk)
        except (OSError, TimeoutError):
            return


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True


with Server(('127.0.0.1', PORT), Relay) as server:
    print(f'ACME-only relay listening on 127.0.0.1:{PORT}', flush=True)
    server.serve_forever()
