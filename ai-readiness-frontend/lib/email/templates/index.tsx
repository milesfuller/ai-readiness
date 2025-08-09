import React from 'react'
import {
  Body,
  Button,
  Container,
  Column,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Text,
  Tailwind,
} from '@react-email/components'

// Base email template styles
const baseStyles = {
  main: {
    backgroundColor: '#f6f9fc',
    fontFamily:
      '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  },
  container: {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px 0 48px',
    marginBottom: '40px',
    width: '580px',
  },
  heading: {
    fontSize: '32px',
    lineHeight: '1.3',
    fontWeight: '700',
    color: '#1a1a1a',
  },
  paragraph: {
    fontSize: '16px',
    lineHeight: '26px',
    color: '#525252',
  },
  button: {
    backgroundColor: '#14b8a6',
    borderRadius: '8px',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '600',
    textDecoration: 'none',
    textAlign: 'center' as const,
    display: 'block',
    padding: '12px 24px',
  },
  hr: {
    borderColor: '#e6e6e6',
    margin: '30px 0',
  },
  footer: {
    color: '#8898aa',
    fontSize: '14px',
    lineHeight: '24px',
    marginTop: '32px',
  },
}

// Welcome Email Template
export const WelcomeEmail = ({
  userName,
  actionUrl,
}: {
  userName: string
  actionUrl: string
}) => (
  <Html>
    <Head />
    <Preview>Welcome to AI Readiness Platform</Preview>
    <Tailwind>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <Section className="px-8">
            <Img
              src="https://placeholder.com/logo.png"
              width="48"
              height="48"
              alt="AI Readiness"
              className="mb-4"
            />
            <Heading style={baseStyles.heading}>
              Welcome to AI Readiness, {userName}!
            </Heading>
            <Text style={baseStyles.paragraph}>
              We're excited to have you on board. Your account has been successfully created,
              and you're now ready to start assessing your organization's AI readiness.
            </Text>
            <Section className="my-8">
              <Row>
                <Column align="center">
                  <Button style={baseStyles.button} href={actionUrl}>
                    Get Started
                  </Button>
                </Column>
              </Row>
            </Section>
            <Text style={baseStyles.paragraph}>
              Here's what you can do with AI Readiness Platform:
            </Text>
            <ul>
              <li>Create comprehensive AI readiness surveys</li>
              <li>Analyze your organization's AI maturity</li>
              <li>Generate detailed reports and insights</li>
              <li>Track progress over time</li>
            </ul>
            <Hr style={baseStyles.hr} />
            <Text style={baseStyles.footer}>
              If you have any questions, feel free to reply to this email or visit our{' '}
              <Link href="https://help.aireadiness.com">help center</Link>.
            </Text>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
)

// Survey Invitation Email Template
export const SurveyInvitationEmail = ({
  userName,
  surveyTitle,
  organizationName,
  actionUrl,
  deadline,
}: {
  userName: string
  surveyTitle: string
  organizationName: string
  actionUrl: string
  deadline?: string
}) => (
  <Html>
    <Head />
    <Preview>You've been invited to participate in a survey</Preview>
    <Tailwind>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <Section className="px-8">
            <Heading style={baseStyles.heading}>
              Survey Invitation
            </Heading>
            <Text style={baseStyles.paragraph}>
              Hi {userName},
            </Text>
            <Text style={baseStyles.paragraph}>
              You've been invited by {organizationName} to participate in the following survey:
            </Text>
            <Section className="bg-gray-50 rounded-lg p-6 my-6">
              <Text className="text-xl font-semibold text-gray-900">
                {surveyTitle}
              </Text>
              {deadline && (
                <Text className="text-sm text-gray-600 mt-2">
                  Deadline: {deadline}
                </Text>
              )}
            </Section>
            <Section className="my-8">
              <Row>
                <Column align="center">
                  <Button style={baseStyles.button} href={actionUrl}>
                    Start Survey
                  </Button>
                </Column>
              </Row>
            </Section>
            <Text style={baseStyles.paragraph}>
              Your participation is valuable and will help shape our AI strategy.
              The survey should take approximately 10-15 minutes to complete.
            </Text>
            <Hr style={baseStyles.hr} />
            <Text style={baseStyles.footer}>
              If you have any questions about this survey, please contact your survey administrator.
            </Text>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
)

// Report Ready Email Template
export const ReportReadyEmail = ({
  userName,
  reportTitle,
  reportType,
  actionUrl,
}: {
  userName: string
  reportTitle: string
  reportType: string
  actionUrl: string
}) => (
  <Html>
    <Head />
    <Preview>Your {reportType} report is ready</Preview>
    <Tailwind>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <Section className="px-8">
            <Heading style={baseStyles.heading}>
              Your Report is Ready!
            </Heading>
            <Text style={baseStyles.paragraph}>
              Hi {userName},
            </Text>
            <Text style={baseStyles.paragraph}>
              Great news! Your {reportType} report has been generated and is ready for review.
            </Text>
            <Section className="bg-teal-50 border-l-4 border-teal-400 p-4 my-6">
              <Text className="font-semibold text-gray-900">
                {reportTitle}
              </Text>
              <Text className="text-sm text-gray-600 mt-1">
                Generated on {new Date().toLocaleDateString()}
              </Text>
            </Section>
            <Section className="my-8">
              <Row>
                <Column align="center">
                  <Button style={baseStyles.button} href={actionUrl}>
                    View Report
                  </Button>
                </Column>
              </Row>
            </Section>
            <Text style={baseStyles.paragraph}>
              This report includes detailed insights and recommendations based on the latest survey responses.
            </Text>
            <Hr style={baseStyles.hr} />
            <Text style={baseStyles.footer}>
              Reports are available for 30 days. You can download a PDF copy for your records.
            </Text>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
)

// Password Reset Email Template
export const PasswordResetEmail = ({
  userName,
  actionUrl,
  expiryTime,
}: {
  userName: string
  actionUrl: string
  expiryTime: string
}) => (
  <Html>
    <Head />
    <Preview>Reset your password</Preview>
    <Tailwind>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <Section className="px-8">
            <Heading style={baseStyles.heading}>
              Password Reset Request
            </Heading>
            <Text style={baseStyles.paragraph}>
              Hi {userName},
            </Text>
            <Text style={baseStyles.paragraph}>
              We received a request to reset your password. Click the button below to create a new password:
            </Text>
            <Section className="my-8">
              <Row>
                <Column align="center">
                  <Button style={baseStyles.button} href={actionUrl}>
                    Reset Password
                  </Button>
                </Column>
              </Row>
            </Section>
            <Text style={baseStyles.paragraph}>
              This link will expire in {expiryTime}. If you didn't request this password reset,
              you can safely ignore this email.
            </Text>
            <Hr style={baseStyles.hr} />
            <Text style={baseStyles.footer}>
              For security reasons, this password reset link will only work once.
              If you need to reset your password again, please request a new link.
            </Text>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
)

// System Alert Email Template
export const SystemAlertEmail = ({
  userName,
  alertType,
  alertMessage,
  severity,
  actionUrl,
  actionLabel,
}: {
  userName: string
  alertType: string
  alertMessage: string
  severity: 'info' | 'warning' | 'error'
  actionUrl?: string
  actionLabel?: string
}) => {
  const severityColors = {
    info: 'blue',
    warning: 'yellow',
    error: 'red',
  }
  
  const color = severityColors[severity]
  
  return (
    <Html>
      <Head />
      <Preview>System Alert: {alertType}</Preview>
      <Tailwind>
        <Body style={baseStyles.main}>
          <Container style={baseStyles.container}>
            <Section className="px-8">
              <Section className={`bg-${color}-50 border-l-4 border-${color}-500 p-4 mb-6`}>
                <Text className={`font-semibold text-${color}-900 uppercase text-sm`}>
                  {severity} Alert
                </Text>
                <Text className="text-gray-900 font-semibold text-lg mt-1">
                  {alertType}
                </Text>
              </Section>
              <Text style={baseStyles.paragraph}>
                Hi {userName},
              </Text>
              <Text style={baseStyles.paragraph}>
                {alertMessage}
              </Text>
              {actionUrl && actionLabel && (
                <Section className="my-8">
                  <Row>
                    <Column align="center">
                      <Button style={baseStyles.button} href={actionUrl}>
                        {actionLabel}
                      </Button>
                    </Column>
                  </Row>
                </Section>
              )}
              <Hr style={baseStyles.hr} />
              <Text style={baseStyles.footer}>
                This is an automated system notification. If you believe this alert was sent in error,
                please contact support.
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

// Weekly Digest Email Template
export const WeeklyDigestEmail = ({
  userName,
  weekStart,
  weekEnd,
  stats,
  actionUrl,
}: {
  userName: string
  weekStart: string
  weekEnd: string
  stats: {
    surveysCompleted: number
    responsesReceived: number
    reportsGenerated: number
    activeUsers: number
  }
  actionUrl: string
}) => (
  <Html>
    <Head />
    <Preview>Your weekly AI Readiness digest</Preview>
    <Tailwind>
      <Body style={baseStyles.main}>
        <Container style={baseStyles.container}>
          <Section className="px-8">
            <Heading style={baseStyles.heading}>
              Weekly Digest
            </Heading>
            <Text style={baseStyles.paragraph}>
              Hi {userName},
            </Text>
            <Text style={baseStyles.paragraph}>
              Here's your weekly summary for {weekStart} - {weekEnd}:
            </Text>
            <Section className="my-6">
              <Row>
                <Column className="text-center p-4">
                  <Text className="text-3xl font-bold text-teal-600">
                    {stats.surveysCompleted}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    Surveys Completed
                  </Text>
                </Column>
                <Column className="text-center p-4">
                  <Text className="text-3xl font-bold text-blue-600">
                    {stats.responsesReceived}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    Responses Received
                  </Text>
                </Column>
                <Column className="text-center p-4">
                  <Text className="text-3xl font-bold text-purple-600">
                    {stats.reportsGenerated}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    Reports Generated
                  </Text>
                </Column>
                <Column className="text-center p-4">
                  <Text className="text-3xl font-bold text-green-600">
                    {stats.activeUsers}
                  </Text>
                  <Text className="text-sm text-gray-600">
                    Active Users
                  </Text>
                </Column>
              </Row>
            </Section>
            <Section className="my-8">
              <Row>
                <Column align="center">
                  <Button style={baseStyles.button} href={actionUrl}>
                    View Dashboard
                  </Button>
                </Column>
              </Row>
            </Section>
            <Hr style={baseStyles.hr} />
            <Text style={baseStyles.footer}>
              You're receiving this because you're subscribed to weekly digests.
              You can update your notification preferences in your account settings.
            </Text>
          </Section>
        </Container>
      </Body>
    </Tailwind>
  </Html>
)