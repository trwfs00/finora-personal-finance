# Local Storage Only Personal Finance Tracker & Analysis Web App — Specification

## 1. Product Overview

A personal finance tracker web app that stores all data locally in the user’s browser using LocalStorage or IndexedDB. No backend, no login, no cloud sync.

The app helps users record income, expenses, transfers, budgets, recurring transactions, and analyze spending patterns through dashboards, charts, and reports.

## 2. Core Principles

* Local-first only
* No account required
* Data must stay on the user’s device
* Fast, simple, mobile-friendly
* Easy export and backup
* Clear financial insights, not just transaction logging

## 3. Target Users

* Individuals who want to track personal income and expenses
* Users who do not want to connect bank accounts
* Users who prefer privacy and manual control
* Freelancers or salary workers tracking monthly cash flow

## 4. Main Features

### 4.1 Dashboard

Show a monthly overview:

* Total income
* Total expenses
* Net savings
* Savings rate
* Remaining budget
* Top spending categories
* Daily spending trend
* Recent transactions
* Month-over-month comparison

### 4.2 Transactions

Users can create, edit, delete, filter, and search transactions.

Transaction fields:

* Type: Income, Expense, Transfer
* Amount
* Date
* Category
* Account
* Note
* Tags
* Payment method
* Attachment note or receipt reference text
* Recurring flag
* Created at
* Updated at

Filters:

* Date range
* Type
* Category
* Account
* Tag
* Min/max amount
* Search by note

### 4.3 Categories

Default categories:

Income:

* Salary
* Freelance
* Bonus
* Investment
* Gift
* Other Income

Expenses:

* Food
* Transport
* Housing
* Utilities
* Shopping
* Health
* Fitness
* Entertainment
* Education
* Insurance
* Debt Payment
* Family Support
* Other Expense

Users can:

* Add custom categories
* Edit category name
* Set icon
* Set color
* Disable category
* Reorder categories

### 4.4 Accounts

Users can create multiple accounts:

* Cash
* Bank account
* Credit card
* E-wallet
* Savings account
* Investment account
* Debt account

Account fields:

* Name
* Type
* Initial balance
* Current balance
* Currency
* Color
* Include in total net worth: yes/no

### 4.5 Budgeting

Monthly budget system:

* Overall monthly expense budget
* Category-level monthly budget
* Budget progress bar
* Warning when spending reaches 80%, 100%, or over budget
* Budget rollover option
* Budget vs actual report

### 4.6 Recurring Transactions

Support repeated transactions:

* Salary
* Rent
* Subscriptions
* Installments
* Insurance
* Internet
* Utilities

Frequency options:

* Daily
* Weekly
* Monthly
* Yearly
* Custom interval

Recurring transaction fields:

* Start date
* End date optional
* Next run date
* Auto-generate transaction on app open
* Manual confirmation option

### 4.7 Analytics

The app should provide:

* Income vs expense chart
* Expense by category
* Spending trend by day/week/month
* Net worth trend
* Savings rate trend
* Budget usage
* Top 5 categories
* Top 10 largest expenses
* Average daily spending
* Projected monthly spending
* Month-over-month change
* Category comparison between months

Useful insights:

* “You spent 18% more on food than last month”
* “Your savings rate this month is 24%”
* “At this pace, you may exceed your food budget by 1,200 THB”
* “Your largest expense this month is Rent”

### 4.8 Reports

Report views:

* Monthly report
* Yearly report
* Category report
* Account report
* Cash flow report
* Net worth report
* Budget report

Each report should support:

* Date range selection
* Export to CSV
* Export to JSON
* Print-friendly layout

### 4.9 Import / Export / Backup

Since there is no backend, backup is critical.

Required:

* Export all data as JSON
* Import JSON backup
* Export transactions as CSV
* Import transactions from CSV
* Clear all data
* Auto backup reminder
* Backup file versioning

Import should validate:

* Missing fields
* Invalid amount
* Invalid date
* Duplicate transactions
* Unknown categories/accounts

### 4.10 Data Privacy

* No server requests for user financial data
* No analytics tracking by default
* No third-party finance API
* All data stored locally
* Show clear privacy notice inside app

## 5. Data Models

### Transaction

```ts
type TransactionType = "income" | "expense" | "transfer";

interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  categoryId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  accountId?: string;
  note?: string;
  tags?: string[];
  paymentMethod?: string;
  recurringId?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Category

```ts
interface Category {
  id: string;
  name: string;
  type: "income" | "expense";
  icon?: string;
  color?: string;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
}
```

### Account

```ts
interface Account {
  id: string;
  name: string;
  type: "cash" | "bank" | "credit_card" | "e_wallet" | "savings" | "investment" | "debt";
  initialBalance: number;
  currency: string;
  color?: string;
  includeInNetWorth: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Budget

```ts
interface Budget {
  id: string;
  month: string;
  totalBudget?: number;
  categoryBudgets: {
    categoryId: string;
    amount: number;
  }[];
  rollover: boolean;
  createdAt: string;
  updatedAt: string;
}
```

### Recurring Transaction

```ts
interface RecurringTransaction {
  id: string;
  transactionTemplate: Omit<Transaction, "id" | "createdAt" | "updatedAt">;
  frequency: "daily" | "weekly" | "monthly" | "yearly" | "custom";
  interval?: number;
  startDate: string;
  endDate?: string;
  nextRunDate: string;
  autoGenerate: boolean;
  isActive: boolean;
}
```

### App Settings

```ts
interface AppSettings {
  currency: string;
  theme: "light" | "dark" | "system";
  firstDayOfWeek: "monday" | "sunday";
  dateFormat: string;
  numberFormat: string;
  backupReminder: boolean;
  backupReminderFrequency: "weekly" | "monthly";
}
```

## 6. Storage

Recommended:

* Use IndexedDB for main data
* Use LocalStorage only for small settings
* Use a storage abstraction layer

Storage keys:

```ts
finance_app_transactions
finance_app_categories
finance_app_accounts
finance_app_budgets
finance_app_recurring
finance_app_settings
finance_app_schema_version
```

Data must support migration:

```ts
interface StoredData {
  schemaVersion: number;
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  budgets: Budget[];
  recurringTransactions: RecurringTransaction[];
  settings: AppSettings;
}
```

## 7. Pages

### 7.1 Dashboard Page

Route: `/`

Sections:

* Month selector
* Summary cards
* Income vs expense chart
* Spending by category chart
* Budget progress
* Recent transactions
* Insights panel

### 7.2 Transactions Page

Route: `/transactions`

Features:

* Transaction table/list
* Add transaction button
* Filters
* Search
* Bulk delete
* CSV export
* Sort by date, amount, category

### 7.3 Add/Edit Transaction Page or Modal

Route: `/transactions/new` or modal

Fields:

* Type
* Amount
* Date
* Category
* Account
* From account / to account for transfer
* Note
* Tags
* Recurring options

### 7.4 Budgets Page

Route: `/budgets`

Features:

* Monthly budget setup
* Category budgets
* Budget usage chart
* Over-budget warnings

### 7.5 Analytics Page

Route: `/analytics`

Features:

* Date range picker
* Category breakdown
* Monthly trend
* Cash flow
* Savings rate
* Net worth trend
* Spending insights

### 7.6 Accounts Page

Route: `/accounts`

Features:

* Account list
* Current balance
* Add/edit/delete account
* Include/exclude from net worth

### 7.7 Settings Page

Route: `/settings`

Features:

* Currency
* Theme
* Date format
* Import/export
* Backup reminder
* Reset all data
* Privacy notice

## 8. UX Requirements

* Mobile-first responsive layout
* Quick add transaction button always accessible
* Transaction form should be fast to fill
* Use clear visual hierarchy
* Show empty states
* Confirm before deleting important data
* Support keyboard shortcuts on desktop
* Support dark mode
* Use friendly financial insights

## 9. Validation Rules

* Amount must be greater than 0
* Date is required
* Expense must have category and account
* Income must have category and account
* Transfer must have fromAccountId and toAccountId
* Transfer accounts cannot be the same
* Budget amount must be greater than or equal to 0
* Account name must be unique
* Category name should be unique per type

## 10. Calculations

### Account Balance

```ts
currentBalance =
  initialBalance
  + totalIncomeToAccount
  - totalExpenseFromAccount
  + totalTransfersIn
  - totalTransfersOut
```

### Net Income

```ts
netIncome = totalIncome - totalExpense
```

### Savings Rate

```ts
savingsRate = (netIncome / totalIncome) * 100
```

### Budget Usage

```ts
budgetUsage = (actualExpense / budgetAmount) * 100
```

### Projected Monthly Spending

```ts
projectedSpending = (currentSpending / daysPassedInMonth) * totalDaysInMonth
```

## 11. Tech Stack Recommendation

Recommended stack:

* Vite
* React
* TypeScript
* React Router
* Zustand
* React Hook Form
* Zod
* Recharts
* Dexie.js for IndexedDB
* Tailwind CSS
* Shadcn UI (*)
* date-fns
* PapaParse for CSV import/export
* nanoid or crypto.randomUUID for IDs

## 12. Non-Goals

The first version should not include:

* Bank account connection
* Cloud sync
* Multi-user account
* Login system
* AI financial advisor
* Investment portfolio API
* Receipt OCR
* Mobile native app
* Server-side database

## 13. MVP Scope

MVP should include:

* Dashboard
* Add/edit/delete transactions
* Categories
* Accounts
* Monthly budget
* Basic analytics
* JSON backup/restore
* CSV export
* Local-only storage
* Dark mode

## 14. Future Features

Possible future improvements:

* PWA offline install
* Password lock
* Encrypted local database
* Receipt image storage
* Goal tracking
* Debt payoff planner
* Installment tracker
* Multiple currencies
* Shared household mode
* Cloud sync optional
* AI spending summary
* Calendar view
* Subscription tracker
* Bill reminders

## 15. Success Criteria

The app is successful if users can:

* Track daily income and expenses quickly
* Understand where their money goes
* See monthly savings clearly
* Avoid going over budget
* Backup and restore data safely
* Use the app without creating an account
* Trust that their data stays private
