import * as React from 'react'
import { Text } from '@react-email/components'
import { AuthLayout, authText } from './auth-layout'

interface SignupEmailProps { siteName: string; siteUrl: string; recipient: string; token?: string; confirmationUrl?: string }
export const SignupEmail = ({ siteName, recipient, token }: SignupEmailProps) => (
  <AuthLayout siteName={siteName} title="Confirm your email" preview={`Your six-digit verification code for ${siteName}`} token={token ?? ''}>
    <Text style={authText}>Welcome to {siteName}. Enter this six-digit code in the account form to verify {recipient}. This code expires shortly and can only be used once.</Text>
  </AuthLayout>
)
export default SignupEmail
