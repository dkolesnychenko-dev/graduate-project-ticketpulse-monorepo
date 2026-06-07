'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useTranslations } from 'next-intl'

import { Button } from '@/shared/ui'

import { useRoleIntent } from './useRoleIntent'

interface RoleIntentButtonsProps {
  /** Visual variant — `hero` is the big landing CTAs, `nav` is the header. */
  variant?: 'hero' | 'nav'
}

export function RoleIntentButtons({ variant = 'hero' }: RoleIntentButtonsProps) {
  const t = useTranslations('landing.hero')
  const { declareIntent } = useRoleIntent()

  return (
    <ConnectButton.Custom>
      {({ openConnectModal }) =>
        variant === 'hero' ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="xl"
              variant="brand"
              onClick={() => declareIntent('organizer', openConnectModal)}
            >
              {t('ctaOrganizer')}
            </Button>
            <Button
              size="xl"
              variant="outline"
              onClick={() => declareIntent('buyer', openConnectModal)}
            >
              {t('ctaBuyer')}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => declareIntent('organizer', openConnectModal)}
            >
              {t('ctaOrganizer')}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => declareIntent('buyer', openConnectModal)}
            >
              {t('ctaBuyer')}
            </Button>
          </div>
        )
      }
    </ConnectButton.Custom>
  )
}
