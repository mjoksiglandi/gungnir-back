import selectors
import socket
import threading


FORWARDS = [
    ("0.0.0.0", 15433, "127.0.0.1", 5433),
    ("0.0.0.0", 16380, "127.0.0.1", 6380),
    ("0.0.0.0", 11884, "127.0.0.1", 1884),
]


def pipe(client: socket.socket, upstream: socket.socket) -> None:
    selector = selectors.DefaultSelector()
    selector.register(client, selectors.EVENT_READ, upstream)
    selector.register(upstream, selectors.EVENT_READ, client)

    try:
        while True:
            events = selector.select()
            if not events:
                continue

            for key, _ in events:
                source = key.fileobj
                target = key.data
                data = source.recv(65536)
                if not data:
                    return
                target.sendall(data)
    finally:
        selector.close()
        try:
            client.close()
        except OSError:
            pass
        try:
            upstream.close()
        except OSError:
            pass


def serve(bind_host: str, bind_port: int, target_host: str, target_port: int) -> None:
    listener = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    listener.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    listener.bind((bind_host, bind_port))
    listener.listen()

    while True:
        client, _ = listener.accept()
        try:
            upstream = socket.create_connection((target_host, target_port), timeout=5)
        except OSError:
            client.close()
            continue
        threading.Thread(target=pipe, args=(client, upstream), daemon=True).start()


def main() -> None:
    for forward in FORWARDS:
        threading.Thread(target=serve, args=forward, daemon=True).start()

    threading.Event().wait()


if __name__ == "__main__":
    main()
