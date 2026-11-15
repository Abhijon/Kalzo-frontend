import * as React from 'react'
import { Text } from '@react-email/components'
import { AuthLayout, authText } from './auth-layout'

interface MagicLinkEmailProps { siteName: string; token?: string; confirmationUrl?: string }
export const MagicLinkEmail = ({ siteName, token }: MagicLinkEmailProps) => (
  <AuthLayout siteName={siteName} title="Your sign-in code" preview={`Your six-digit sign-in code for ${siteName}`} token={token ?? ''}>
    <Text style={authText}>Enter this six-digit code in the sign-in box to continue. This code expires shortly and can only be used once.</Text>
  </AuthLayout>
)
export default MagicLinkEmail
