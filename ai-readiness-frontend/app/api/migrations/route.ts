import { NextResponse } from 'next/server'
import { runMigrations, getMigrationStatus } from '@/lib/db/migrate'

// This endpoint can be called to manually trigger migrations
// In production, migrations run automatically on startup

export async function GET() {
  try {
    // Get current migration status
    const status = await getMigrationStatus()
    
    return NextResponse.json({
      success: true,
      migrations: status,
      total: status.length
    })
  } catch (error) {
    console.error('Failed to get migration status:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to get migration status' 
      },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    // Check for admin token in production
    if (process.env.NODE_ENV === 'production') {
      const authHeader = request.headers.get('authorization')
      const adminToken = process.env.MIGRATION_ADMIN_TOKEN
      
      if (!adminToken || authHeader !== `Bearer ${adminToken}`) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        )
      }
    }

    // Run migrations
    console.log('🚀 Manually triggering database migrations...')
    const results = await runMigrations()
    
    const summary = {
      total: results.length,
      applied: results.filter(r => r.status === 'applied').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      failed: results.filter(r => r.status === 'failed').length
    }

    return NextResponse.json({
      success: summary.failed === 0,
      summary,
      results
    })
  } catch (error) {
    console.error('Migration failed:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Migration failed' 
      },
      { status: 500 }
    )
  }
}