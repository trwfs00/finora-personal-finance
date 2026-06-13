import type { DebtType, InterestRateType, PaymentStructure } from "../domain/types";

export interface DebtPreset {
  interestRateType: InterestRateType;
  defaultRate: number;
  paymentStructure: PaymentStructure;
  hintEn: string;
  hintTh: string;
}

export const DEBT_PRESETS: Record<DebtType, DebtPreset> = {
  credit_card: {
    interestRateType: "fixed",
    defaultRate: 16,
    paymentStructure: "revolving",
    hintEn: "Max 16% APR per Bank of Thailand — check your statement for exact rate",
    hintTh: "สูงสุด 16% ต่อปี ตาม ธปท. — ตรวจสอบจากใบแจ้งหนี้เพื่อยืนยัน",
  },
  personal_loan: {
    interestRateType: "fixed",
    defaultRate: 25,
    paymentStructure: "fixed_installment",
    hintEn: "Typically 20–28% APR — check your loan agreement",
    hintTh: "ปกติ 20–28% ต่อปี — ดูในสัญญาหรือ App ธนาคาร",
  },
  cash_advance: {
    interestRateType: "fixed",
    defaultRate: 25,
    paymentStructure: "revolving",
    hintEn: "EasyCash / บัตรกดเงินสด: typically 25–28% APR",
    hintTh: "EasyCash / บัตรกดเงินสด: ปกติ 25–28% ต่อปี",
  },
  bnpl: {
    interestRateType: "fixed",
    defaultRate: 0,
    paymentStructure: "revolving",
    hintEn: "0% if paid in full by due date · installment: 15% p.a. (Unicorn) or 25% p.a. (Money Capital) declining balance — check which provider you have in the app",
    hintTh: "0% ถ้าจ่ายเต็มยอดในรอบบิล · ผ่อน: 15% ต่อปี (Unicorn) หรือ 25% ต่อปี (Money Capital) declining balance — เช็กในแอปว่าใช้ผู้ให้บริการไหน",
  },
  car_loan: {
    interestRateType: "fixed",
    defaultRate: 3,
    paymentStructure: "fixed_installment",
    hintEn: "Typically 2.5–3% flat rate (~4.5–5.5% effective APR)",
    hintTh: "ปกติ 2.5–3% flat rate (เทียบเท่า ~4.5–5.5% effective APR)",
  },
  mortgage: {
    interestRateType: "floating",
    defaultRate: 6.5,
    paymentStructure: "fixed_installment",
    hintEn: "Usually MRR ± spread — check your contract for the spread",
    hintTh: "ปกติ MRR ± spread — ดูในสัญญาว่า spread เท่าไหร่",
  },
  student_loan: {
    interestRateType: "fixed",
    defaultRate: 1,
    paymentStructure: "fixed_installment",
    hintEn: "กยศ.: 1% per year, penalty 0.5% — per พ.ร.บ. 2566",
    hintTh: "กยศ.: ดอกเบี้ย 1% ต่อปี, เบี้ยปรับ 0.5% — ตาม พ.ร.บ. 2566",
  },
  informal: {
    interestRateType: "none",
    defaultRate: 0,
    paymentStructure: "manual",
    hintEn: "No interest — enter the agreed repayment amount",
    hintTh: "ไม่มีดอกเบี้ย — กรอกยอดผ่อนที่ตกลงไว้",
  },
  other: {
    interestRateType: "fixed",
    defaultRate: 0,
    paymentStructure: "manual",
    hintEn: "Enter the interest rate from your loan agreement",
    hintTh: "กรอกอัตราดอกเบี้ยจากสัญญาเงินกู้",
  },
};

export interface MrrEntry {
  name: string;
  mrr: number;
  updatedAt: string;
}

// MRR rates as of June 2026 (มิ.ย. 2569)
// Sources: Sansiri, Bangkok Post, The Standard — update when banks announce changes
export const MRR_RATES: Record<string, MrrEntry> = {
  gsb:         { name: "ออมสิน (GSB)",              mrr: 6.045, updatedAt: "2026-06" },
  ghb:         { name: "ธอส. (GHB)",                mrr: 6.145, updatedAt: "2026-06" },
  bbl:         { name: "กรุงเทพ (BBL)",              mrr: 6.500, updatedAt: "2026-06" },
  thai_credit: { name: "ไทยเครดิต",                  mrr: 6.575, updatedAt: "2026-06" },
  kbank:       { name: "กสิกรไทย (KBank)",           mrr: 6.580, updatedAt: "2026-06" },
  bay:         { name: "กรุงศรีอยุธยา (BAY)",        mrr: 6.670, updatedAt: "2026-06" },
  ktb:         { name: "กรุงไทย (KTB)",              mrr: 6.845, updatedAt: "2026-06" },
  scb:         { name: "ไทยพาณิชย์ (SCB)",           mrr: 6.675, updatedAt: "2026-06" },
  ttb:         { name: "ทหารไทยธนชาต (ttb)",         mrr: 6.900, updatedAt: "2026-06" },
  kkp:         { name: "เกียรตินาคิน (KKP)",         mrr: 7.400, updatedAt: "2026-06" },
};
