import { useState } from 'react'
import {
  startRegistration,
  startAuthentication,
} from '@simplewebauthn/browser'
import { authService } from '../services/authService'
import toast from 'react-hot-toast'

export function useBiometric() {
  const [loading, setLoading] = useState(false)

  /** Called after PIN is set — registers device fingerprint */
  async function registerBiometric(): Promise<boolean> {
    setLoading(true)
    try {
      const options = await authService.getBiometricRegisterOptions()
      const credential = await startRegistration(options)
      await authService.registerBiometric(credential)
      toast.success('Fingerprint registered!')
      return true
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fingerprint registration failed'
      // User cancelled — not an error worth showing
      if (msg.includes('cancelled') || msg.includes('NotAllowed')) return false
      toast.error(msg)
      return false
    } finally {
      setLoading(false)
    }
  }

  /** Called on login page fingerprint button */
  async function loginWithBiometric(
    phone: string,
  ): Promise<{ accessToken: string; refreshToken: string } | null> {
    setLoading(true)
    try {
      const { options, userId } = await authService.getBiometricAuthOptions(phone)
      const credential = await startAuthentication(options as Parameters<typeof startAuthentication>[0])
      const result = await authService.verifyBiometric(userId, credential)
      return result.data
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fingerprint login failed'
      if (!msg.includes('cancelled') && !msg.includes('NotAllowed')) {
        toast.error(msg)
      }
      return null
    } finally {
      setLoading(false)
    }
  }

  return { registerBiometric, loginWithBiometric, loading }
}
