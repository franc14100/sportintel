import http.server
import socketserver
import sys
import webbrowser
import threading
import time

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Desactivar cache para desarrollo
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

# Mapear explícitamente los tipos MIME para evitar fallos de registro en Windows
MyHTTPRequestHandler.extensions_map.update({
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.html': 'text/html',
})

def open_browser(port):
    # Esperar un instante para asegurar que el servidor esté escuchando
    time.sleep(0.8)
    url = f"http://localhost:{port}/frontend/index.html"
    print(f"\n[INFO] Abriendo navegador en: {url}")
    webbrowser.open(url)

def start_server():
    base_port = 8000
    max_port_attempts = 20
    port = base_port
    httpd = None
    
    # IMPORTANTE EN WINDOWS: No activar allow_reuse_address (SO_REUSEADDR)
    # En Windows, SO_REUSEADDR permite secuestrar puertos ocupados en lugar de lanzar error,
    # lo que causa que el servidor se monte sobre un puerto en uso de forma invisible y de un error de respuesta vacía (ERR_EMPTY_RESPONSE).
    
    for attempt in range(max_port_attempts):
        try:
            # Escuchar en 0.0.0.0 para permitir conexiones desde la red local (celular)
            httpd = socketserver.TCPServer(("0.0.0.0", port), MyHTTPRequestHandler)
            break
        except OSError:
            print(f"[Aviso] Puerto {port} ocupado, intentando con el puerto {port + 1}...")
            port += 1
            
    if not httpd:
        print("[ERROR] No se pudo encontrar un puerto libre en el rango 8000-8020.")
        sys.exit(1)
        
    print(f"\n=======================================================")
    print(f" Servidor iniciado correctamente en http://localhost:{port}")
    print(f"=======================================================")
    print(" Presiona Ctrl+C en esta terminal para detener el servidor.")
    
    # Ejecutar la apertura del navegador en un hilo paralelo
    threading.Thread(target=open_browser, args=(port,), daemon=True).start()
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido por el usuario.")
        sys.exit(0)
    except Exception as e:
        print(f"\n[ERROR] Ocurrió un fallo en el servidor: {e}")
        sys.exit(1)

if __name__ == "__main__":
    start_server()
