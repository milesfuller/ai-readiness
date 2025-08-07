import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function UIShowcase() {
  return (
    <div className="p-8 text-center">
      <Card>
        <CardHeader>
          <CardTitle>UI Showcase</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Component showcase temporarily disabled due to TypeScript compatibility issues.</p>
          <p className="text-sm text-gray-500 mt-2">
            This component will be re-enabled once all type definitions are properly resolved.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}