export type GuidePage = "accounts" | "transactions" | "budgets" | "settings";

export interface GuideUseCase {
  id: string;
  titleKey: string;
  descriptionKey: string;
  stepsKeys: string[];
  recommendedFields?: Array<{
    labelKey: string;
    value?: string;
    valueKey?: string;
  }>;
  warningKey?: string;
}

export interface PageGuide {
  page: GuidePage;
  titleKey: string;
  introKey: string;
  useCases: GuideUseCase[];
}

export const PAGE_GUIDES: PageGuide[] = [
  {
    page: "accounts",
    titleKey: "guides.accounts.title",
    introKey: "guides.accounts.intro",
    useCases: [
      {
        id: "cash",
        titleKey: "guides.accounts.cash.title",
        descriptionKey: "guides.accounts.cash.description",
        stepsKeys: [
          "guides.accounts.cash.step1",
          "guides.accounts.cash.step2",
          "guides.accounts.cash.step3",
        ],
      },
      {
        id: "bank",
        titleKey: "guides.accounts.bank.title",
        descriptionKey: "guides.accounts.bank.description",
        stepsKeys: [
          "guides.accounts.bank.step1",
          "guides.accounts.bank.step2",
          "guides.accounts.bank.step3",
        ],
      },
      {
        id: "ewallet",
        titleKey: "guides.accounts.ewallet.title",
        descriptionKey: "guides.accounts.ewallet.description",
        stepsKeys: [
          "guides.accounts.ewallet.step1",
          "guides.accounts.ewallet.step2",
          "guides.accounts.ewallet.step3",
        ],
      },
      {
        id: "credit-card",
        titleKey: "guides.accounts.creditCard.title",
        descriptionKey: "guides.accounts.creditCard.description",
        stepsKeys: [
          "guides.accounts.creditCard.step1",
          "guides.accounts.creditCard.step2",
          "guides.accounts.creditCard.step3",
          "guides.accounts.creditCard.step4",
        ],
        recommendedFields: [
          { labelKey: "guides.fields.accountType", valueKey: "guides.values.creditCard" },
          { labelKey: "guides.fields.initialBalance", value: "-5000" },
        ],
        warningKey: "guides.accounts.creditCard.warning",
      },
      {
        id: "spaylater",
        titleKey: "guides.accounts.spaylater.title",
        descriptionKey: "guides.accounts.spaylater.description",
        stepsKeys: [
          "guides.accounts.spaylater.step1",
          "guides.accounts.spaylater.step2",
          "guides.accounts.spaylater.step3",
          "guides.accounts.spaylater.step4",
          "guides.accounts.spaylater.step5",
        ],
        recommendedFields: [
          { labelKey: "guides.fields.accountName", value: "SPayLater" },
          { labelKey: "guides.fields.accountType", valueKey: "guides.values.debtAccount" },
          { labelKey: "guides.fields.initialBalance", value: "-8000" },
          { labelKey: "guides.fields.creditLimit", value: "20000" },
        ],
        warningKey: "guides.accounts.spaylater.warning",
      },
      {
        id: "investment",
        titleKey: "guides.accounts.investment.title",
        descriptionKey: "guides.accounts.investment.description",
        stepsKeys: [
          "guides.accounts.investment.step1",
          "guides.accounts.investment.step2",
          "guides.accounts.investment.step3",
          "guides.accounts.investment.step4",
        ],
      },
      {
        id: "net-worth",
        titleKey: "guides.accounts.netWorth.title",
        descriptionKey: "guides.accounts.netWorth.description",
        stepsKeys: [
          "guides.accounts.netWorth.step1",
          "guides.accounts.netWorth.step2",
          "guides.accounts.netWorth.step3",
        ],
      },
    ],
  },
  {
    page: "transactions",
    titleKey: "guides.transactions.title",
    introKey: "guides.transactions.intro",
    useCases: [
      {
        id: "cash-purchase",
        titleKey: "guides.transactions.cashPurchase.title",
        descriptionKey: "guides.transactions.cashPurchase.description",
        stepsKeys: [
          "guides.transactions.cashPurchase.step1",
          "guides.transactions.cashPurchase.step2",
          "guides.transactions.cashPurchase.step3",
        ],
        recommendedFields: [
          { labelKey: "guides.fields.transactionType", valueKey: "guides.values.expense" },
          { labelKey: "guides.fields.account", valueKey: "guides.values.cash" },
        ],
      },
      {
        id: "credit-purchase",
        titleKey: "guides.transactions.creditPurchase.title",
        descriptionKey: "guides.transactions.creditPurchase.description",
        stepsKeys: [
          "guides.transactions.creditPurchase.step1",
          "guides.transactions.creditPurchase.step2",
          "guides.transactions.creditPurchase.step3",
        ],
        recommendedFields: [
          { labelKey: "guides.fields.transactionType", valueKey: "guides.values.expense" },
          { labelKey: "guides.fields.account", valueKey: "guides.values.creditCard" },
        ],
      },
      {
        id: "credit-repayment",
        titleKey: "guides.transactions.creditRepayment.title",
        descriptionKey: "guides.transactions.creditRepayment.description",
        stepsKeys: [
          "guides.transactions.creditRepayment.step1",
          "guides.transactions.creditRepayment.step2",
          "guides.transactions.creditRepayment.step3",
        ],
        recommendedFields: [
          { labelKey: "guides.fields.transactionType", valueKey: "guides.values.transfer" },
          { labelKey: "guides.fields.fromAccount", valueKey: "guides.values.bank" },
          { labelKey: "guides.fields.toAccount", valueKey: "guides.values.creditCard" },
        ],
        warningKey: "guides.transactions.creditRepayment.warning",
      },
      {
        id: "own-transfer",
        titleKey: "guides.transactions.ownTransfer.title",
        descriptionKey: "guides.transactions.ownTransfer.description",
        stepsKeys: [
          "guides.transactions.ownTransfer.step1",
          "guides.transactions.ownTransfer.step2",
          "guides.transactions.ownTransfer.step3",
          "guides.transactions.ownTransfer.step4",
        ],
        recommendedFields: [
          { labelKey: "guides.fields.transactionType", valueKey: "guides.values.transfer" },
        ],
      },
      {
        id: "salary-income",
        titleKey: "guides.transactions.salaryIncome.title",
        descriptionKey: "guides.transactions.salaryIncome.description",
        stepsKeys: [
          "guides.transactions.salaryIncome.step1",
          "guides.transactions.salaryIncome.step2",
          "guides.transactions.salaryIncome.step3",
          "guides.transactions.salaryIncome.step4",
        ],
        recommendedFields: [
          { labelKey: "guides.fields.transactionType", valueKey: "guides.values.income" },
          { labelKey: "guides.fields.account", valueKey: "guides.values.bank" },
        ],
      },
      {
        id: "debt-interest-fee",
        titleKey: "guides.transactions.debtInterestFee.title",
        descriptionKey: "guides.transactions.debtInterestFee.description",
        stepsKeys: [
          "guides.transactions.debtInterestFee.step1",
          "guides.transactions.debtInterestFee.step2",
          "guides.transactions.debtInterestFee.step3",
          "guides.transactions.debtInterestFee.step4",
        ],
        recommendedFields: [
          { labelKey: "guides.fields.transactionType", valueKey: "guides.values.expense" },
          { labelKey: "guides.fields.account", valueKey: "guides.values.debtAccount" },
        ],
      },
    ],
  },
  {
    page: "budgets",
    titleKey: "guides.budgets.title",
    introKey: "guides.budgets.intro",
    useCases: [
      {
        id: "monthly-budget",
        titleKey: "guides.budgets.monthlyBudget.title",
        descriptionKey: "guides.budgets.monthlyBudget.description",
        stepsKeys: [
          "guides.budgets.monthlyBudget.step1",
          "guides.budgets.monthlyBudget.step2",
          "guides.budgets.monthlyBudget.step3",
          "guides.budgets.monthlyBudget.step4",
        ],
      },
      {
        id: "category-budget",
        titleKey: "guides.budgets.categoryBudget.title",
        descriptionKey: "guides.budgets.categoryBudget.description",
        stepsKeys: [
          "guides.budgets.categoryBudget.step1",
          "guides.budgets.categoryBudget.step2",
          "guides.budgets.categoryBudget.step3",
          "guides.budgets.categoryBudget.step4",
        ],
      },
      {
        id: "rollover-budget",
        titleKey: "guides.budgets.rolloverBudget.title",
        descriptionKey: "guides.budgets.rolloverBudget.description",
        stepsKeys: [
          "guides.budgets.rolloverBudget.step1",
          "guides.budgets.rolloverBudget.step2",
          "guides.budgets.rolloverBudget.step3",
        ],
      },
      {
        id: "over-budget",
        titleKey: "guides.budgets.overBudget.title",
        descriptionKey: "guides.budgets.overBudget.description",
        stepsKeys: [
          "guides.budgets.overBudget.step1",
          "guides.budgets.overBudget.step2",
          "guides.budgets.overBudget.step3",
        ],
      },
    ],
  },
  {
    page: "settings",
    titleKey: "guides.settings.title",
    introKey: "guides.settings.intro",
    useCases: [
      {
        id: "local-first",
        titleKey: "guides.settings.localFirst.title",
        descriptionKey: "guides.settings.localFirst.description",
        stepsKeys: [
          "guides.settings.localFirst.step1",
          "guides.settings.localFirst.step2",
          "guides.settings.localFirst.step3",
        ],
      },
      {
        id: "json-backup",
        titleKey: "guides.settings.jsonBackup.title",
        descriptionKey: "guides.settings.jsonBackup.description",
        stepsKeys: [
          "guides.settings.jsonBackup.step1",
          "guides.settings.jsonBackup.step2",
          "guides.settings.jsonBackup.step3",
        ],
      },
      {
        id: "json-restore",
        titleKey: "guides.settings.jsonRestore.title",
        descriptionKey: "guides.settings.jsonRestore.description",
        stepsKeys: [
          "guides.settings.jsonRestore.step1",
          "guides.settings.jsonRestore.step2",
          "guides.settings.jsonRestore.step3",
        ],
        warningKey: "guides.settings.jsonRestore.warning",
      },
      {
        id: "google-drive-sync",
        titleKey: "guides.settings.googleDriveSync.title",
        descriptionKey: "guides.settings.googleDriveSync.description",
        stepsKeys: [
          "guides.settings.googleDriveSync.step1",
          "guides.settings.googleDriveSync.step2",
          "guides.settings.googleDriveSync.step3",
          "guides.settings.googleDriveSync.step4",
        ],
      },
      {
        id: "sync-conflict",
        titleKey: "guides.settings.syncConflict.title",
        descriptionKey: "guides.settings.syncConflict.description",
        stepsKeys: [
          "guides.settings.syncConflict.step1",
          "guides.settings.syncConflict.step2",
          "guides.settings.syncConflict.step3",
        ],
        warningKey: "guides.settings.syncConflict.warning",
      },
    ],
  },
];

export function getPageGuide(page: GuidePage): PageGuide | undefined {
  return PAGE_GUIDES.find((guide) => guide.page === page);
}
