/**
 * Updated SuperCalculator component with responsive styles for enhanced mobile support
 */

import React, { useState, useMemo } from 'react';

// Historical SG rates by financial year
const SG_RATES: Record<number, number> = {
  1992: 0.03, 1993: 0.03, 1994: 0.04, 1995: 0.05, 1996: 0.06,
  1997: 0.06, 1998: 0.06, 1999: 0.07, 2000: 0.08, 2001: 0.08,
  2002: 0.09, 2003: 0.09, 2004: 0.09, 2005: 0.09, 2006: 0.09,
  2007: 0.09, 2008: 0.09,
};

// SuperCalculator component definition goes here...