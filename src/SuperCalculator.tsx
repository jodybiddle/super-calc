import React, { useState, useMemo } from 'react';

// Historical SG rates by financial year
const SG_RATES: Record<number, number> = {
  1992: 0.03, 1993: 0.03, 1994: 0.04, 1995: 0.05, 1996: 0.06,
  1997: 0.06, 1998: 0.06, 1999: 0.07, 2000: 0.08, 2001: 0.08,
  2002: 0.09, 2003: 0.09, 2004: 0.09, 2005: 0.09, 2006: 0.09,
  2007: 0.09, 2008: 0.09, 2009: 0.09, 2010: 0.09, 2011: 0.09,
  2012: 0.09, 2013: 0.09, 2014: 0.0925, 2015: 0.095, 2016: 0.095,
  2017: 0.095, 2018: 0.095, 2019: 0.095, 2020: 0.095, 2021: 0.10,
  2022: 0.105, 2023: 0.11, 2024: 0.115, 2025: 0.12, 2026: 0.12
};

// Historical maximum contribution base (quarterly)
const MAX_CONTRIB_BASE_QUARTERLY: Record<number, number> = {
  1992: 20000, 1993: 21000, 1994: 22000, 1995: 23000, 1996: 24000,
  1997: 25000, 1998: 26000, 1999: 27000, 2000: 28000, 2001: 29000,
  2002: 30560, 2003: 31180, 2004: 32180, 2005: 33120, 2006: 34170,
  2007: 35240, 2008: 36410, 2009: 38180, 2010: 40170, 2011: 42220,
  2012: 43820, 2013: 45750, 2014: 48040, 2015: 49430, 2016: 51620,
  2017: 52760, 2018: 54030, 2019: 55270, 2020: 57090, 2021: 58920,
  2022: 60220, 2023: 60220, 2024: 62500, 2025: 65070, 2026: 62500
};

// Historical concessional contribution caps
const CONCESSIONAL_CAPS: Record<number, number> = {
  2007: 50000, 2008: 50000, 2009: 50000, 2010: 25000, 2011: 25000,
  2012: 25000, 2013: 25000, 2014: 30000, 2015: 30000, 2016: 30000,
  2017: 30000, 2018: 25000, 2019: 25000, 2020: 25000, 2021: 25000,
  2022: 27500, 2023: 27500, 2024: 27500, 2025: 30000, 2026: 30000
};

// Average balances by age for comparison (ATO data 2022)
const AVG_BALANCES_MALE: Record<number, number> = {
  25: 25000, 30: 55000, 35: 95000, 40: 150000, 45: 210000,
  50: 280000, 55: 340000, 60: 380000, 65: 420000
};

const AVG_BALANCES_FEMALE: Record<number, number> = {
  25: 22000, 30: 45000, 35: 75000, 40: 115000, 45: 155000,
  50: 200000, 55: 250000, 60: 290000, 65: 320000
};

// ASFA Retirement Standard (2024) - annual spending
const ASFA_COMFORTABLE_SINGLE = 52085;
const ASFA_COMFORTABLE_COUPLE = 73337;
const ASFA_MODEST_SINGLE = 33134;
const ASFA_MODEST_COUPLE = 47731;

// Age Pension rates (2024) - annual
const AGE_PENSION_SINGLE = 29754;
const AGE_PENSION_COUPLE = 44855;

type TabType = 'estimate' | 'sacrifice' | 'drawdown';
type GenderType = 'male' | 'female';
type RelationshipType = 'single' | 'couple';

interface YearlyDrawdownData {
  year: number;
  age: number;
  balanceStart: number;
  workIncome: number;
  pension: number;
  drawdown: number;
  superContrib: number;
  totalIncome: number;
  balanceEnd: number;
  isWorkingPartTime: boolean;
}

export default function SuperCalculator(): React.ReactElement {
  const [currentAge, setCurrentAge] = useState<number>(58);
  const [currentSalary, setCurrentSalary] = useState<number>(120000);
  const [startAge, setStartAge] = useState<number>(22);
  const [careerBreakYears, setCareerBreakYears] = useState<number>(0);
  const [gender, setGender] = useState<GenderType>('male');
  const [employerAboveSG, setEmployerAboveSG] = useState<number>(0);
  const [returnRate, setReturnRate] = useState<number>(7);
  const [showAdvanced, setShowAdvanced] = useState<boolean>(false);

  // Salary sacrifice inputs
  const [salarySacrificeAmount, setSalarySacrificeAmount] = useState<number>(0);
  const [salarySacrificeYears, setSalarySacrificeYears] = useState<number>(10);

  // Drawdown inputs
  const [retirementAge, setRetirementAge] = useState<number>(65);
  const [annualDrawdown, setAnnualDrawdown] = useState<number>(60000);
  const [includeAgePension, setIncludeAgePension] = useState<boolean>(true);
  const [relationshipStatus, setRelationshipStatus] = useState<RelationshipType>('single');
  const [drawdownReturnRate, setDrawdownReturnRate] = useState<number>(5);

  // Manual super balance input
  const [useManualBalance, setUseManualBalance] = useState<boolean>(false);
  const [manualSuperBalance, setManualSuperBalance] = useState<number>(800000);

  // Part-time work in retirement
  const [includePartTimeWork, setIncludePartTimeWork] = useState<boolean>(false);
  const [partTimeIncome, setPartTimeIncome] = useState<number>(30000);
  const [partTimeYears, setPartTimeYears] = useState<number>(5);
  const [partTimeStartAge, setPartTimeStartAge] = useState<number>(65);

  // Active tab
  const [activeTab, setActiveTab] = useState<TabType>('estimate');

  // Calculate base super results
  const baseResults = useMemo(() => {
    const currentYear = 2026;
    const birthYear = currentYear - currentAge;
    const workStartYear = birthYear + startAge;
    const sgStartYear = Math.max(1992, workStartYear);

    const salaryGrowthRate = 0.04;
    const getSalaryForYear = (year: number): number => {
      const yearsFromNow = currentYear - year;
      return currentSalary / Math.pow(1 + salaryGrowthRate, yearsFromNow);
    };

    let totalBalance = 0;
    let totalContributions = 0;

    for (let year = sgStartYear; year <= currentYear; year++) {
      const age = year - birthYear;

      const breakStartAge = 30;
      const breakEndAge = breakStartAge + careerBreakYears;
      if (age >= breakStartAge && age < breakEndAge) {
        totalBalance = totalBalance * (1 + returnRate / 100);
        continue;
      }

      const salary = getSalaryForYear(year);
      const sgRate = SG_RATES[year] || 0.12;
      const totalRate = sgRate + (employerAboveSG / 100);

      const maxQuarterly = MAX_CONTRIB_BASE_QUARTERLY[year] || 62500;
      const maxAnnual = maxQuarterly * 4;
      const cappedSalary = Math.min(salary, maxAnnual);

      const contribution = cappedSalary * totalRate;
      totalContributions += contribution;

      totalBalance = (totalBalance + contribution) * (1 + returnRate / 100);
    }

    const avgBalances = gender === 'male' ? AVG_BALANCES_MALE : AVG_BALANCES_FEMALE;
    const nearestAge = Math.round(currentAge / 5) * 5;
    const avgBalance = avgBalances[Math.min(65, Math.max(25, nearestAge))] || 300000;

    const ratio = totalBalance / avgBalance;
    let percentile: string;
    if (ratio >= 3) percentile = "top 5%";
    else if (ratio >= 2.5) percentile = "top 10%";
    else if (ratio >= 2) percentile = "top 15%";
    else if (ratio >= 1.5) percentile = "top 25%";
    else if (ratio >= 1.2) percentile = "top 35%";
    else if (ratio >= 1) percentile = "above average";
    else if (ratio >= 0.8) percentile = "near average";
    else if (ratio >= 0.5) percentile = "below average";
    else percentile = "bottom quartile";

    return {
      estimatedBalance: Math.round(totalBalance),
      totalContributions: Math.round(totalContributions),
      investmentGrowth: Math.round(totalBalance - totalContributions),
      avgBalance,
      percentile,
      yearsInSuper: currentYear - sgStartYear
    };
  }, [currentAge, currentSalary, startAge, careerBreakYears, gender, employerAboveSG, returnRate]);

  // Calculate salary sacrifice scenario
  const salarySacrificeResults = useMemo(() => {
    if (salarySacrificeAmount === 0) return null;

    const currentYear = 2026;
    const birthYear = currentYear - currentAge;
    const workStartYear = birthYear + startAge;
    const sgStartYear = Math.max(1992, workStartYear);

    const sacrificeStartYear = currentYear - salarySacrificeYears;

    const salaryGrowthRate = 0.04;
    const getSalaryForYear = (year: number): number => {
      const yearsFromNow = currentYear - year;
      return currentSalary / Math.pow(1 + salaryGrowthRate, yearsFromNow);
    };

    let totalBalance = 0;
    let totalContributions = 0;
    let totalSalarySacrifice = 0;
    let taxSaved = 0;

    for (let year = sgStartYear; year <= currentYear; year++) {
      const age = year - birthYear;

      const breakStartAge = 30;
      const breakEndAge = breakStartAge + careerBreakYears;
      if (age >= breakStartAge && age < breakEndAge) {
        totalBalance = totalBalance * (1 + returnRate / 100);
        continue;
      }

      const salary = getSalaryForYear(year);
      const sgRate = SG_RATES[year] || 0.12;
      const totalRate = sgRate + (employerAboveSG / 100);

      const maxQuarterly = MAX_CONTRIB_BASE_QUARTERLY[year] || 62500;
      const maxAnnual = maxQuarterly * 4;
      const cappedSalary = Math.min(salary, maxAnnual);

      let contribution = cappedSalary * totalRate;

      if (year >= sacrificeStartYear) {
        const concessionalCap = CONCESSIONAL_CAPS[year] || 27500;
        const availableRoom = Math.max(0, concessionalCap - contribution);
        const actualSacrifice = Math.min(salarySacrificeAmount, availableRoom);

        contribution += actualSacrifice;
        totalSalarySacrifice += actualSacrifice;

        let marginalRate = 0.32;
        if (salary > 180000) marginalRate = 0.45;
        else if (salary > 120000) marginalRate = 0.37;
        else if (salary > 45000) marginalRate = 0.325;

        taxSaved += actualSacrifice * (marginalRate - 0.15);
      }

      totalContributions += contribution;
      totalBalance = (totalBalance + contribution) * (1 + returnRate / 100);
    }

    const additionalBalance = totalBalance - baseResults.estimatedBalance;

    return {
      newBalance: Math.round(totalBalance),
      additionalBalance: Math.round(additionalBalance),
      totalSalarySacrifice: Math.round(totalSalarySacrifice),
      taxSaved: Math.round(taxSaved),
      netCost: Math.round(totalSalarySacrifice - taxSaved),
      returnOnSacrifice: totalSalarySacrifice > 0
        ? Math.round((additionalBalance / totalSalarySacrifice) * 100)
        : 0
    };
  }, [baseResults, salarySacrificeAmount, salarySacrificeYears, currentAge, currentSalary, startAge, careerBreakYears, employerAboveSG, returnRate]);

  // Calculate drawdown projection
  const drawdownResults = useMemo(() => {
    // Determine starting point
    let startingBalance: number;
    if (useManualBalance) {
      startingBalance = manualSuperBalance;
    } else if (salarySacrificeResults) {
      startingBalance = salarySacrificeResults.newBalance;
    } else {
      startingBalance = baseResults.estimatedBalance;
    }

    // Project balance to retirement age (only if using estimated balance and not already retired)
    const yearsToRetirement = Math.max(0, retirementAge - currentAge);
    let balanceAtRetirement = startingBalance;

    // Continue growth until retirement if using estimated balance
    if (!useManualBalance && yearsToRetirement > 0) {
      for (let i = 0; i < yearsToRetirement; i++) {
        const maxAnnual = 250000;
        const cappedSalary = Math.min(currentSalary, maxAnnual);
        const contribution = cappedSalary * 0.12;
        balanceAtRetirement = (balanceAtRetirement + contribution) * (1 + returnRate / 100);
      }
    }

    // Age pension eligibility
    const pensionAge = 67;
    const annualPension = relationshipStatus === 'single'
      ? AGE_PENSION_SINGLE
      : AGE_PENSION_COUPLE / 2;

    // Part-time work period
    const partTimeEndAge = includePartTimeWork ? partTimeStartAge + partTimeYears : 0;

    // Drawdown simulation
    let balance = balanceAtRetirement;
    const yearlyData: YearlyDrawdownData[] = [];
    let yearsLasted = 0;
    const maxYears = 40;

    for (let year = 0; year < maxYears && balance > 0; year++) {
      const age = retirementAge + year;
      const receivePension = includeAgePension && age >= pensionAge;

      // Part-time work income
      const isWorkingPartTime = includePartTimeWork && age >= partTimeStartAge && age < partTimeEndAge;
      const workIncome = isWorkingPartTime ? partTimeIncome : 0;

      // Super contributions from part-time work
      const partTimeSuperContrib = isWorkingPartTime ? partTimeIncome * 0.12 : 0;

      // Calculate income sources
      const pensionIncome = receivePension ? annualPension : 0;
      const totalOtherIncome = workIncome + pensionIncome;

      // Net drawdown needed from super
      const drawdownFromSuper = Math.max(0, annualDrawdown - totalOtherIncome);

      // Apply return, add any super contributions, then subtract drawdown
      const investmentReturn = balance * (drawdownReturnRate / 100);
      balance = balance + investmentReturn + partTimeSuperContrib - drawdownFromSuper;

      yearlyData.push({
        year: year + 1,
        age,
        balanceStart: Math.round(balance + drawdownFromSuper - investmentReturn - partTimeSuperContrib),
        workIncome: Math.round(workIncome),
        pension: Math.round(pensionIncome),
        drawdown: Math.round(drawdownFromSuper),
        superContrib: Math.round(partTimeSuperContrib),
        totalIncome: Math.round(annualDrawdown),
        balanceEnd: Math.round(Math.max(0, balance)),
        isWorkingPartTime
      });

      if (balance > 0) yearsLasted = year + 1;
    }

    const superLastsUntilAge = balance > 0 ? retirementAge + maxYears : retirementAge + yearsLasted;

    // Calculate totals
    const totalDrawn = yearlyData.reduce((sum, y) => sum + y.totalIncome, 0);
    const totalWorkIncome = yearlyData.reduce((sum, y) => sum + y.workIncome, 0);
    const totalPensionReceived = yearlyData.reduce((sum, y) => sum + y.pension, 0);
    const totalFromSuper = yearlyData.reduce((sum, y) => sum + y.drawdown, 0);

    // ASFA comparison
    const asfaComfortable = relationshipStatus === 'single'
      ? ASFA_COMFORTABLE_SINGLE
      : ASFA_COMFORTABLE_COUPLE;
    const asfaModest = relationshipStatus === 'single'
      ? ASFA_MODEST_SINGLE
      : ASFA_MODEST_COUPLE;

    let lifestyleRating: string;
    if (annualDrawdown >= asfaComfortable) lifestyleRating = 'comfortable';
    else if (annualDrawdown >= asfaModest) lifestyleRating = 'modest';
    else lifestyleRating = 'below modest';

    return {
      balanceAtRetirement: Math.round(balanceAtRetirement),
      startingBalance: Math.round(startingBalance),
      yearsLasted,
      superLastsUntilAge,
      finalBalance: Math.round(Math.max(0, balance)),
      yearlyData: yearlyData.slice(0, 35),
      totalDrawn: Math.round(totalDrawn),
      totalWorkIncome: Math.round(totalWorkIncome),
      totalPensionReceived: Math.round(totalPensionReceived),
      totalFromSuper: Math.round(totalFromSuper),
      asfaComfortable,
      asfaModest,
      lifestyleRating,
      yearsToRetirement,
      partTimeEndAge
    };
  }, [baseResults, salarySacrificeResults, retirementAge, currentAge, annualDrawdown,
      includeAgePension, relationshipStatus, drawdownReturnRate, currentSalary, returnRate,
      useManualBalance, manualSuperBalance, includePartTimeWork, partTimeIncome,
      partTimeYears, partTimeStartAge]);

  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  return (
    <div className="super-calc-container" style={{
      minHeight: '100vh',
      background: 'linear-gradient(165deg, #f8f6f3 0%, #ebe7e0 50%, #ddd8ce 100%)',
      fontFamily: "'Source Serif 4', 'Georgia', serif",
      color: '#2c2825'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:wght@400;600;700&family=DM+Sans:wght@400;500;600&display=swap');

        .super-calc-container {
          padding: 2rem 1rem;
        }

        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          background: #c4b8a8;
          border-radius: 3px;
          outline: none;
          touch-action: manipulation;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 24px;
          height: 24px;
          background: #8b5a2b;
          border-radius: 50%;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 24px;
          height: 24px;
          background: #8b5a2b;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }

        .tab-btn {
          padding: 0.75rem 1.25rem;
          border: none;
          background: transparent;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.9rem;
          font-weight: 500;
          color: #6b5f54;
          cursor: pointer;
          border-bottom: 3px solid transparent;
          transition: all 0.2s ease;
          white-space: nowrap;
        }
        .tab-btn:hover {
          color: #3d3530;
        }
        .tab-btn.active {
          color: #8b5a2b;
          border-bottom-color: #8b5a2b;
        }

        input[type="number"] {
          width: 100%;
          padding: 0.6rem 0.75rem;
          border: 2px solid #d4cdc2;
          border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 16px;
          color: #3d3530;
          background: #fff;
          transition: border-color 0.2s ease;
        }
        input[type="number"]:focus {
          outline: none;
          border-color: #8b5a2b;
        }
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
          opacity: 1;
        }

        .grid-2-col {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1.25rem;
        }
        .grid-3-col {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
        }
        .grid-4-col {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }
        .balance-buttons {
          display: flex;
          gap: 1rem;
        }
        .tab-nav {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .tab-nav::-webkit-scrollbar {
          display: none;
        }
        .main-title {
          font-size: 2.25rem;
        }
        .main-balance {
          font-size: 3rem;
        }
        .section-balance {
          font-size: 1.75rem;
        }
        .additional-balance {
          font-size: 2.25rem;
        }
        .asfa-labels {
          display: flex;
          justify-content: space-between;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.7rem;
          color: #8b8078;
        }
        .card-padding {
          padding: 1.75rem;
        }
        .results-padding {
          padding: 2rem;
        }

        @media (max-width: 640px) {
          .super-calc-container {
            padding: 1rem 0.75rem;
          }
          .grid-2-col {
            grid-template-columns: 1fr;
            gap: 1rem;
          }
          .grid-3-col {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }
          .grid-4-col {
            grid-template-columns: repeat(2, 1fr);
            gap: 0.75rem;
          }
          .balance-buttons {
            flex-direction: column;
          }
          .tab-btn {
            padding: 0.6rem 0.75rem;
            font-size: 0.8rem;
          }
          .main-title {
            font-size: 1.5rem;
          }
          .main-balance {
            font-size: 2rem;
          }
          .section-balance {
            font-size: 1.25rem;
          }
          .additional-balance {
            font-size: 1.75rem;
          }
          .asfa-labels {
            flex-wrap: wrap;
            gap: 0.25rem;
            justify-content: center;
            text-align: center;
          }
          .asfa-labels span {
            flex: 0 0 auto;
          }
          .card-padding {
            padding: 1rem;
          }
          .results-padding {
            padding: 1.25rem;
          }
        }

        @media (max-width: 480px) {
          .grid-4-col {
            grid-template-columns: 1fr;
          }
          .tab-nav {
            justify-content: flex-start;
            padding: 0 0.5rem;
          }
        }
      `}</style>

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <header style={{ textAlign: 'center', marginBottom: '2rem', padding: '0 0.5rem' }}>
          <h1 className="main-title" style={{
            fontWeight: 700,
            color: '#3d3530',
            marginBottom: '0.5rem',
            letterSpacing: '-0.02em'
          }}>
            Superannuation Estimator
          </h1>
          <p style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: '1rem',
            color: '#6b5f54',
            maxWidth: '550px',
            margin: '0 auto',
            lineHeight: 1.5
          }}>
            Estimate your balance, model salary sacrifice scenarios, and plan your retirement drawdown
          </p>
        </header>

        {/* Tab Navigation */}
        <div className="tab-nav" style={{
          marginBottom: '1.5rem',
          borderBottom: '1px solid #d4cdc2'
        }}>
          <button
            className={`tab-btn ${activeTab === 'estimate' ? 'active' : ''}`}
            onClick={() => setActiveTab('estimate')}
          >
            Current Balance
          </button>
          <button
            className={`tab-btn ${activeTab === 'sacrifice' ? 'active' : ''}`}
            onClick={() => setActiveTab('sacrifice')}
          >
            Salary Sacrifice
          </button>
          <button
            className={`tab-btn ${activeTab === 'drawdown' ? 'active' : ''}`}
            onClick={() => setActiveTab('drawdown')}
          >
            Retirement Drawdown
          </button>
        </div>

        {/* Main Input Card - Show on estimate and sacrifice tabs */}
        {(activeTab === 'estimate' || activeTab === 'sacrifice') && (
          <div className="card-padding" style={{
            background: '#fffefb',
            borderRadius: '16px',
            boxShadow: '0 4px 24px rgba(60, 45, 30, 0.08), 0 1px 3px rgba(60, 45, 30, 0.04)',
            marginBottom: '1.5rem'
          }}>
            <h3 style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.85rem',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: '#5c524a',
              marginBottom: '1.25rem'
            }}>
              Your Details
            </h3>

            {/* Input Grid */}
            <div className="grid-2-col" style={{
              marginBottom: '1.25rem'
            }}>
              {/* Current Age */}
              <div>
                <label style={{
                  display: 'block',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  color: '#6b5f54',
                  marginBottom: '0.4rem'
                }}>
                  Current Age
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input
                    type="range"
                    min="25"
                    max="70"
                    value={currentAge}
                    onChange={(e) => setCurrentAge(Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    color: '#3d3530',
                    minWidth: '2rem'
                  }}>{currentAge}</span>
                </div>
              </div>

              {/* Current Salary */}
              <div>
                <label style={{
                  display: 'block',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  color: '#6b5f54',
                  marginBottom: '0.4rem'
                }}>
                  Current Salary
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input
                    type="range"
                    min="40000"
                    max="500000"
                    step="5000"
                    value={currentSalary}
                    onChange={(e) => setCurrentSalary(Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '0.95rem',
                    fontWeight: 600,
                    color: '#3d3530',
                    minWidth: '5rem',
                    textAlign: 'right'
                  }}>{formatCurrency(currentSalary)}</span>
                </div>
              </div>

              {/* Age Started Work */}
              <div>
                <label style={{
                  display: 'block',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  color: '#6b5f54',
                  marginBottom: '0.4rem'
                }}>
                  Age Started Full-time Work
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input
                    type="range"
                    min="16"
                    max="30"
                    value={startAge}
                    onChange={(e) => setStartAge(Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    color: '#3d3530',
                    minWidth: '2rem'
                  }}>{startAge}</span>
                </div>
              </div>

              {/* Career Break Years */}
              <div>
                <label style={{
                  display: 'block',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  color: '#6b5f54',
                  marginBottom: '0.4rem'
                }}>
                  Years of Career Breaks
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    value={careerBreakYears}
                    onChange={(e) => setCareerBreakYears(Number(e.target.value))}
                    style={{ flex: 1 }}
                  />
                  <span style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    color: '#3d3530',
                    minWidth: '2rem'
                  }}>{careerBreakYears}</span>
                </div>
              </div>
            </div>

            {/* Gender and Advanced row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.8rem',
                  fontWeight: 500,
                  color: '#6b5f54'
                }}>Gender:</span>
                {(['male', 'female'] as const).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGender(g)}
                    style={{
                      padding: '0.4rem 1rem',
                      borderRadius: '6px',
                      border: gender === g ? '2px solid #8b5a2b' : '2px solid #d4cdc2',
                      background: gender === g ? '#f5ebe0' : 'transparent',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '0.85rem',
                      fontWeight: 500,
                      color: gender === g ? '#8b5a2b' : '#6b5f54',
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    {g}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'none',
                  border: 'none',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  color: '#8b5a2b',
                  cursor: 'pointer'
                }}
              >
                <span style={{
                  transform: showAdvanced ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease',
                  fontSize: '0.7rem'
                }}>▶</span>
                Advanced
              </button>
            </div>

            {/* Advanced Options */}
            {showAdvanced && (
              <div className="grid-2-col" style={{
                padding: '1rem',
                background: '#f8f5f0',
                borderRadius: '8px',
                marginTop: '1rem'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: '#6b5f54',
                    marginBottom: '0.4rem'
                  }}>
                    Employer Above SG (%)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="0.5"
                      value={employerAboveSG}
                      onChange={(e) => setEmployerAboveSG(Number(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <span style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: '#3d3530',
                      minWidth: '2.5rem'
                    }}>+{employerAboveSG}%</span>
                  </div>
                </div>
                <div>
                  <label style={{
                    display: 'block',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '0.75rem',
                    fontWeight: 500,
                    color: '#6b5f54',
                    marginBottom: '0.4rem'
                  }}>
                    Accumulation Return Rate (%)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input
                      type="range"
                      min="4"
                      max="10"
                      step="0.5"
                      value={returnRate}
                      onChange={(e) => setReturnRate(Number(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <span style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: '#3d3530',
                      minWidth: '2.5rem'
                    }}>{returnRate}%</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB: Current Balance Estimate */}
        {activeTab === 'estimate' && (
          <>
            {/* Results Card */}
            <div className="results-padding" style={{
              background: 'linear-gradient(135deg, #3d3530 0%, #5c4a3d 100%)',
              borderRadius: '16px',
              color: '#fff',
              marginBottom: '1.5rem'
            }}>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: '#c4b8a8',
                  marginBottom: '0.5rem'
                }}>
                  Estimated Current Balance
                </p>
                <p className="main-balance" style={{
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: '#f5ebe0'
                }}>
                  {formatCurrency(baseResults.estimatedBalance)}
                </p>
              </div>

              <div className="grid-3-col" style={{
                borderTop: '1px solid rgba(255,255,255,0.15)',
                paddingTop: '1.5rem'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#a89b8c',
                    marginBottom: '0.25rem'
                  }}>Contributions</p>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: '#e8dfd4'
                  }}>{formatCurrency(baseResults.totalContributions)}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#a89b8c',
                    marginBottom: '0.25rem'
                  }}>Investment Growth</p>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: '#b8e0c8'
                  }}>{formatCurrency(baseResults.investmentGrowth)}</p>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: '#a89b8c',
                    marginBottom: '0.25rem'
                  }}>Compared to Average</p>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '1rem',
                    fontWeight: 600,
                    color: '#f0d8a8',
                    textTransform: 'capitalize'
                  }}>{baseResults.percentile}</p>
                </div>
              </div>
            </div>

            {/* Comparison Card */}
            <div className="card-padding" style={{
              background: '#fffefb',
              borderRadius: '16px',
              boxShadow: '0 4px 24px rgba(60, 45, 30, 0.08)',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.8rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#5c524a',
                marginBottom: '1rem'
              }}>
                How You Compare
              </h3>

              <div style={{ marginBottom: '0.75rem' }}>
                <div style={{
                  height: '10px',
                  background: '#e8e2da',
                  borderRadius: '5px',
                  position: 'relative',
                  overflow: 'visible'
                }}>
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: `${Math.min(100, (baseResults.estimatedBalance / (baseResults.avgBalance * 2)) * 100)}%`,
                    background: 'linear-gradient(90deg, #8b5a2b 0%, #c4956a 100%)',
                    borderRadius: '5px',
                    transition: 'width 0.5s ease'
                  }} />
                  <div style={{
                    position: 'absolute',
                    left: '50%',
                    top: '-6px',
                    bottom: '-6px',
                    width: '2px',
                    background: '#5c524a'
                  }} />
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '0.4rem',
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.7rem',
                  color: '#8b8078'
                }}>
                  <span>$0</span>
                  <span>Avg: {formatCurrency(baseResults.avgBalance)}</span>
                  <span>{formatCurrency(baseResults.avgBalance * 2)}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* TAB: Salary Sacrifice */}
        {activeTab === 'sacrifice' && (
          <>
            {/* Salary Sacrifice Inputs */}
            <div className="card-padding" style={{
              background: '#fffefb',
              borderRadius: '16px',
              boxShadow: '0 4px 24px rgba(60, 45, 30, 0.08)',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.85rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#5c524a',
                marginBottom: '0.5rem'
              }}>
                "What If" Salary Sacrifice Scenario
              </h3>
              <p style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.85rem',
                color: '#8b8078',
                marginBottom: '1.25rem'
              }}>
                See what your balance would be if you had salary sacrificed additional contributions
              </p>

              <div className="grid-2-col">
                <div>
                  <label style={{
                    display: 'block',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    color: '#6b5f54',
                    marginBottom: '0.4rem'
                  }}>
                    Annual Salary Sacrifice Amount
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input
                      type="range"
                      min="0"
                      max="25000"
                      step="1000"
                      value={salarySacrificeAmount}
                      onChange={(e) => setSalarySacrificeAmount(Number(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <span style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: '#3d3530',
                      minWidth: '5rem',
                      textAlign: 'right'
                    }}>{formatCurrency(salarySacrificeAmount)}</span>
                  </div>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    color: '#6b5f54',
                    marginBottom: '0.4rem'
                  }}>
                    For How Many Years
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input
                      type="range"
                      min="1"
                      max="30"
                      value={salarySacrificeYears}
                      onChange={(e) => setSalarySacrificeYears(Number(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <span style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: '#3d3530',
                      minWidth: '4rem',
                      textAlign: 'right'
                    }}>{salarySacrificeYears} years</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Salary Sacrifice Results */}
            {salarySacrificeResults && salarySacrificeAmount > 0 && (
              <div className="results-padding" style={{
                background: 'linear-gradient(135deg, #2d4a3e 0%, #3d5c4a 100%)',
                borderRadius: '16px',
                color: '#fff',
                marginBottom: '1.5rem'
              }}>
                <div className="grid-2-col" style={{
                  marginBottom: '1.5rem'
                }}>
                  <div>
                    <p style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: '#a8c4b8',
                      marginBottom: '0.25rem'
                    }}>
                      Without Salary Sacrifice
                    </p>
                    <p className="section-balance" style={{
                      fontWeight: 600,
                      color: '#c4d4cc'
                    }}>
                      {formatCurrency(baseResults.estimatedBalance)}
                    </p>
                  </div>
                  <div>
                    <p style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: '#a8c4b8',
                      marginBottom: '0.25rem'
                    }}>
                      With Salary Sacrifice
                    </p>
                    <p className="section-balance" style={{
                      fontWeight: 700,
                      color: '#e0f0e8'
                    }}>
                      {formatCurrency(salarySacrificeResults.newBalance)}
                    </p>
                  </div>
                </div>

                <div style={{
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  marginBottom: '1rem'
                }}>
                  <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                    <p style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      color: '#a8c4b8',
                      marginBottom: '0.25rem'
                    }}>
                      Additional Balance Gained
                    </p>
                    <p className="additional-balance" style={{
                      fontWeight: 700,
                      color: '#90EE90'
                    }}>
                      +{formatCurrency(salarySacrificeResults.additionalBalance)}
                    </p>
                  </div>

                  <div className="grid-3-col" style={{
                    borderTop: '1px solid rgba(255,255,255,0.15)',
                    paddingTop: '1rem'
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '0.65rem',
                        textTransform: 'uppercase',
                        color: '#a8c4b8',
                        marginBottom: '0.2rem'
                      }}>Total Sacrificed</p>
                      <p style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        color: '#e0f0e8'
                      }}>{formatCurrency(salarySacrificeResults.totalSalarySacrifice)}</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '0.65rem',
                        textTransform: 'uppercase',
                        color: '#a8c4b8',
                        marginBottom: '0.2rem'
                      }}>Tax Saved</p>
                      <p style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        color: '#90EE90'
                      }}>{formatCurrency(salarySacrificeResults.taxSaved)}</p>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '0.65rem',
                        textTransform: 'uppercase',
                        color: '#a8c4b8',
                        marginBottom: '0.2rem'
                      }}>Return on Sacrifice</p>
                      <p style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '0.95rem',
                        fontWeight: 600,
                        color: '#e0f0e8'
                      }}>{salarySacrificeResults.returnOnSacrifice}%</p>
                    </div>
                  </div>
                </div>

                <p style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.85rem',
                  color: '#c4d4cc',
                  textAlign: 'center'
                }}>
                  Net cost after tax benefit: <strong>{formatCurrency(salarySacrificeResults.netCost)}</strong> over {salarySacrificeYears} years
                  <br />
                  <span style={{ fontSize: '0.75rem', color: '#a8c4b8' }}>
                    ({formatCurrency(salarySacrificeResults.netCost / salarySacrificeYears)} per year in reduced take-home pay)
                  </span>
                </p>
              </div>
            )}

            {salarySacrificeAmount === 0 && (
              <div style={{
                background: '#f8f5f0',
                borderRadius: '12px',
                padding: '2rem',
                textAlign: 'center'
              }}>
                <p style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '1rem',
                  color: '#6b5f54'
                }}>
                  Adjust the salary sacrifice amount above to see the impact on your super balance
                </p>
              </div>
            )}
          </>
        )}

        {/* TAB: Retirement Drawdown */}
        {activeTab === 'drawdown' && (
          <>
            {/* Starting Balance Input */}
            <div className="card-padding" style={{
              background: '#fffefb',
              borderRadius: '16px',
              boxShadow: '0 4px 24px rgba(60, 45, 30, 0.08)',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.85rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#5c524a',
                marginBottom: '1rem'
              }}>
                Your Superannuation Balance
              </h3>

              <div className="balance-buttons" style={{ marginBottom: '1rem' }}>
                <button
                  onClick={() => setUseManualBalance(false)}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    borderRadius: '10px',
                    border: !useManualBalance ? '2px solid #8b5a2b' : '2px solid #d4cdc2',
                    background: !useManualBalance ? '#f5ebe0' : 'transparent',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    color: !useManualBalance ? '#8b5a2b' : '#6b5f54',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Use Estimated Balance</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                    {formatCurrency(salarySacrificeResults ? salarySacrificeResults.newBalance : baseResults.estimatedBalance)} (from calculator)
                  </div>
                </button>

                <button
                  onClick={() => setUseManualBalance(true)}
                  style={{
                    flex: 1,
                    padding: '1rem',
                    borderRadius: '10px',
                    border: useManualBalance ? '2px solid #8b5a2b' : '2px solid #d4cdc2',
                    background: useManualBalance ? '#f5ebe0' : 'transparent',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    color: useManualBalance ? '#8b5a2b' : '#6b5f54',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Enter My Actual Balance</div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                    I know my current super balance
                  </div>
                </button>
              </div>

              {useManualBalance && (
                <div style={{
                  background: '#f8f5f0',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginTop: '0.5rem'
                }}>
                  <label style={{
                    display: 'block',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    color: '#6b5f54',
                    marginBottom: '0.5rem'
                  }}>
                    Enter your current superannuation balance
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '1.1rem', color: '#5c524a' }}>$</span>
                    <input
                      type="number"
                      value={manualSuperBalance}
                      onChange={(e) => setManualSuperBalance(Number(e.target.value))}
                      placeholder="e.g. 850000"
                      style={{ flex: 1, maxWidth: '200px' }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Drawdown Inputs */}
            <div className="card-padding" style={{
              background: '#fffefb',
              borderRadius: '16px',
              boxShadow: '0 4px 24px rgba(60, 45, 30, 0.08)',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.85rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#5c524a',
                marginBottom: '1.25rem'
              }}>
                Retirement Income Settings
              </h3>

              <div className="grid-2-col" style={{ marginBottom: '1.25rem' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    color: '#6b5f54',
                    marginBottom: '0.4rem'
                  }}>
                    {useManualBalance ? 'Current Age' : 'Planned Retirement Age'}
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input
                      type="range"
                      min={useManualBalance ? 55 : Math.max(currentAge, 55)}
                      max="75"
                      value={retirementAge}
                      onChange={(e) => setRetirementAge(Number(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <span style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: '#3d3530',
                      minWidth: '2rem'
                    }}>{retirementAge}</span>
                  </div>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    color: '#6b5f54',
                    marginBottom: '0.4rem'
                  }}>
                    Desired Annual Income
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input
                      type="range"
                      min="30000"
                      max="300000"
                      step="5000"
                      value={annualDrawdown}
                      onChange={(e) => setAnnualDrawdown(Number(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <span style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      color: '#3d3530',
                      minWidth: '5rem',
                      textAlign: 'right'
                    }}>{formatCurrency(annualDrawdown)}</span>
                  </div>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    color: '#6b5f54',
                    marginBottom: '0.4rem'
                  }}>
                    Retirement Phase Return (%)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <input
                      type="range"
                      min="2"
                      max="8"
                      step="0.5"
                      value={drawdownReturnRate}
                      onChange={(e) => setDrawdownReturnRate(Number(e.target.value))}
                      style={{ flex: 1 }}
                    />
                    <span style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: '#3d3530',
                      minWidth: '3rem',
                      textAlign: 'right'
                    }}>{drawdownReturnRate}%</span>
                  </div>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    color: '#6b5f54',
                    marginBottom: '0.4rem'
                  }}>
                    Status
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {(['single', 'couple'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setRelationshipStatus(s)}
                        style={{
                          padding: '0.4rem 1rem',
                          borderRadius: '6px',
                          border: relationshipStatus === s ? '2px solid #8b5a2b' : '2px solid #d4cdc2',
                          background: relationshipStatus === s ? '#f5ebe0' : 'transparent',
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: '0.85rem',
                          fontWeight: 500,
                          color: relationshipStatus === s ? '#8b5a2b' : '#6b5f54',
                          cursor: 'pointer',
                          textTransform: 'capitalize'
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <input
                  type="checkbox"
                  id="includePension"
                  checked={includeAgePension}
                  onChange={(e) => setIncludeAgePension(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#8b5a2b' }}
                />
                <label htmlFor="includePension" style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.9rem',
                  color: '#5c524a',
                  cursor: 'pointer'
                }}>
                  Include Age Pension from age 67 (assumes eligibility)
                </label>
              </div>
            </div>

            {/* Part-Time Work Section */}
            <div className="card-padding" style={{
              background: '#fffefb',
              borderRadius: '16px',
              boxShadow: '0 4px 24px rgba(60, 45, 30, 0.08)',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <input
                  type="checkbox"
                  id="includePartTime"
                  checked={includePartTimeWork}
                  onChange={(e) => setIncludePartTimeWork(e.target.checked)}
                  style={{ width: '18px', height: '18px', accentColor: '#8b5a2b' }}
                />
                <label htmlFor="includePartTime" style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  color: '#5c524a',
                  cursor: 'pointer'
                }}>
                  Include Part-Time Work in Retirement
                </label>
              </div>

              {includePartTimeWork && (
                <div style={{
                  background: '#f8f5f0',
                  borderRadius: '10px',
                  padding: '1.25rem'
                }}>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '0.85rem',
                    color: '#6b5f54',
                    marginBottom: '1rem'
                  }}>
                    Model income from part-time work, consulting, or portfolio career during early retirement
                  </p>

                  <div className="grid-3-col">
                    <div>
                      <label style={{
                        display: 'block',
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: '#6b5f54',
                        marginBottom: '0.4rem'
                      }}>
                        Starting Age
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="range"
                          min={retirementAge}
                          max="75"
                          value={Math.max(partTimeStartAge, retirementAge)}
                          onChange={(e) => setPartTimeStartAge(Number(e.target.value))}
                          style={{ flex: 1 }}
                        />
                        <span style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          color: '#3d3530',
                          minWidth: '2rem'
                        }}>{Math.max(partTimeStartAge, retirementAge)}</span>
                      </div>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: '#6b5f54',
                        marginBottom: '0.4rem'
                      }}>
                        Years Working
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="range"
                          min="1"
                          max="15"
                          value={partTimeYears}
                          onChange={(e) => setPartTimeYears(Number(e.target.value))}
                          style={{ flex: 1 }}
                        />
                        <span style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          color: '#3d3530',
                          minWidth: '3rem'
                        }}>{partTimeYears} yrs</span>
                      </div>
                    </div>

                    <div>
                      <label style={{
                        display: 'block',
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: '0.75rem',
                        fontWeight: 500,
                        color: '#6b5f54',
                        marginBottom: '0.4rem'
                      }}>
                        Annual Income
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="range"
                          min="10000"
                          max="100000"
                          step="5000"
                          value={partTimeIncome}
                          onChange={(e) => setPartTimeIncome(Number(e.target.value))}
                          style={{ flex: 1 }}
                        />
                        <span style={{
                          fontFamily: "'DM Sans', sans-serif",
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          color: '#3d3530',
                          minWidth: '4rem',
                          textAlign: 'right'
                        }}>{formatCurrency(partTimeIncome)}</span>
                      </div>
                    </div>
                  </div>

                  <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '0.8rem',
                    color: '#8b8078',
                    marginTop: '0.75rem',
                    fontStyle: 'italic'
                  }}>
                    Part-time work from age {Math.max(partTimeStartAge, retirementAge)} to {Math.max(partTimeStartAge, retirementAge) + partTimeYears} •
                    Includes 12% SG contributions to your super
                  </p>
                </div>
              )}
            </div>

            {/* ASFA Comparison */}
            <div className="card-padding" style={{
              background: '#fffefb',
              borderRadius: '16px',
              boxShadow: '0 4px 24px rgba(60, 45, 30, 0.08)',
              marginBottom: '1.5rem'
            }}>
              <h4 style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#8b8078',
                marginBottom: '0.75rem'
              }}>
                ASFA Retirement Standard Comparison
              </h4>

              <div style={{ position: 'relative', height: '40px', marginBottom: '0.5rem' }}>
                <div style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: '50%',
                  height: '8px',
                  background: 'linear-gradient(90deg, #e8e2da 0%, #d4cdc2 100%)',
                  borderRadius: '4px',
                  transform: 'translateY(-50%)'
                }} />

                <div style={{
                  position: 'absolute',
                  left: `${(drawdownResults.asfaModest / 300000) * 100}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '4px',
                  height: '20px',
                  background: '#c4956a',
                  borderRadius: '2px'
                }} />

                <div style={{
                  position: 'absolute',
                  left: `${(drawdownResults.asfaComfortable / 300000) * 100}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '4px',
                  height: '20px',
                  background: '#5a8b6a',
                  borderRadius: '2px'
                }} />

                <div style={{
                  position: 'absolute',
                  left: `${Math.min((annualDrawdown / 300000) * 100, 100)}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '16px',
                  height: '16px',
                  background: '#8b5a2b',
                  borderRadius: '50%',
                  border: '3px solid #fff',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)'
                }} />
              </div>

              <div className="asfa-labels">
                <span>$30k</span>
                <span style={{ color: '#c4956a' }}>Modest: {formatCurrency(drawdownResults.asfaModest)}</span>
                <span style={{ color: '#5a8b6a' }}>Comfortable: {formatCurrency(drawdownResults.asfaComfortable)}</span>
                <span>$300k</span>
              </div>
            </div>

            {/* Drawdown Results */}
            <div className="results-padding" style={{
              background: 'linear-gradient(135deg, #4a3d5c 0%, #5c4a6d 100%)',
              borderRadius: '16px',
              color: '#fff',
              marginBottom: '1.5rem'
            }}>
              <div className="grid-2-col" style={{
                marginBottom: '1.5rem'
              }}>
                <div>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: '#c4b8d4',
                    marginBottom: '0.25rem'
                  }}>
                    {useManualBalance ? 'Starting Balance' : `Balance at Retirement (Age ${retirementAge})`}
                  </p>
                  <p className="section-balance" style={{
                    fontWeight: 700,
                    color: '#e8e0f0'
                  }}>
                    {formatCurrency(drawdownResults.balanceAtRetirement)}
                  </p>
                  {!useManualBalance && drawdownResults.yearsToRetirement > 0 && (
                    <p style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '0.75rem',
                      color: '#a89bc4',
                      marginTop: '0.25rem'
                    }}>
                      ({drawdownResults.yearsToRetirement} more years of contributions)
                    </p>
                  )}
                </div>
                <div>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '0.75rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    color: '#c4b8d4',
                    marginBottom: '0.25rem'
                  }}>
                    Super Lasts Until Age
                  </p>
                  <p className="section-balance" style={{
                    fontWeight: 700,
                    color: drawdownResults.superLastsUntilAge >= 95 ? '#90EE90' : '#FFB6C1'
                  }}>
                    {drawdownResults.superLastsUntilAge >= retirementAge + 40 ? '95+' : drawdownResults.superLastsUntilAge}
                  </p>
                  <p style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: '0.75rem',
                    color: '#a89bc4',
                    marginTop: '0.25rem'
                  }}>
                    {drawdownResults.yearsLasted >= 40 ? 'Funds last 40+ years' : `${drawdownResults.yearsLasted} years of income`}
                  </p>
                </div>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '12px',
                padding: '1rem'
              }}>
                <div className="grid-4-col">
                  <div style={{ textAlign: 'center' }}>
                    <p style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '0.65rem',
                      textTransform: 'uppercase',
                      color: '#c4b8d4',
                      marginBottom: '0.2rem'
                    }}>Total Income</p>
                    <p style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: '#e8e0f0'
                    }}>{formatCurrency(drawdownResults.totalDrawn)}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '0.65rem',
                      textTransform: 'uppercase',
                      color: '#c4b8d4',
                      marginBottom: '0.2rem'
                    }}>From Super</p>
                    <p style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: '#e8e0f0'
                    }}>{formatCurrency(drawdownResults.totalFromSuper)}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '0.65rem',
                      textTransform: 'uppercase',
                      color: '#c4b8d4',
                      marginBottom: '0.2rem'
                    }}>Age Pension</p>
                    <p style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: '#90EE90'
                    }}>{formatCurrency(drawdownResults.totalPensionReceived)}</p>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '0.65rem',
                      textTransform: 'uppercase',
                      color: '#c4b8d4',
                      marginBottom: '0.2rem'
                    }}>Work Income</p>
                    <p style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: '#b8d4e8'
                    }}>{formatCurrency(drawdownResults.totalWorkIncome)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Year-by-Year Table */}
            <div className="card-padding" style={{
              background: '#fffefb',
              borderRadius: '16px',
              boxShadow: '0 4px 24px rgba(60, 45, 30, 0.08)',
              marginBottom: '1.5rem',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch'
            }}>
              <h4 style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.85rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                color: '#5c524a',
                marginBottom: '1rem'
              }}>
                Year-by-Year Projection
              </h4>

              <table style={{
                width: '100%',
                minWidth: '500px',
                borderCollapse: 'collapse',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '0.75rem'
              }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #d4cdc2' }}>
                    <th style={{ textAlign: 'left', padding: '0.5rem', color: '#6b5f54' }}>Age</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem', color: '#6b5f54' }}>Balance Start</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem', color: '#6b5f54' }}>Work</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem', color: '#6b5f54' }}>Pension</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem', color: '#6b5f54' }}>From Super</th>
                    <th style={{ textAlign: 'right', padding: '0.5rem', color: '#6b5f54' }}>Balance End</th>
                  </tr>
                </thead>
                <tbody>
                  {drawdownResults.yearlyData.slice(0, 20).map((row) => (
                    <tr key={row.year} style={{
                      borderBottom: '1px solid #e8e2da',
                      background: row.isWorkingPartTime ? '#f0f8f4' : 'transparent'
                    }}>
                      <td style={{ padding: '0.5rem', fontWeight: 500 }}>{row.age}</td>
                      <td style={{ textAlign: 'right', padding: '0.5rem' }}>{formatCurrency(row.balanceStart)}</td>
                      <td style={{ textAlign: 'right', padding: '0.5rem', color: row.workIncome > 0 ? '#2d6a4f' : '#8b8078' }}>
                        {row.workIncome > 0 ? formatCurrency(row.workIncome) : '-'}
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.5rem', color: row.pension > 0 ? '#5a8b6a' : '#8b8078' }}>
                        {row.pension > 0 ? formatCurrency(row.pension) : '-'}
                      </td>
                      <td style={{ textAlign: 'right', padding: '0.5rem', color: '#c4956a' }}>
                        {formatCurrency(row.drawdown)}
                      </td>
                      <td style={{
                        textAlign: 'right',
                        padding: '0.5rem',
                        fontWeight: 600,
                        color: row.balanceEnd > 0 ? '#3d3530' : '#dc3545'
                      }}>
                        {formatCurrency(row.balanceEnd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {drawdownResults.yearlyData.length > 20 && (
                <p style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: '0.75rem',
                  color: '#8b8078',
                  marginTop: '0.75rem',
                  textAlign: 'center',
                  fontStyle: 'italic'
                }}>
                  Showing first 20 years of {drawdownResults.yearlyData.length} years projected
                </p>
              )}
            </div>
          </>
        )}

        {/* Footer */}
        <footer style={{
          textAlign: 'center',
          padding: '1.5rem',
          fontFamily: "'DM Sans', sans-serif",
          fontSize: '0.75rem',
          color: '#8b8078'
        }}>
          <p>
            This calculator provides estimates only and should not be considered financial advice.
            <br />
            Consult a qualified financial adviser for personalised recommendations.
          </p>
        </footer>
      </div>
    </div>
  );
}
