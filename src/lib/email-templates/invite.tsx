import * as React from 'react'
import { Text } from '@react-email/components'
import { AuthLayout, authText } from './auth-layout'

interface InviteEmailProps { siteName: string; siteUrl: string; confirmationUrl: string }
export const InviteEmail = ({ siteName, confirmationUrl }: InviteEmailProps) => (
  <AuthLayout siteName={siteName} title="Your invitation" preview={`You have been invited to ${siteName}`} actionUrl={confirmationUrl} actionLabel="Accept invitation">
    <Text style={authText}>You have been invited to join {siteName}. Accept your invitation to create your account.</Text>
  </AuthLayout>
)
export default InviteEmail
