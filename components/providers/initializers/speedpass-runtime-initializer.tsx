'use client';

import { useSpeedPassRuntimeSync } from '@/hooks/learning';

export function SpeedPassRuntimeInitializer() {
  useSpeedPassRuntimeSync();
  return null;
}

export default SpeedPassRuntimeInitializer;
