// Documentación interactiva de la API con Swagger UI (lee /api/docs/openapi.json).
// Vive bajo /api para quedar fuera del proxy de sesión. Al estar en el mismo origen que la
// aplicación, "Try it out" envía la cookie de sesión del navegador: basta con iniciar sesión
// en MediCitas (o llamar a POST /api/v1/auth/login desde esta misma página).

const SWAGGER_UI = 'https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.32.15';

const PAGINA = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>API de MediCitas</title>
    <link rel="stylesheet" href="${SWAGGER_UI}/swagger-ui.css" />
    <style>body { margin: 0; } .swagger-ui .topbar { display: none; }</style>
  </head>
  <body>
    <div id="documentacion"></div>
    <script src="${SWAGGER_UI}/swagger-ui-bundle.js"></script>
    <script>
      SwaggerUIBundle({
        url: '/api/docs/openapi.json',
        dom_id: '#documentacion',
        docExpansion: 'none',
        deepLinking: true,
        defaultModelsExpandDepth: -1,
        tryItOutEnabled: false,
        withCredentials: true,
      });
    </script>
  </body>
</html>`;

export function GET(): Response {
  return new Response(PAGINA, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
