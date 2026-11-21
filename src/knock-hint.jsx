// knock-hint.jsx — one-line deadwood reminder under the knock points display

import React from 'react';
import { useT } from './i18n.js';

// ────────────────────────────────────────────────────────────────
// Knock helper — tiny one-line hint shown under the points display
// when the type is 'knock'. Reminds players of the deadwood-≤-10 rule.
// ────────────────────────────────────────────────────────────────
function KnockHint() {
  const { t } = useT();
  return (
    <div style={{
      textAlign: 'center', marginTop: 4,
      fontSize: 11, color: 'rgba(255,255,255,0.45)',
      fontFamily: 'var(--serif)', fontStyle: 'italic',
    }}>
      {t('knockHint')}
    </div>
  );
}

export { KnockHint };
