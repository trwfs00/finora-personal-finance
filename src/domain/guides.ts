export type GuidePage = "accounts" | "transactions" | "budgets" | "settings" | "recurring" | "goals" | "debts";

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
  {
    page: "recurring",
    titleKey: "guides.recurring.title",
    introKey: "guides.recurring.intro",
    useCases: [
      {
        id: "subscription",
        titleKey: "guides.recurring.subscription.title",
        descriptionKey: "guides.recurring.subscription.description",
        stepsKeys: [
          "guides.recurring.subscription.step1",
          "guides.recurring.subscription.step2",
          "guides.recurring.subscription.step3",
          "guides.recurring.subscription.step4",
        ],
        recommendedFields: [
          { labelKey: "guides.fields.transactionType", valueKey: "guides.values.expense" },
          { labelKey: "guides.recurring.fields.frequency", value: "Monthly" },
          { labelKey: "guides.recurring.fields.autoGenerate", value: "On" },
        ],
      },
      {
        id: "salary",
        titleKey: "guides.recurring.salary.title",
        descriptionKey: "guides.recurring.salary.description",
        stepsKeys: [
          "guides.recurring.salary.step1",
          "guides.recurring.salary.step2",
          "guides.recurring.salary.step3",
        ],
        recommendedFields: [
          { labelKey: "guides.fields.transactionType", valueKey: "guides.values.income" },
          { labelKey: "guides.recurring.fields.frequency", value: "Monthly" },
        ],
      },
      {
        id: "custom-interval",
        titleKey: "guides.recurring.customInterval.title",
        descriptionKey: "guides.recurring.customInterval.description",
        stepsKeys: [
          "guides.recurring.customInterval.step1",
          "guides.recurring.customInterval.step2",
          "guides.recurring.customInterval.step3",
        ],
        recommendedFields: [
          { labelKey: "guides.recurring.fields.frequency", value: "Custom" },
          { labelKey: "guides.recurring.fields.interval", value: "90" },
        ],
      },
      {
        id: "manual-confirm",
        titleKey: "guides.recurring.manualConfirm.title",
        descriptionKey: "guides.recurring.manualConfirm.description",
        stepsKeys: [
          "guides.recurring.manualConfirm.step1",
          "guides.recurring.manualConfirm.step2",
          "guides.recurring.manualConfirm.step3",
        ],
        recommendedFields: [
          { labelKey: "guides.recurring.fields.autoGenerate", value: "Off" },
        ],
      },
    ],
  },
  {
    page: "goals",
    titleKey: "guides.goals.title",
    introKey: "guides.goals.intro",
    useCases: [
      {
        id: "emergency-fund",
        titleKey: "guides.goals.emergencyFund.title",
        descriptionKey: "guides.goals.emergencyFund.description",
        stepsKeys: [
          "guides.goals.emergencyFund.step1",
          "guides.goals.emergencyFund.step2",
          "guides.goals.emergencyFund.step3",
          "guides.goals.emergencyFund.step4",
        ],
      },
      {
        id: "linked-account",
        titleKey: "guides.goals.linkedAccount.title",
        descriptionKey: "guides.goals.linkedAccount.description",
        stepsKeys: [
          "guides.goals.linkedAccount.step1",
          "guides.goals.linkedAccount.step2",
          "guides.goals.linkedAccount.step3",
        ],
        recommendedFields: [
          { labelKey: "guides.fields.account", value: "Savings account" },
        ],
      },
      {
        id: "deadline",
        titleKey: "guides.goals.deadline.title",
        descriptionKey: "guides.goals.deadline.description",
        stepsKeys: [
          "guides.goals.deadline.step1",
          "guides.goals.deadline.step2",
          "guides.goals.deadline.step3",
        ],
      },
      {
        id: "archive",
        titleKey: "guides.goals.archive.title",
        descriptionKey: "guides.goals.archive.description",
        stepsKeys: [
          "guides.goals.archive.step1",
          "guides.goals.archive.step2",
          "guides.goals.archive.step3",
        ],
      },
    ],
  },
  {
    page: "debts",
    titleKey: "guides.debts.title",
    introKey: "guides.debts.intro",
    useCases: [
      {
        id: "presets",
        titleKey: "guides.debts.presets.title",
        descriptionKey: "guides.debts.presets.description",
        stepsKeys: [],
        recommendedFields: [
          { labelKey: "debts.typeCredit",   valueKey: "guides.debts.presets.creditCard" },
          { labelKey: "debts.typePersonal", valueKey: "guides.debts.presets.personalLoan" },
          { labelKey: "debts.typeCash",     valueKey: "guides.debts.presets.cashAdvance" },
          { labelKey: "debts.typeBnpl",     valueKey: "guides.debts.presets.bnpl" },
          { labelKey: "debts.typeCar",      valueKey: "guides.debts.presets.carLoan" },
          { labelKey: "debts.typeMortgage", valueKey: "guides.debts.presets.mortgage" },
          { labelKey: "debts.typeStudent",  valueKey: "guides.debts.presets.studentLoan" },
          { labelKey: "debts.typeInformal", valueKey: "guides.debts.presets.informal" },
          { labelKey: "debts.typeOther",    valueKey: "guides.debts.presets.other" },
        ],
      },
      {
        id: "add-debt",
        titleKey: "guides.debts.addDebt.title",
        descriptionKey: "guides.debts.addDebt.description",
        stepsKeys: [
          "guides.debts.addDebt.step1",
          "guides.debts.addDebt.step2",
          "guides.debts.addDebt.step3",
          "guides.debts.addDebt.step4",
        ],
      },
      {
        id: "linked-account",
        titleKey: "guides.debts.linkedAccount.title",
        descriptionKey: "guides.debts.linkedAccount.description",
        stepsKeys: [
          "guides.debts.linkedAccount.step1",
          "guides.debts.linkedAccount.step2",
          "guides.debts.linkedAccount.step3",
        ],
        recommendedFields: [
          { labelKey: "guides.fields.accountType", valueKey: "guides.values.debtAccount" },
        ],
      },
      {
        id: "floating-rate",
        titleKey: "guides.debts.floatingRate.title",
        descriptionKey: "guides.debts.floatingRate.description",
        stepsKeys: [
          "guides.debts.floatingRate.step1",
          "guides.debts.floatingRate.step2",
          "guides.debts.floatingRate.step3",
          "guides.debts.floatingRate.step4",
        ],
        recommendedFields: [
          { labelKey: "guides.debts.fields.rateType", value: "MRR-based (floating)" },
        ],
        warningKey: "guides.debts.floatingRate.warning",
      },
      {
        id: "what-if",
        titleKey: "guides.debts.whatIf.title",
        descriptionKey: "guides.debts.whatIf.description",
        stepsKeys: [
          "guides.debts.whatIf.step1",
          "guides.debts.whatIf.step2",
          "guides.debts.whatIf.step3",
        ],
      },
      {
        id: "strategy",
        titleKey: "guides.debts.strategy.title",
        descriptionKey: "guides.debts.strategy.description",
        stepsKeys: [
          "guides.debts.strategy.step1",
          "guides.debts.strategy.step2",
          "guides.debts.strategy.step3",
        ],
      },
    ],
  },
];

export function getPageGuide(page: GuidePage): PageGuide | undefined {
  return PAGE_GUIDES.find((guide) => guide.page === page);
}
