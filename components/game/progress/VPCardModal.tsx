import React from 'react';

interface VPCardModalProps {
  type: 'printer' | 'constitution';
  onAcknowledge: () => void;
}

export const VPCardModal: React.FC<VPCardModalProps> = ({ type, onAcknowledge }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 pointer-events-auto">
      <div className="bg-slate-900 border border-amber-500/60 rounded-xl shadow-2xl p-6 w-[360px] text-white">
        <div className="text-sm uppercase tracking-wide text-amber-300 mb-2">Victory Point Card</div>
        <div className="text-xl font-bold text-amber-100 mb-3">
          {type === 'printer' ? 'Printing (1 VP)' : 'Constitution (1 VP)'}
        </div>
        <p className="text-slate-200 text-sm mb-3">
          {type === 'printer'
            ? 'You drew Printing, a Victory Point progress card! This card has been automatically played and added +1 VP to your total.'
            : 'You drew Constitution, a Victory Point progress card! This card has been automatically played and added +1 VP to your total.'}
        </p>
        <p className="text-slate-300 text-xs mb-4">
          Victory Point cards are automatically played when drawn and cannot be held in your hand.
        </p>
        <button
          className="w-full bg-amber-400 text-slate-900 font-semibold py-2 rounded-lg hover:bg-amber-300 transition cursor-pointer"
          onClick={onAcknowledge}
        >
          Continue
        </button>
      </div>
    </div>
  );
};
