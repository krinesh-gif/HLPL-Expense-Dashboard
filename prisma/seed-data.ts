import type { CostCenter } from "@prisma/client";

const ALL: CostCenter[] = ["WH", "HO", "FOUNDER"];
const OFFICE: CostCenter[] = ["HO", "FOUNDER"];

export type CatSeed = {
  code: string;
  name: string;
  icon: string;
  color: string;
  group: string;
  tallyLedger: string;
  costCenters: CostCenter[];
  monthlyBudget?: number;
  requiresBill?: boolean;
  billThreshold?: number;
  isCapex?: boolean;
  sortOrder: number;
  aliases: string[];
};

/**
 * Canonical expense taxonomy. Replaces the three incompatible category lists
 * that WH, HO and the founder's workbook each maintained separately.
 *
 * Budgets are seeded from FY26-27 actuals to date and are meant to be tuned
 * by the founder from the Category Master screen.
 */
export const CATEGORIES: CatSeed[] = [
  // ---- Logistics & Fulfilment -------------------------------------------
  { code: "COURIER", icon: "📦", color: "blue", name: "Courier / Porter", group: "Logistics & Fulfilment",
    tallyLedger: "Courier & Forwarding", costCenters: ALL, monthlyBudget: 4000, sortOrder: 10,
    aliases: ["Porter / Courier", "Porter", "Courier", "Porter/Courier"] },
  { code: "FREIGHT", icon: "🚚", color: "sky", name: "Freight & Transport", group: "Logistics & Fulfilment",
    tallyLedger: "Carriage Outward", costCenters: ALL, monthlyBudget: 4000, sortOrder: 11,
    aliases: ["Transport", "Travel & Transport - Freight"] },
  { code: "PACKAGING", icon: "🎁", color: "indigo", name: "Packaging Material", group: "Logistics & Fulfilment",
    tallyLedger: "Packing Material", costCenters: ALL, monthlyBudget: 3000, requiresBill: true,
    billThreshold: 2000, sortOrder: 12,
    aliases: ["Packaging Material", "Packaging & Material", "Packing Material"] },

  // ---- Manpower ----------------------------------------------------------
  { code: "STAFF_WELFARE", icon: "☕", color: "amber", name: "Staff Food & Tea", group: "Manpower",
    tallyLedger: "Staff Welfare", costCenters: ALL, monthlyBudget: 5000, sortOrder: 20,
    aliases: ["Staff Food & Tea", "Staff Food", "Food & Hospitality", "Tea", "cake", "Cake",
              "Pani Puri-Maulik", "Pani Puri-Kavisha", "Pani Puri-Kajal", "Pani Puri-Ishani",
              "Pani Puri-Rutu", "maulik", "Maulik"] },
  { code: "STAFF_WAGES", icon: "👷", color: "orange", name: "Staff Wages & Labour", group: "Manpower",
    tallyLedger: "Wages", costCenters: ALL, monthlyBudget: 10000, requiresBill: true,
    billThreshold: 10000, sortOrder: 21,
    aliases: ["Staff", "Labour", "Labour Charges", "Wages"] },
  { code: "HOUSEKEEPING", icon: "🧹", color: "lime", name: "Housekeeping", group: "Manpower",
    tallyLedger: "Housekeeping Expenses", costCenters: ALL, monthlyBudget: 3000, sortOrder: 22,
    aliases: ["Masi Salary", "Masi", "Cleaning", "Housekeeping"] },

  // ---- Facility ----------------------------------------------------------
  { code: "RENT", icon: "🏠", color: "violet", name: "Rent", group: "Facility",
    tallyLedger: "Rent", costCenters: ALL, monthlyBudget: 30000, requiresBill: true,
    billThreshold: 1, sortOrder: 30, aliases: ["Rent", "Warehouse Rent", "Office Rent"] },
  { code: "UTILITIES", icon: "💡", color: "amber", name: "Electricity & Utilities", group: "Facility",
    tallyLedger: "Electricity Expenses", costCenters: ALL, monthlyBudget: 5000, sortOrder: 31,
    aliases: ["Utility Bill", "Utilities & Misc", "Electricity", "Water", "Utilities"] },
  { code: "REPAIRS", icon: "🔧", color: "slate", name: "Repairs & Maintenance", group: "Facility",
    tallyLedger: "Repairs & Maintenance", costCenters: ALL, monthlyBudget: 4000, sortOrder: 32,
    aliases: ["Maintenance", "Repair", "Repairs", "Maintancne Elita Square"] },

  // ---- Office & Admin ----------------------------------------------------
  { code: "OFFICE_SUPPLIES", icon: "📎", color: "teal", name: "Office Supplies", group: "Office & Admin",
    tallyLedger: "Office Expenses", costCenters: ALL, monthlyBudget: 3000, sortOrder: 40,
    aliases: ["Office Supplies", "Office Supply", "Pantry"] },
  { code: "PRINTING", icon: "🖨️", color: "sky", name: "Printing & Stationery", group: "Office & Admin",
    tallyLedger: "Printing & Stationery", costCenters: ALL, monthlyBudget: 2000, sortOrder: 41,
    aliases: ["Printing", "Stationary & Admin", "Stationery", "Printing & Stationery"] },

  // ---- Travel ------------------------------------------------------------
  { code: "CONVEYANCE", icon: "🛺", color: "pink", name: "Local Conveyance", group: "Travel",
    tallyLedger: "Conveyance", costCenters: ALL, monthlyBudget: 5000, sortOrder: 50,
    aliases: ["Travel & Transport", "Conveyance", "Rapido", "Uber", "Ola", "Auto", "Petrol", "Fuel"] },
  { code: "TRAVEL_OUT", icon: "✈️", color: "violet", name: "Outstation Travel & Stay", group: "Travel",
    tallyLedger: "Travelling Expenses", costCenters: OFFICE, monthlyBudget: 15000,
    requiresBill: true, billThreshold: 2000, sortOrder: 51,
    aliases: ["Outstation Travel", "Hotel", "Lodging", "Flight", "Train"] },

  // ---- IT & Communication ------------------------------------------------
  { code: "IT_SOFTWARE", icon: "💻", color: "indigo", name: "Software & Subscriptions", group: "IT & Communication",
    tallyLedger: "Subscription Charges", costCenters: OFFICE, monthlyBudget: 5000,
    requiresBill: true, billThreshold: 2000, sortOrder: 60,
    aliases: ["Software", "Subscription", "SaaS"] },
  { code: "IT_EQUIP", icon: "🖥️", color: "blue", name: "IT Equipment & Consumables", group: "IT & Communication",
    tallyLedger: "Computer Expenses", costCenters: ALL, monthlyBudget: 4000, sortOrder: 61,
    aliases: ["IT & Infrastructure", "IT", "Computer", "Hardware"] },
  { code: "TELECOM", icon: "📶", color: "sky", name: "Internet & Mobile", group: "IT & Communication",
    tallyLedger: "Telephone & Internet", costCenters: ALL, monthlyBudget: 3000, sortOrder: 62,
    aliases: ["Internet", "Mobile", "Recharge", "Telephone", "Wifi"] },

  // ---- Marketing ---------------------------------------------------------
  { code: "MARKETING", icon: "📣", color: "pink", name: "Marketing & Events", group: "Marketing",
    tallyLedger: "Advertisement & Publicity", costCenters: OFFICE, monthlyBudget: 10000,
    requiresBill: true, billThreshold: 5000, sortOrder: 70,
    aliases: ["Marketing & Events", "Marketing", "Events", "Shoot", "Photoshoot"] },
  { code: "SAMPLES", icon: "🎀", color: "red", name: "Samples & Giveaways", group: "Marketing",
    tallyLedger: "Sales Promotion", costCenters: ALL, monthlyBudget: 3000, sortOrder: 71,
    aliases: ["Samples", "Giveaway", "Influencer Gifting", "PR Package"] },

  // ---- Professional & Statutory -----------------------------------------
  { code: "PROF_FEES", icon: "⚖️", color: "green", name: "Professional Fees", group: "Professional & Statutory",
    tallyLedger: "Legal & Professional Charges", costCenters: OFFICE, monthlyBudget: 10000,
    requiresBill: true, billThreshold: 1, sortOrder: 80,
    aliases: ["Professional Fees", "CA", "Legal", "Consultant"] },
  { code: "STATUTORY", icon: "🏛️", color: "green", name: "Statutory & Compliance", group: "Professional & Statutory",
    tallyLedger: "Rates & Taxes", costCenters: OFFICE, monthlyBudget: 5000, requiresBill: true,
    billThreshold: 1, sortOrder: 81,
    aliases: ["Statutory", "Compliance", "GST", "Government Fees", "Licence", "License"] },
  { code: "BANK_CHARGES", icon: "🏦", color: "teal", name: "Bank & Payment Charges", group: "Professional & Statutory",
    tallyLedger: "Bank Charges", costCenters: OFFICE, monthlyBudget: 2000, sortOrder: 82,
    aliases: ["Bank Charges", "Payment Gateway", "Bank"] },

  // ---- Capex -------------------------------------------------------------
  { code: "FURNITURE", icon: "🪑", color: "red", name: "Furniture & Fixtures (Capex)", group: "Capital Expenditure",
    tallyLedger: "Furniture & Fixtures", costCenters: ALL, isCapex: true, requiresBill: true,
    billThreshold: 1, monthlyBudget: 0, sortOrder: 90,
    aliases: ["Chair", "Table", "Furniture", "Fixtures"] },
  { code: "EQUIPMENT", icon: "⚙️", color: "orange", name: "Plant & Equipment (Capex)", group: "Capital Expenditure",
    tallyLedger: "Plant & Machinery", costCenters: ALL, isCapex: true, requiresBill: true,
    billThreshold: 1, monthlyBudget: 0, sortOrder: 91,
    aliases: ["Equipment", "Machine", "Machinery"] },

  // ---- Catch-alls --------------------------------------------------------
  /**
   * "Office Operations" was the dumping ground in the old founder workbook
   * (33 of 63 FY26-27 rows, 151 historical rows). It is kept only so migrated
   * rows are not silently mis-stated; the dashboard flags it for re-tagging.
   */
  { code: "UNCLASSIFIED", icon: "❓", color: "slate", name: "Unclassified (re-tag)", group: "Other",
    tallyLedger: "Suspense", costCenters: ALL, monthlyBudget: 0, sortOrder: 98,
    aliases: ["Office Operations", "Office Operation", "Other", "Others", "Misc",
              "Krinesh Sir", "Rasesh Sir"] },
  { code: "MISC", icon: "🔖", color: "slate", name: "Miscellaneous", group: "Other",
    tallyLedger: "General Expenses", costCenters: ALL, monthlyBudget: 3000, sortOrder: 99,
    aliases: ["Miscellaneous", "Sundry"] },
];

/** Sheet labels that are NOT expenses and must never become Expense rows. */
export const NON_EXPENSE_LABELS = new Set(
  ["petty cash given", "opening balance", "cash received", "cash in", "cash from company"]
);
