export const dynamic = 'force-dynamic'

// API Route for LLM Cost Tracking and Usage Monitoring
import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user permissions (admin or org_admin)
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!userProfile || !['admin', 'org_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const timeframe = searchParams.get('timeframe') || '7d'; // 1d, 7d, 30d, 90d
    const groupBy = searchParams.get('groupBy') || 'day'; // hour, day, week, month
    const provider = searchParams.get('provider'); // openai, anthropic
    const surveyId = searchParams.get('surveyId');

    // Check organization access for org_admin users
    const targetOrgId = organizationId || userProfile.organization_id;
    if (userProfile.role === 'org_admin' && targetOrgId !== userProfile.organization_id) {
      return NextResponse.json({ error: 'Access denied to this organization' }, { status: 403 });
    }

    // Calculate date range based on timeframe
    const now = new Date();
    const timeframeMap: Record<string, number> = {
      '1d': 1,
      '7d': 7,
      '30d': 30,
      '90d': 90
    };
    const daysBack = timeframeMap[timeframe] || 7;
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

    // Build base query for API usage logs
    let query = supabase
      .from('api_usage_log')
      .select('*')
      .eq('service_type', 'llm_analysis')
      .gte('timestamp', startDate.toISOString())
      .lte('timestamp', now.toISOString())
      .order('timestamp', { ascending: false });

    if (targetOrgId) {
      query = query.eq('organization_id', targetOrgId);
    }

    if (provider) {
      query = query.eq('provider', provider);
    }

    if (surveyId) {
      query = query.eq('survey_id', surveyId);
    }

    const { data: usageLogs, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching usage logs:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch usage data' }, { status: 500 });
    }

    // Calculate aggregated metrics
    const totalUsage = calculateUsageMetrics(usageLogs || []);
    const timeSeriesData = groupUsageByTime(usageLogs || [], groupBy);
    const providerBreakdown = groupUsageByProvider(usageLogs || []);
    const modelBreakdown = groupUsageByModel(usageLogs || []);
    const surveyBreakdown = groupUsageBySurvey(usageLogs || []);

    // Get current usage thresholds and alerts
    const alerts = await checkUsageAlerts(supabase, targetOrgId, usageLogs || []);

    // Get organization budget/limits if configured
    const { data: orgSettings } = await supabase
      .from('organization_settings')
      .select('api_budget_monthly_cents, api_usage_alerts_enabled')
      .eq('organization_id', targetOrgId)
      .single();

    return NextResponse.json({
      success: true,
      organizationId: targetOrgId,
      timeframe,
      summary: totalUsage,
      timeSeries: timeSeriesData,
      breakdowns: {
        byProvider: providerBreakdown,
        byModel: modelBreakdown,
        bySurvey: surveyBreakdown
      },
      alerts,
      budget: {
        monthlyLimitCents: orgSettings?.api_budget_monthly_cents || null,
        alertsEnabled: orgSettings?.api_usage_alerts_enabled || false
      },
      metadata: {
        dataPoints: usageLogs?.length || 0,
        dateRange: {
          start: startDate.toISOString(),
          end: now.toISOString()
        },
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Cost Tracking Error:', error);
    
    return NextResponse.json({
      error: 'Failed to retrieve cost tracking data',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

// Set usage alerts and budget limits
export async function POST(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user permissions (admin or org_admin)
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role, organization_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!userProfile || !['admin', 'org_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const {
      organizationId,
      monthlyBudgetCents,
      dailyLimitCents,
      alertThresholds,
      enableAlerts
    } = body;

    // Check organization access for org_admin users
    const targetOrgId = organizationId || userProfile.organization_id;
    if (userProfile.role === 'org_admin' && targetOrgId !== userProfile.organization_id) {
      return NextResponse.json({ error: 'Access denied to this organization' }, { status: 403 });
    }

    // Update organization settings
    const { data: updatedSettings, error: updateError } = await supabase
      .from('organization_settings')
      .upsert({
        organization_id: targetOrgId,
        api_budget_monthly_cents: monthlyBudgetCents,
        api_daily_limit_cents: dailyLimitCents,
        api_usage_alerts_enabled: enableAlerts,
        api_alert_thresholds: alertThresholds,
        updated_at: new Date().toISOString(),
        updated_by: user.id
      })
      .select()
      .single();

    if (updateError) {
      console.error('Error updating organization settings:', updateError);
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
    }

    // Log the settings change
    await supabase
      .from('audit_log')
      .insert({
        organization_id: targetOrgId,
        user_id: user.id,
        action: 'api_budget_updated',
        details: {
          monthlyBudgetCents,
          dailyLimitCents,
          alertThresholds,
          enableAlerts
        },
        timestamp: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      settings: updatedSettings,
      message: 'API usage settings updated successfully'
    });

  } catch (error) {
    console.error('Update Settings Error:', error);
    
    return NextResponse.json({
      error: 'Failed to update usage settings',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    }, { status: 500 });
  }
}

// Helper functions for usage calculations

function calculateUsageMetrics(logs: any[]) {
  if (!logs.length) {
    return {
      totalCostCents: 0,
      totalTokens: 0,
      totalRequests: 0,
      averageLatencyMs: 0,
      successRate: 0,
      errorRate: 0
    };
  }

  const totalCostCents = logs.reduce((sum, log) => sum + (log.cost_estimate_cents || 0), 0);
  const totalTokens = logs.reduce((sum, log) => sum + (log.tokens_used || 0), 0);
  const totalRequests = logs.length;
  const averageLatencyMs = logs.reduce((sum, log) => sum + (log.processing_time_ms || 0), 0) / totalRequests;
  const successfulRequests = logs.filter(log => log.status === 'success').length;
  const successRate = (successfulRequests / totalRequests) * 100;
  const errorRate = ((totalRequests - successfulRequests) / totalRequests) * 100;

  return {
    totalCostCents: Math.round(totalCostCents),
    totalTokens,
    totalRequests,
    averageLatencyMs: Math.round(averageLatencyMs),
    successRate: Math.round(successRate * 100) / 100,
    errorRate: Math.round(errorRate * 100) / 100
  };
}

function groupUsageByTime(logs: any[], groupBy: string) {
  const grouped: Record<string, any> = {};

  logs.forEach(log => {
    const date = new Date(log.timestamp);
    let key: string;

    switch (groupBy) {
      case 'hour':
        key = date.toISOString().slice(0, 13); // YYYY-MM-DDTHH
        break;
      case 'day':
        key = date.toISOString().slice(0, 10); // YYYY-MM-DD
        break;
      case 'week':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().slice(0, 10);
        break;
      case 'month':
        key = date.toISOString().slice(0, 7); // YYYY-MM
        break;
      default:
        key = date.toISOString().slice(0, 10);
    }

    if (!grouped[key]) {
      grouped[key] = {
        timestamp: key,
        costCents: 0,
        tokens: 0,
        requests: 0,
        errors: 0
      };
    }

    grouped[key].costCents += log.cost_estimate_cents || 0;
    grouped[key].tokens += log.tokens_used || 0;
    grouped[key].requests += 1;
    if (log.status !== 'success') {
      grouped[key].errors += 1;
    }
  });

  return Object.values(grouped).sort((a: any, b: any) => a.timestamp.localeCompare(b.timestamp));
}

function groupUsageByProvider(logs: any[]) {
  const grouped: Record<string, any> = {};

  logs.forEach(log => {
    const provider = log.provider;
    if (!grouped[provider]) {
      grouped[provider] = {
        provider,
        costCents: 0,
        tokens: 0,
        requests: 0,
        errors: 0
      };
    }

    grouped[provider].costCents += log.cost_estimate_cents || 0;
    grouped[provider].tokens += log.tokens_used || 0;
    grouped[provider].requests += 1;
    if (log.status !== 'success') {
      grouped[provider].errors += 1;
    }
  });

  return Object.values(grouped);
}

function groupUsageByModel(logs: any[]) {
  const grouped: Record<string, any> = {};

  logs.forEach(log => {
    const model = log.model_name;
    if (!grouped[model]) {
      grouped[model] = {
        model,
        costCents: 0,
        tokens: 0,
        requests: 0,
        errors: 0
      };
    }

    grouped[model].costCents += log.cost_estimate_cents || 0;
    grouped[model].tokens += log.tokens_used || 0;
    grouped[model].requests += 1;
    if (log.status !== 'success') {
      grouped[model].errors += 1;
    }
  });

  return Object.values(grouped);
}

function groupUsageBySurvey(logs: any[]) {
  const grouped: Record<string, any> = {};

  logs.forEach(log => {
    const surveyId = log.survey_id || 'unknown';
    if (!grouped[surveyId]) {
      grouped[surveyId] = {
        surveyId,
        costCents: 0,
        tokens: 0,
        requests: 0,
        errors: 0
      };
    }

    grouped[surveyId].costCents += log.cost_estimate_cents || 0;
    grouped[surveyId].tokens += log.tokens_used || 0;
    grouped[surveyId].requests += 1;
    if (log.status !== 'success') {
      grouped[surveyId].errors += 1;
    }
  });

  return Object.values(grouped).filter((item: any) => item.surveyId !== 'unknown');
}

async function checkUsageAlerts(supabase: any, organizationId: string, logs: any[]) {
  const alerts = [];

  // Get current month usage
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthLogs = logs.filter(log => new Date(log.timestamp) >= monthStart);
  const monthCost = monthLogs.reduce((sum, log) => sum + (log.cost_estimate_cents || 0), 0);

  // Get today's usage
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayLogs = logs.filter(log => new Date(log.timestamp) >= todayStart);
  const todayCost = todayLogs.reduce((sum, log) => sum + (log.cost_estimate_cents || 0), 0);

  // Get organization settings for alert thresholds
  const { data: settings } = await supabase
    .from('organization_settings')
    .select('api_budget_monthly_cents, api_daily_limit_cents, api_alert_thresholds')
    .eq('organization_id', organizationId)
    .single();

  if (settings) {
    // Check monthly budget alerts
    if (settings.api_budget_monthly_cents) {
      const monthlyThreshold = settings.api_budget_monthly_cents;
      const monthlyUsagePercent = (monthCost / monthlyThreshold) * 100;

      if (monthlyUsagePercent >= 90) {
        alerts.push({
          type: 'monthly_budget',
          severity: 'critical',
          message: `Monthly API budget is ${Math.round(monthlyUsagePercent)}% used (${monthCost}¢ of ${monthlyThreshold}¢)`,
          usagePercent: monthlyUsagePercent
        });
      } else if (monthlyUsagePercent >= 75) {
        alerts.push({
          type: 'monthly_budget',
          severity: 'warning',
          message: `Monthly API budget is ${Math.round(monthlyUsagePercent)}% used (${monthCost}¢ of ${monthlyThreshold}¢)`,
          usagePercent: monthlyUsagePercent
        });
      }
    }

    // Check daily limit alerts
    if (settings.api_daily_limit_cents && todayCost >= settings.api_daily_limit_cents) {
      alerts.push({
        type: 'daily_limit',
        severity: 'critical',
        message: `Daily API limit reached: ${todayCost}¢ of ${settings.api_daily_limit_cents}¢`,
        usagePercent: (todayCost / settings.api_daily_limit_cents) * 100
      });
    }

    // Check error rate alerts
    const recentLogs = logs.slice(0, 50); // Last 50 requests
    if (recentLogs.length >= 10) {
      const errorRate = (recentLogs.filter(log => log.status !== 'success').length / recentLogs.length) * 100;
      if (errorRate >= 20) {
        alerts.push({
          type: 'error_rate',
          severity: 'warning',
          message: `High error rate detected: ${Math.round(errorRate)}% in recent requests`,
          errorRate
        });
      }
    }
  }

  return alerts;
}