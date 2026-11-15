import * as React from 'react'
import { Text } from '@react-email/components'
import { AuthLayout, authText } from './auth-layout'

interface ReauthenticationEmailProps { token: string }
export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <AuthLayout title="Confirm your identity" preview="Your Kalzo verification code" token={token}>
    <Text style={authText}>Enter this code to confirm your identity. This code expires shortly and can only be used once.</Text>
  </AuthLayout>
)
export default ReauthenticationEmail
