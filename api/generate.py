from http.server import BaseHTTPRequestHandler
import os
import sys

# Forzar que Vercel encuentre tu carpeta backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.data_generator import generate_daily_sports_data

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            # Configurar la zona horaria correcta
            os.environ['TZ'] = 'America/Guayaquil'
            
            # Ejecutar el cerebro de Antigravity
            generate_daily_sports_data()
            
            # Avisar que todo salió bien
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"success": true, "message": "Partidos de hoy actualizados en Upstash Redis!"}')
        except Exception as e:
            # Capturar cualquier error para saber qué pasó
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            error_msg = f'{{"error": "{str(e)}" }}'
            self.wfile.write(error_msg.encode('utf-8'))
