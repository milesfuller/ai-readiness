import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

/**
 * GET /api/docs
 * 
 * Swagger UI endpoint for interactive API documentation
 * Serves the complete OpenAPI specification with Swagger UI interface
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format')
    
    // Read the OpenAPI specification
    const swaggerPath = join(process.cwd(), 'lib', 'openapi', 'swagger.json')
    const swaggerSpec = JSON.parse(readFileSync(swaggerPath, 'utf8'))
    
    // Return JSON format if requested
    if (format === 'json') {
      return NextResponse.json(swaggerSpec, {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        }
      })
    }
    
    // Default: Return Swagger UI HTML
    const swaggerUIHtml = generateSwaggerUIHtml(swaggerSpec, request.url)
    
    return new NextResponse(swaggerUIHtml, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=3600',
      }
    })
    
  } catch (error) {
    console.error('Error serving API documentation:', error)
    
    return NextResponse.json(
      { 
        error: 'Unable to load API documentation',
        message: 'OpenAPI specification not found or invalid'
      },
      { status: 500 }
    )
  }
}

/**
 * Generate Swagger UI HTML with embedded specification
 */
function generateSwaggerUIHtml(swaggerSpec: any, currentUrl: string): string {
  const baseUrl = currentUrl.replace('/api/docs', '')
  
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Readiness API Documentation</title>
  <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
  <style>
    html {
      box-sizing: border-box;
      overflow: -moz-scrollbars-vertical;
      overflow-y: scroll;
    }
    *,
    *:before,
    *:after {
      box-sizing: inherit;
    }
    body {
      margin: 0;
      background: #fafafa;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .swagger-ui .topbar {
      background-color: #1f2937;
      border-bottom: 1px solid #374151;
    }
    .swagger-ui .topbar .download-url-wrapper {
      display: none;
    }
    .swagger-ui .info {
      margin: 50px 0;
    }
    .swagger-ui .info hgroup.main {
      margin: 0 0 20px 0;
    }
    .swagger-ui .info hgroup.main a {
      font-size: 12px;
    }
    /* Custom styling for better UX */
    .swagger-ui .scheme-container {
      background: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 4px;
      padding: 10px;
      margin: 20px 0;
    }
    .swagger-ui .auth-wrapper {
      display: flex;
      justify-content: center;
      margin: 20px 0;
    }
    /* Rate limiting info styling */
    .rate-limit-info {
      background: #e3f2fd;
      border: 1px solid #2196f3;
      border-radius: 4px;
      padding: 15px;
      margin: 20px 0;
    }
    .rate-limit-info h3 {
      color: #1976d2;
      margin-top: 0;
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  
  <!-- Rate limiting information -->
  <div class="rate-limit-info">
    <h3>🚦 API Rate Limiting</h3>
    <p><strong>General API:</strong> 1,000 requests per hour</p>
    <p><strong>LLM Analysis:</strong> 100 requests per hour</p>
    <p><strong>Voice Upload:</strong> 50 requests per hour</p>
    <p>Rate limits are per authenticated user. Contact support for higher limits.</p>
  </div>

  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      const spec = ${JSON.stringify(swaggerSpec, null, 2)};
      
      // Initialize Swagger UI
      const ui = SwaggerUIBundle({
        spec: spec,
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        defaultModelsExpandDepth: 2,
        defaultModelExpandDepth: 2,
        docExpansion: "list",
        operationsSorter: "alpha",
        tagsSorter: "alpha",
        filter: true,
        supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
        
        // Custom request interceptor for authentication
        requestInterceptor: function(req) {
          // Add any custom headers or authentication logic here
          req.headers['X-Requested-With'] = 'SwaggerUI';
          return req;
        },
        
        // Response interceptor for debugging
        responseInterceptor: function(res) {
          // Log responses for debugging (remove in production)
          console.log('API Response:', res);
          return res;
        },
        
        // OAuth2 configuration (if needed)
        oauth2RedirectUrl: window.location.origin + '/api/docs/oauth2-redirect.html',
        
        // Custom validation
        validatorUrl: null,
        
        // Additional UI configuration
        showExtensions: true,
        showCommonExtensions: true,
        
        // Custom CSS
        customCssUrl: null,
        
        // Try it out by default
        tryItOutEnabled: true,
        
        // Display request duration
        displayRequestDuration: true
      });
      
      // Add custom authentication handler
      ui.preauthorizeApiKey('bearerAuth', 'Bearer YOUR_JWT_TOKEN_HERE');
      
      // Add custom event listeners
      window.ui = ui;
      
      // Add helpful console messages
      console.log('🚀 AI Readiness API Documentation loaded!');
      console.log('📚 Full OpenAPI spec available at: ${baseUrl}/api/docs?format=json');
      console.log('🔐 Authentication: Use the "Authorize" button to add your JWT token');
      console.log('⚡ Rate limits: Check the blue box below for current limits');
      
      // Add custom buttons or functionality
      setTimeout(function() {
        // Add export buttons or other custom UI elements
        const topbar = document.querySelector('.swagger-ui .topbar');
        if (topbar) {
          const exportBtn = document.createElement('button');
          exportBtn.innerHTML = '📥 Export OpenAPI';
          exportBtn.onclick = function() {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(spec, null, 2));
            const downloadAnchorNode = document.createElement('a');
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", "ai-readiness-api.json");
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
          };
          exportBtn.style.cssText = 'margin-left: 10px; padding: 5px 10px; background: #4CAF50; color: white; border: none; border-radius: 3px; cursor: pointer;';
          topbar.appendChild(exportBtn);
        }
      }, 1000);
    };
  </script>
</body>
</html>
  `.trim()
}

/**
 * OPTIONS /api/docs
 * 
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  })
}