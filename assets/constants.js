/* ============================================================
   ENB Economic & MSME Survey — shared constants
   ============================================================ */

const ENB_DISTRICTS = ["Kokopo", "Rabaul", "Gazelle", "Pomio"];

const BUSINESS_ACTIVITIES = {
  "Trade & Services": [
    "Trade store", "Wholesale", "Fast food outlet", "Second hand clothing shop",
    "Liquor / Bottle shop", "Bakery", "Service station", "PMV / Transport / Taxi services",
    "Pest Control", "Professional services (accountancy / consultancy)", "Tailoring",
    "Coffin Making", "Mechanical Workshop", "Contracting services",
    "Communication Towers (specify owner)"
  ],
  "DPI (Agriculture)": [
    "Cocoa Buying / Cocoa dealer", "Livestock / Poultry / Cattle", "Fresh produce",
    "Cocoa / coconut nursery"
  ],
  "Tourism": [
    "Arts and craft", "Guest house / hospitality", "Restaurant", "Tour operators",
    "Tourism product owners", "Sport tourism", "Hiking", "Bird watching", "Homestay"
  ],
  "NRMD (Forestry)": [
    "Nursery", "Sawmilling", "Mini down streaming (e.g. eaglewood)",
    "Furniture (e.g. log to desk, tables)", "Logging"
  ],
  "Fisheries": [
    "Coastal fishing", "Sea cucumber dealer", "Inland fish farming"
  ]
};

const REGISTRATION_FORMS = ["Company", "Business Name", "Business Group", "Association", "Co-operative"];

const LICENSE_TYPES = [
  "Trading License", "Liquor", "Cocoa Dealers License", "Frozen Goods License",
  "Second hand License", "Inflammable Liquids", "Dangerous Goods License", "Paddlers license"
];

const TRAINING_ATTENDED_TYPES = [
  "Start Your Business (SYB)", "Improve Your Business (IYB)", "Business Awareness",
  "Financial Literacy Training"
];

const TRAINING_REQUIRED_TYPES = [
  "SIYB", "Bookkeeping", "Cost/Pricing & Financial Planning", "Cash flows/Budgeting",
  "Financial Literacy Training"
];

const ASSISTANCE_TYPES = [
  "General Business Advice", "Bookkeeping & Business Records",
  "Costing/Pricing & Financial Planning", "Cash flows", "IPA Registration/Statutory Returns",
  "IRC Statutory Returns", "Financial Statement", "Business Plan/Loan Proposals"
];

const CASH_CROPS = ["Cocoa", "Coconut", "Balsa", "Coffee", "Vanilla"];

const TURNOVER_BANDS = [
  { value: "<60000", label: "Less than K60,000" },
  { value: "60001-250000", label: "K60,001 – K250,000" },
  { value: "250000-5000000", label: "K250,000 – K5,000,000" },
  { value: ">5000000", label: "Over K5,000,000" }
];

const EXPENSES_BANDS = [
  { value: "<5000", label: "Less than K5,000" },
  { value: "5001-250000", label: "K5,001 – K250,000" },
  { value: "250001-500000", label: "K250,001 – K500,000" },
  { value: ">500001", label: "Over K500,001" }
];
