# Servidor web local simple en PowerShell
# Inicia un servidor en http://localhost:8080

$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")

try {
    $listener.Start()
    Write-Host "Servidor PREDICT.AI iniciado con éxito."
    Write-Host "Visita: http://localhost:$port/"
    Write-Host "Presiona Ctrl+C para detener el servidor."
    
    $baseDir = $PSScriptRoot
    if ([string]::IsNullOrEmpty($baseDir)) {
        $baseDir = Get-Location
    }

    while ($listener.IsListening) {
        $context = $listener.GetContext()
        $request = $context.Request
        $response = $context.Response
        
        $urlPath = $request.Url.LocalPath
        if ($urlPath -eq "/" -or $urlPath -eq "") {
            $urlPath = "/index.html"
        }
        
        # Remove leading slash and build path
        $cleanPath = $urlPath.TrimStart('/')
        $filePath = [System.IO.Path]::Combine($baseDir, $cleanPath)
        
        if (Test-Path $filePath -PathType Leaf) {
            $bytes = [System.IO.File]::ReadAllBytes($filePath)
            
            # Content-Type header
            if ($filePath.EndsWith(".html")) { $response.ContentType = "text/html; charset=utf-8" }
            elseif ($filePath.EndsWith(".css")) { $response.ContentType = "text/css; charset=utf-8" }
            elseif ($filePath.EndsWith(".js")) { $response.ContentType = "application/javascript; charset=utf-8" }
            elseif ($filePath.EndsWith(".jpg") -or $filePath.EndsWith(".jpeg")) { $response.ContentType = "image/jpeg" }
            elseif ($filePath.EndsWith(".png")) { $response.ContentType = "image/png" }
            
            $response.ContentLength64 = $bytes.Length
            $response.OutputStream.Write($bytes, 0, $bytes.Length)
        } else {
            $response.StatusCode = 404
            $msg = [System.Text.Encoding]::UTF8.GetBytes("Error 404: Archivo no encontrado.")
            $response.ContentLength64 = $msg.Length
            $response.OutputStream.Write($msg, 0, $msg.Length)
        }
        $response.OutputStream.Close()
    }
} catch {
    Write-Error "No se pudo iniciar el servidor: $_"
} finally {
    $listener.Close()
}
