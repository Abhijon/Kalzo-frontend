import * as React from 'react'
import { Text } from '@react-email/components'
import { AuthLayout, authText } from './auth-layout'

interface RecoveryEmailProps { siteName: string; confirmationUrl: string }
export const RecoveryEmail = ({ siteName, confirmationUrl }: RecoveryEmailProps) => (
  <AuthLayout siteName={siteName} title="Reset your password" preview={`Reset your password for ${siteName}`} actionUrl={confirmationUrl} actionLabel="Reset password">
    <Text style={authText}>We received a request to reset your password. Continue below to choose a new password.</Text>
  </AuthLayout>
)
export default RecoveryEmail
