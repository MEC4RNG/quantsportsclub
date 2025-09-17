'use client'
import SwaggerUI from 'swagger-ui-react'
import 'swagger-ui-react/swagger-ui.css'

export default function ApiDocs() {
  return (
    <main style={{ maxWidth: 1200, margin: '40px auto', padding: 16 }}>
      <SwaggerUI url="/api/openapi" />
    </main>
  )
}
