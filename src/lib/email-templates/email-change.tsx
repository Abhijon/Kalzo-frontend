import * as React from 'react'
import { Text } from '@react-email/components'
import { AuthLayout, authText } from './auth-layout'

interface EmailChangeEmailProps { siteName: string; oldEmail: string; email: string; newEmail: string; confirmationUrl: string }
export const EmailChangeEmail = ({ siteName, oldEmail, newEmail, confirmationUrl }: EmailChangeEmailProps) => (
  <AuthLayout siteName={siteName} title="Confirm your new email" preview={`Confirm your email change for ${siteName}`} actionUrl={confirmationUrl} actionLabel="Confirm email change">
    <Text style={authText}>You requested to change your email from {oldEmail} to {newEmail}. Confirm this change below.</Text>
  </AuthLayout>
)
export default EmailChangeEmail
