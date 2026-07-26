import React from 'react';
import { TabletopButton, TabletopModal } from '@/components/game/ui/TabletopModal';

interface VPCardModalProps {
  type: 'printer' | 'constitution';
  onAcknowledge: () => void;
}

export const VPCardModal: React.FC<VPCardModalProps> = ({ type, onAcknowledge }) => {
  return (
    <TabletopModal
      title={type === 'printer' ? 'Printing (1 VP)' : 'Constitution (1 VP)'}
      description="Victory Point Card"
      width="sm"
      footer={<TabletopButton variant="primary" onClick={onAcknowledge} className="w-full">Continue</TabletopButton>}
    >
        <p className="mb-3 text-sm text-[var(--ui-text)]">
          {type === 'printer'
            ? 'You drew Printing, a Victory Point progress card! This card has been automatically played and added +1 VP to your total.'
            : 'You drew Constitution, a Victory Point progress card! This card has been automatically played and added +1 VP to your total.'}
        </p>
        <p className="text-xs text-[var(--ui-muted)]">
          Victory Point cards are automatically played when drawn and cannot be held in your hand.
        </p>
    </TabletopModal>
  );
};
