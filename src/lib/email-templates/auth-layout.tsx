import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'

export function AuthLayout({ siteName = 'Kalzo', title, preview, children, token, actionUrl, actionLabel }: { siteName?: string; title: string; preview: string; children: React.ReactNode; token?: string; actionUrl?: string; actionLabel?: string }) {
  return <Html lang="en" dir="ltr"><Head /><Preview>{preview}</Preview><Body style={styles.body}><Container style={styles.container}><Text style={styles.brand}>{siteName}</Text><Section style={styles.paper}><Heading style={styles.heading}>{title}</Heading>{children}{token && <Text style={styles.code}>{token}</Text>}{actionUrl && actionLabel && <Button href={actionUrl} style={styles.button}>{actionLabel}</Button>}<Text style={styles.footer}>If you did not request this, you can safely ignore this email. Never share a verification code.</Text></Section><Text style={styles.footer}>Kalzo · Team@Kalzo.in</Text></Container></Body></Html>
}
export const authText = { color: '#493429', fontSize: '16px', lineHeight: '1.6', margin: '16px 0' }
const styles = {
  body: { backgroundColor: '#ffffff', fontFamily: 'Georgia, Times New Roman, serif' },
  container: { maxWidth: '560px', padding: '32px 20px' },
  brand: { color: '#493429', fontSize: '24px', margin: '0 0 20px' },
  paper: { backgroundColor: '#fbf1ed', border: '3px double #9c773c', borderRadius: '4px', padding: '28px 24px' },
  heading: { color: '#493429', fontSize: '26px', lineHeight: '1.3', margin: '0 0 16px' },
  code: { color: '#281f1a', backgroundColor: '#ffffff', border: '1px solid #9c773c', fontFamily: 'Courier New, monospace', fontWeight: 'bold' as const, fontSize: '32px', textAlign: 'center' as const, padding: '18px 8px', margin: '24px 0' },
  button: { backgroundColor: '#493429', color: '#ffffff', padding: '14px 22px', borderRadius: '4px', textDecoration: 'none' },
  footer: { color: '#6f5b4b', fontSize: '13px', lineHeight: '1.6', margin: '24px 0 0' },
}
