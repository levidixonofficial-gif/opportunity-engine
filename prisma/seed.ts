/**
 * Development + baseline seed.
 *
 * SAFE FOR PRODUCTION: this seed only creates reference data (categories,
 * skills, interests, opportunities, feature flags) via upserts keyed on stable
 * slugs. It never creates users or fake revenue. Run with `npm run db:seed`.
 */
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import { config as loadEnv } from "dotenv";

loadEnv({ path: [".env.local", ".env"] });

const provider = process.env.DATABASE_PROVIDER ?? "postgresql";
const url = process.env.DATABASE_URL!;
const adapter =
  provider === "postgresql" ? new PrismaPg({ connectionString: url }) : new PrismaBetterSqlite3({ url });
const db = new PrismaClient({ adapter });

const CATEGORIES = [
  { slug: "freelancing", label: "Freelancing", icon: "briefcase", description: "Sell a skill by the hour or project." },
  { slug: "local-services", label: "Local Service Businesses", icon: "map-pin", description: "Serve customers in a physical area." },
  { slug: "digital-products", label: "Digital Products", icon: "package", description: "Make once, sell many times." },
  { slug: "content", label: "Content Creation", icon: "video", description: "Build an audience, monetize attention." },
  { slug: "affiliate", label: "Affiliate Marketing", icon: "link", description: "Earn commission recommending products." },
  { slug: "ecommerce", label: "E-commerce", icon: "shopping-cart", description: "Sell physical goods online." },
  { slug: "ai-services", label: "AI-Assisted Services", icon: "sparkles", description: "Package AI workflows as a service." },
  { slug: "lead-gen", label: "Lead Generation", icon: "target", description: "Find customers for other businesses." },
];

const SKILLS = [
  ["writing", "Writing", "Communication"],
  ["design", "Graphic / visual design", "Creative"],
  ["video-editing", "Video editing", "Creative"],
  ["web-dev", "Web development", "Technical"],
  ["spreadsheets", "Spreadsheets / data", "Technical"],
  ["sales", "Sales / outreach", "Business"],
  ["social-media", "Social media", "Marketing"],
  ["seo", "SEO", "Marketing"],
  ["customer-service", "Customer service", "Business"],
  ["photography", "Photography", "Creative"],
  ["teaching", "Teaching / explaining", "Communication"],
  ["organization", "Organization / admin", "Business"],
  ["ai-tools", "Using AI tools", "Technical"],
  ["manual-labor", "Hands-on / physical work", "Practical"],
];

const INTERESTS = [
  ["marketing", "Marketing"],
  ["technology", "Technology"],
  ["home-services", "Home & property"],
  ["education", "Education"],
  ["ecommerce", "Retail & products"],
  ["media", "Media & entertainment"],
  ["finance", "Personal finance"],
  ["health", "Health & fitness"],
  ["small-business", "Helping small businesses"],
  ["writing", "Writing & storytelling"],
];

interface OppSeed {
  slug: string;
  name: string;
  category: string;
  summary: string;
  description: string;
  difficulty: number;
  learningCurve: number;
  competitionLevel: number;
  scalability: number;
  demandScore: number;
  startupCostBand: string;
  timeCommitment: string;
  isOnline: boolean;
  isServiceBased: boolean;
  beginnerFriendly: boolean;
  featured?: boolean;
  // Phase 2 depth
  ongoingCostBand?: string;
  geoDependence?: string;
  repeatRevenuePotential?: number;
  salesCycle?: string;
  targetCustomer?: string;
  prerequisites?: string;
  failureModes?: string;
  revenueModel: string;
  monetizationNotes: string;
  riskNotes: string;
  profitFactors: string;
  required: string[];
  helpful: string[];
  interests: string[];
  tools: { name: string; note?: string }[];
  steps: { phase: string; title: string; detail: string }[];
  examples: { title: string; detail: string }[];
}

// Phase 2 depth, keyed by slug. Merged into each opportunity at seed time so the
// OPPS array stays readable. All descriptive — nothing implies guaranteed income.
const PHASE2: Record<
  string,
  Pick<
    OppSeed,
    | "ongoingCostBand"
    | "geoDependence"
    | "repeatRevenuePotential"
    | "salesCycle"
    | "targetCustomer"
    | "prerequisites"
    | "failureModes"
  >
> = {
  "ai-lead-gen-for-local-businesses": {
    ongoingCostBand: "50_250",
    geoDependence: "none",
    repeatRevenuePotential: 4,
    salesCycle: "short",
    targetCustomer: "Owners of local service businesses (roofers, dentists, gyms, contractors) who need more customers but have no time to prospect.",
    prerequisites: "Comfort writing short messages, a spreadsheet, and an email tool with decent deliverability. No audience needed.",
    failureModes: "Picking too broad a niche; sending generic blasts; landing a client whose own sales follow-up is so weak that booked calls go nowhere.",
  },
  "freelance-writing-services": {
    ongoingCostBand: "lt_50",
    geoDependence: "none",
    repeatRevenuePotential: 3,
    salesCycle: "short",
    targetCustomer: "Marketing leads at small B2B companies, agencies, and solo founders who publish content but can't keep up.",
    prerequisites: "The ability to write clearly and hit a deadline, plus 2–3 samples in a chosen niche.",
    failureModes: "Staying a generalist and competing on price; taking any topic; underpricing the first client and never raising rates.",
  },
  "pressure-washing-side-business": {
    ongoingCostBand: "50_250",
    geoDependence: "local",
    repeatRevenuePotential: 4,
    salesCycle: "immediate",
    targetCustomer: "Homeowners in a defined neighborhood; later, property managers and small commercial sites.",
    prerequisites: "A vehicle, ~$400–$800 for a washer and surface cleaner, physical capability, and basic insurance before paid work.",
    failureModes: "Damaging a surface from bad technique; underquoting travel time; treating it as one-off jobs instead of building a repeat route.",
  },
  "notion-template-shop": {
    ongoingCostBand: "lt_50",
    geoDependence: "none",
    repeatRevenuePotential: 3,
    salesCycle: "immediate",
    targetCustomer: "People with a specific recurring workflow problem — freelancers, small teams, creators — who will pay $10–$60 to skip setup.",
    prerequisites: "You must actually use the tool and the workflow yourself, plus a way to drive traffic (audience, SEO, or communities).",
    failureModes: "Building a 'life OS' nobody searches for; no marketing plan; competing in a saturated category with no distribution.",
  },
  "short-form-video-editing": {
    ongoingCostBand: "lt_50",
    geoDependence: "none",
    repeatRevenuePotential: 4,
    salesCycle: "short",
    targetCustomer: "Coaches, founders, and creators who film regularly but don't have time to cut and caption.",
    prerequisites: "An editor you know well, taste built from studying good shorts, and 2–3 spec edits.",
    failureModes: "Slow turnaround; unlimited revisions with no cap; clients who stop filming so the retainer dies.",
  },
  "bookkeeping-for-small-businesses": {
    ongoingCostBand: "50_250",
    geoDependence: "none",
    repeatRevenuePotential: 5,
    salesCycle: "medium",
    targetCustomer: "Small local businesses (trades, restaurants, clinics) that dread receipts and reconciliation.",
    prerequisites: "A reputable bookkeeping basics course and fluency in one accounting platform. Accuracy and discretion are non-negotiable.",
    failureModes: "Drifting into tax advice you're not qualified to give; unclear monthly scope; taking on messy clients without a cleanup fee.",
  },
  "print-on-demand-store": {
    ongoingCostBand: "50_250",
    geoDependence: "none",
    repeatRevenuePotential: 2,
    salesCycle: "immediate",
    targetCustomer: "Members of a specific community or identity group who would wear a design only an insider gets.",
    prerequisites: "Design ability (or a tool), a storefront, sample orders to check quality, and a small ad-test budget.",
    failureModes: "Generic 'funny shirt' designs; ignoring base cost + shipping time; IP problems; scaling ads before a design proves itself.",
  },
  "ai-automation-consulting": {
    ongoingCostBand: "50_250",
    geoDependence: "none",
    repeatRevenuePotential: 4,
    salesCycle: "medium",
    targetCustomer: "Small business owners with 3–4 repetitive workflows quietly wasting hours a week.",
    prerequisites: "Working knowledge of a no-code automation platform and an AI API, plus one automation you've built end-to-end.",
    failureModes: "Tool sprawl and silent breakage; scoping creep; over-promising reliability; automating a process that isn't stable enough yet.",
  },
  "niche-newsletter": {
    ongoingCostBand: "lt_50",
    geoDependence: "none",
    repeatRevenuePotential: 5,
    salesCycle: "long",
    targetCustomer: "Readers in an underserved niche; later, advertisers who want to reach them.",
    prerequisites: "The ability to publish something genuinely useful every week and sustain it for months before monetizing.",
    failureModes: "Quitting before compounding kicks in; a niche with no advertiser budget; inconsistent sending; buying subscribers.",
  },
  "virtual-assistant-services": {
    ongoingCostBand: "lt_50",
    geoDependence: "none",
    repeatRevenuePotential: 4,
    salesCycle: "short",
    targetCustomer: "Busy solo operators — coaches, agency owners, realtors, consultants — drowning in admin.",
    prerequisites: "Strong organization, clear communication, and a password manager for handling client access safely.",
    failureModes: "Staying a low-paid generalist; over-reliance on one client; no documented processes so you can't be trusted with more.",
  },
};

const OPPS: OppSeed[] = [
  {
    slug: "ai-lead-gen-for-local-businesses",
    name: "AI-assisted local lead generation",
    category: "lead-gen",
    summary: "Use AI + public data to build qualified prospect lists and book appointments for local service companies.",
    description:
      "Local service businesses (roofers, dentists, gyms) constantly need new customers but rarely have time to prospect. You build targeted lists from public sources, use AI to draft personalized outreach, and get paid per booked appointment or on a monthly retainer.",
    difficulty: 2,
    learningCurve: 2,
    competitionLevel: 3,
    scalability: 4,
    demandScore: 4,
    startupCostBand: "lt_50",
    timeCommitment: "2_3_hr",
    isOnline: true,
    isServiceBased: true,
    beginnerFriendly: true,
    featured: true,
    revenueModel: "Typical business model: a monthly retainer ($500–$2,000) or pay-per-appointment pricing, one to five local clients.",
    monetizationNotes: "Possible monetization: retainers, per-lead fees, per-booked-call fees, or a small setup fee plus performance bonus.",
    riskNotes: "Risk considerations: results depend on the client's sales follow-up, deliverability rules for cold email, and local demand for the client's service.",
    profitFactors: "Factors that influence profitability: your close rate on outreach, client retention, how many accounts one person can service, and tooling costs.",
    required: ["sales", "ai-tools"],
    helpful: ["spreadsheets", "writing", "social-media"],
    interests: ["marketing", "small-business", "technology"],
    tools: [
      { name: "A spreadsheet tool", note: "list building and tracking" },
      { name: "An email outreach tool", note: "sequencing and deliverability" },
      { name: "An AI assistant", note: "drafting personalized messages" },
    ],
    steps: [
      { phase: "Week 1", title: "Pick one niche", detail: "Choose a single local service type you can describe clearly. Narrow beats broad." },
      { phase: "Week 1", title: "Define the offer", detail: "Decide what you deliver (e.g. 10 booked calls/month) and how you price it." },
      { phase: "Week 2", title: "Build a 100-prospect list", detail: "Use public directories and maps data. Capture owner name, business, and a personalization hook." },
      { phase: "Week 2", title: "Draft outreach with AI", detail: "Write one strong template, then use AI to personalize the first line per prospect." },
      { phase: "Week 3", title: "Send and track", detail: "Send in small batches, reply fast, book discovery calls, and log every response." },
      { phase: "Week 4", title: "Close and deliver", detail: "Sign one client, deliver the promised outreach for them, and ask for a testimonial." },
    ],
    examples: [
      { title: "Appointments for HVAC companies", detail: "Retainer to keep 3 installers' calendars full during shoulder season." },
      { title: "New-patient outreach for dental practices", detail: "Per-booked-consult pricing for cosmetic dentistry." },
    ],
  },
  {
    slug: "freelance-writing-services",
    name: "Freelance writing services",
    category: "freelancing",
    summary: "Write articles, newsletters, and website copy for businesses that need consistent content.",
    description:
      "Businesses need words: blog posts, email newsletters, product pages, case studies. If you can write clearly and hit a deadline, you can start with zero inventory and one client.",
    difficulty: 2,
    learningCurve: 2,
    competitionLevel: 4,
    scalability: 2,
    demandScore: 3,
    startupCostBand: "lt_50",
    timeCommitment: "1_hr",
    isOnline: true,
    isServiceBased: true,
    beginnerFriendly: true,
    revenueModel: "Typical business model: per-word or per-project rates, or a monthly content retainer with a fixed deliverable count.",
    monetizationNotes: "Possible monetization: one-off articles, monthly retainers, editing add-ons, or content strategy calls.",
    riskNotes: "Risk considerations: income is tied to your hours, rates vary widely by niche, and AI has increased low-end competition — specialization matters.",
    profitFactors: "Factors that influence profitability: your niche, portfolio strength, retainer vs. one-off mix, and how fast you draft.",
    required: ["writing"],
    helpful: ["seo", "ai-tools", "teaching"],
    interests: ["writing", "marketing", "small-business"],
    tools: [
      { name: "A word processor", note: "drafting and delivery" },
      { name: "A grammar checker", note: "self-editing" },
    ],
    steps: [
      { phase: "Week 1", title: "Choose a niche", detail: "Pick an industry you understand or want to learn. Generalists compete on price." },
      { phase: "Week 1", title: "Write 3 samples", detail: "Publish three strong pieces in your niche, even unpaid, to show range." },
      { phase: "Week 2", title: "Build a simple portfolio", detail: "One page: who you help, what you write, links to samples, how to contact you." },
      { phase: "Week 3", title: "Outreach", detail: "Contact 5 businesses per day whose existing content you could improve. Be specific." },
      { phase: "Week 4", title: "Deliver and systematize", detail: "Land one client, build a repeatable brief-to-draft process, ask for referrals." },
    ],
    examples: [
      { title: "SaaS blog retainer", detail: "Four deeply-researched posts a month for a B2B software company." },
      { title: "Local newsletter ghostwriting", detail: "Weekly email for a real-estate agent to stay top-of-mind." },
    ],
  },
  {
    slug: "pressure-washing-side-business",
    name: "Pressure washing service",
    category: "local-services",
    summary: "Clean driveways, siding, and decks for homeowners in your area — high demand, visible results.",
    description:
      "Exterior cleaning has strong local demand, obvious before/after results that sell themselves, and low competition in most neighborhoods. It is physical, weather-dependent work with real equipment costs, but you can start part-time on weekends.",
    difficulty: 2,
    learningCurve: 2,
    competitionLevel: 2,
    scalability: 3,
    demandScore: 4,
    startupCostBand: "250_1000",
    timeCommitment: "4_plus_hr",
    isOnline: false,
    isServiceBased: true,
    beginnerFriendly: true,
    featured: true,
    revenueModel: "Typical business model: per-job pricing based on surface area, with recurring seasonal customers and add-ons like gutter cleaning.",
    monetizationNotes: "Possible monetization: one-time cleans, annual maintenance plans, commercial contracts, and referral bonuses.",
    riskNotes: "Risk considerations: equipment and chemical costs, weather and seasonality, physical strain, insurance, and surface-damage liability.",
    profitFactors: "Factors that influence profitability: jobs per day, travel distance, repeat-customer rate, water/chemical costs, and whether you add crew.",
    required: ["manual-labor"],
    helpful: ["sales", "customer-service", "social-media", "photography"],
    interests: ["home-services", "small-business"],
    tools: [
      { name: "A pressure washer and surface cleaner", note: "core equipment" },
      { name: "A simple scheduling/CRM tool", note: "quotes and follow-ups" },
      { name: "A phone camera", note: "before/after photos for marketing" },
    ],
    steps: [
      { phase: "Week 1", title: "Learn the basics safely", detail: "Understand PSI, surfaces you must not damage, and chemical handling. Practice on your own property." },
      { phase: "Week 1", title: "Price your services", detail: "Set per-square-foot rates for driveways, siding, decks. Know your minimum job price." },
      { phase: "Week 2", title: "Do 3 free or discounted jobs", detail: "Friends and neighbors, in exchange for before/after photos and reviews." },
      { phase: "Week 3", title: "Get visible locally", detail: "Post results in neighborhood groups, add a simple booking page, put a sign on your vehicle." },
      { phase: "Week 4", title: "Book paying work and rebook", detail: "Quote fast, show up on time, and offer every customer a yearly maintenance slot." },
    ],
    examples: [
      { title: "Weekend driveway route", detail: "Six to eight residential driveways per Saturday in one subdivision." },
      { title: "HOA common-area contract", detail: "Quarterly sidewalk and entrance-sign cleaning for a homeowners association." },
    ],
  },
  {
    slug: "notion-template-shop",
    name: "Digital template shop",
    category: "digital-products",
    summary: "Design and sell reusable templates (planners, trackers, dashboards) that solve one specific problem well.",
    description:
      "Templates are a classic make-once-sell-many product. The hard part is not the file — it is picking a painful, specific problem and marketing the solution consistently.",
    difficulty: 3,
    learningCurve: 3,
    competitionLevel: 4,
    scalability: 5,
    demandScore: 3,
    startupCostBand: "lt_50",
    timeCommitment: "2_3_hr",
    isOnline: true,
    isServiceBased: false,
    beginnerFriendly: false,
    revenueModel: "Typical business model: low-priced digital downloads ($10–$60) sold through a storefront, with occasional bundles and a higher-priced flagship.",
    monetizationNotes: "Possible monetization: individual templates, bundles, a subscription vault, affiliate/referral partners, and custom versions.",
    riskNotes: "Risk considerations: heavily marketing-dependent, easy to copy, platform dependence, and slow to gain traction without an audience.",
    profitFactors: "Factors that influence profitability: traffic sources, conversion rate, price point, catalog size, and repeat purchase rate.",
    required: ["organization", "design"],
    helpful: ["social-media", "writing", "seo"],
    interests: ["technology", "education", "small-business"],
    tools: [
      { name: "A workspace/doc tool that supports templates", note: "building the product" },
      { name: "A digital storefront", note: "selling and delivering files" },
    ],
    steps: [
      { phase: "Week 1", title: "Pick one painful workflow", detail: "Something you personally do. 'Freelancer client tracker', not 'life planner'." },
      { phase: "Week 2", title: "Build and dogfood it", detail: "Use your own template for real for a week and fix every rough edge." },
      { phase: "Week 3", title: "Set up the storefront", detail: "One product page: the problem, screenshots, a short demo, clear price." },
      { phase: "Week 4", title: "Market where the problem lives", detail: "Answer questions in communities, post walkthroughs, collect emails for launch." },
    ],
    examples: [
      { title: "Freelance finance tracker", detail: "Invoices, expenses, and quarterly tax set-aside in one template." },
      { title: "Content calendar system", detail: "Idea backlog to scheduled posts for solo creators." },
    ],
  },
  {
    slug: "short-form-video-editing",
    name: "Short-form video editing",
    category: "freelancing",
    summary: "Edit clips into captioned short videos for creators and businesses that film but don't have time to cut.",
    description:
      "Every coach, founder, and creator wants a steady stream of shorts but editing eats hours. If you can cut a tight 30–60 second video with captions and hooks, there is repeatable retainer work here.",
    difficulty: 2,
    learningCurve: 3,
    competitionLevel: 3,
    scalability: 3,
    demandScore: 4,
    startupCostBand: "lt_50",
    timeCommitment: "2_3_hr",
    isOnline: true,
    isServiceBased: true,
    beginnerFriendly: true,
    revenueModel: "Typical business model: per-video pricing or a monthly package (e.g. 12–20 shorts/month) per client, two to four clients.",
    monetizationNotes: "Possible monetization: per-video rates, monthly retainers, rush fees, thumbnail add-ons, and repurposing packages.",
    riskNotes: "Risk considerations: turnaround pressure, revision cycles, taste is learned slowly, and clients churn when their own posting stops.",
    profitFactors: "Factors that influence profitability: minutes of editing per deliverable, retainer size, revision limits, and batching efficiency.",
    required: ["video-editing"],
    helpful: ["social-media", "design", "writing"],
    interests: ["media", "marketing"],
    tools: [
      { name: "A video editor", note: "cutting and captioning" },
      { name: "A file transfer / storage tool", note: "receiving footage" },
    ],
    steps: [
      { phase: "Week 1", title: "Learn one format cold", detail: "Talking-head short with captions, b-roll, and a hook. Recreate 10 you admire." },
      { phase: "Week 2", title: "Make 3 spec edits", detail: "Edit real public clips from creators in your target niche as portfolio pieces." },
      { phase: "Week 3", title: "Outreach with a sample", detail: "Send target creators a free edit of one of their existing clips." },
      { phase: "Week 4", title: "Package and retain", detail: "Convert interest into a monthly package with a clear deliverable count and revision policy." },
    ],
    examples: [
      { title: "Founder clip retainer", detail: "16 captioned shorts a month from a startup CEO's podcast appearances." },
      { title: "Course-creator repurposing", detail: "Turn one long lesson into 8 promotional shorts each week." },
    ],
  },
  {
    slug: "bookkeeping-for-small-businesses",
    name: "Bookkeeping for small businesses",
    category: "freelancing",
    summary: "Keep the books tidy for small local businesses that dread spreadsheets and receipts.",
    description:
      "Steady, unglamorous, recession-resilient. Many small businesses will happily pay a few hundred a month to never think about categorizing transactions or reconciling accounts.",
    difficulty: 3,
    learningCurve: 4,
    competitionLevel: 2,
    scalability: 3,
    demandScore: 4,
    startupCostBand: "50_250",
    timeCommitment: "1_hr",
    isOnline: true,
    isServiceBased: true,
    beginnerFriendly: false,
    revenueModel: "Typical business model: fixed monthly fee per client ($250–$800) scaled by transaction volume, five to fifteen clients.",
    monetizationNotes: "Possible monetization: monthly bookkeeping retainers, catch-up/cleanup projects, and payroll or invoicing add-ons.",
    riskNotes: "Risk considerations: requires accuracy and discretion, a learning curve on accounting basics and software, and clear scope to avoid drifting into tax advice.",
    profitFactors: "Factors that influence profitability: clients per hour of work, software costs, cleanup vs. steady-state mix, and client transaction volume.",
    required: ["spreadsheets", "organization"],
    helpful: ["customer-service", "sales"],
    interests: ["finance", "small-business"],
    tools: [
      { name: "Cloud accounting software", note: "core system of record" },
      { name: "A document/receipt collection tool", note: "client hand-offs" },
    ],
    steps: [
      { phase: "Week 1-2", title: "Learn the fundamentals", detail: "Complete a reputable bookkeeping basics course and learn one accounting platform well." },
      { phase: "Week 3", title: "Define your service", detail: "Decide exactly what a monthly close includes and what it does not (no tax filing)." },
      { phase: "Week 4", title: "Land a first client", detail: "Offer a discounted cleanup project to one local business and convert it to monthly." },
      { phase: "Ongoing", title: "Systematize the monthly close", detail: "Build a checklist per client so each close takes predictable time." },
    ],
    examples: [
      { title: "Restaurant monthly close", detail: "Categorize sales, reconcile accounts, and send an owner-friendly summary each month." },
      { title: "Contractor cleanup project", detail: "Two years of neglected books brought current before tax season." },
    ],
  },
  {
    slug: "print-on-demand-store",
    name: "Print-on-demand store",
    category: "ecommerce",
    summary: "Sell designed apparel and goods with no inventory — a supplier prints and ships each order.",
    description:
      "Print-on-demand removes inventory risk but not marketing risk. Winning stores have a specific audience and designs that audience wants to wear, not generic quotes on a shirt.",
    difficulty: 3,
    learningCurve: 3,
    competitionLevel: 5,
    scalability: 4,
    demandScore: 2,
    startupCostBand: "50_250",
    timeCommitment: "2_3_hr",
    isOnline: true,
    isServiceBased: false,
    beginnerFriendly: false,
    revenueModel: "Typical business model: per-item margin (retail minus base cost) on a storefront, driven by paid ads or an existing community.",
    monetizationNotes: "Possible monetization: direct storefront sales, marketplace listings, limited drops, and licensing designs.",
    riskNotes: "Risk considerations: very high competition, thin margins after ad spend, base-cost and shipping-time constraints, and intellectual-property pitfalls.",
    profitFactors: "Factors that influence profitability: niche specificity, ad efficiency, average order value, return rate, and repeat customers.",
    required: ["design"],
    helpful: ["social-media", "seo", "sales"],
    interests: ["ecommerce", "media"],
    tools: [
      { name: "A print-on-demand supplier", note: "printing and fulfillment" },
      { name: "An e-commerce storefront", note: "catalog and checkout" },
      { name: "A design tool", note: "artwork" },
    ],
    steps: [
      { phase: "Week 1", title: "Choose a specific audience", detail: "A hobby, profession, or identity you understand. Broad 'funny shirts' loses." },
      { phase: "Week 2", title: "Create 10 focused designs", detail: "Inside jokes and references that audience recognizes instantly." },
      { phase: "Week 3", title: "Order samples", detail: "Buy your own products to check print quality, sizing, and shipping time before selling." },
      { phase: "Week 4", title: "Test demand cheaply", detail: "Share in the community, run a tiny ad budget, and keep only designs that get traction." },
    ],
    examples: [
      { title: "Trail-running community apparel", detail: "Designs referencing specific races and local trails." },
      { title: "Niche profession humor", detail: "Shirts only nurses, or only electricians, would find funny." },
    ],
  },
  {
    slug: "ai-automation-consulting",
    name: "AI automation for small businesses",
    category: "ai-services",
    summary: "Build small automations (intake, follow-ups, reporting) that save owners hours every week.",
    description:
      "Most small businesses have three or four repetitive workflows that quietly waste time. You scope one, wire it up with existing automation tools plus an AI step, and charge for the setup and upkeep.",
    difficulty: 3,
    learningCurve: 3,
    competitionLevel: 2,
    scalability: 4,
    demandScore: 4,
    startupCostBand: "50_250",
    timeCommitment: "2_3_hr",
    isOnline: true,
    isServiceBased: true,
    beginnerFriendly: false,
    featured: true,
    revenueModel: "Typical business model: a setup fee per automation ($500–$3,000) plus a monthly maintenance retainer, or a bundled monthly 'operations' fee.",
    monetizationNotes: "Possible monetization: build fees, monthly maintenance, audit/roadmap engagements, and training sessions.",
    riskNotes: "Risk considerations: tool sprawl and breakage, scoping creep, over-promising reliability, and clients whose processes aren't stable enough to automate.",
    profitFactors: "Factors that influence profitability: reusable components across clients, retainer attach rate, tool costs, and how tightly you scope each build.",
    required: ["ai-tools", "spreadsheets"],
    helpful: ["web-dev", "sales", "organization"],
    interests: ["technology", "small-business", "marketing"],
    tools: [
      { name: "A no-code automation platform", note: "connecting apps" },
      { name: "An AI API or assistant", note: "the intelligent step" },
      { name: "A documentation tool", note: "handover and maintenance notes" },
    ],
    steps: [
      { phase: "Week 1", title: "Pick one automation you can repeat", detail: "e.g. 'new lead → enriched → personalized reply drafted → task created'." },
      { phase: "Week 2", title: "Build it for yourself or one friendly business", detail: "Prove it works end-to-end and document every step." },
      { phase: "Week 3", title: "Package the offer", detail: "Fixed scope, fixed price, clear maintenance terms. One page." },
      { phase: "Week 4", title: "Sell to similar businesses", detail: "The same automation resold to businesses in one industry compounds fast." },
    ],
    examples: [
      { title: "Contractor quote follow-up", detail: "Automatic, personalized follow-ups on unanswered quotes with owner approval." },
      { title: "Weekly owner report", detail: "Pulls numbers from several tools into one plain-language Monday email." },
    ],
  },
  {
    slug: "niche-newsletter",
    name: "Niche newsletter",
    category: "content",
    summary: "Build an email audience around one specific topic, then monetize with sponsorships or a paid tier.",
    description:
      "A newsletter is slow to start and compounding once it works. The winning move is an underserved niche where you can be consistently useful every week.",
    difficulty: 3,
    learningCurve: 2,
    competitionLevel: 3,
    scalability: 5,
    demandScore: 3,
    startupCostBand: "lt_50",
    timeCommitment: "1_hr",
    isOnline: true,
    isServiceBased: false,
    beginnerFriendly: true,
    revenueModel: "Typical business model: free list growth first, then sponsorships (priced per subscriber), a paid premium tier, or affiliate revenue once the list is large enough.",
    monetizationNotes: "Possible monetization: sponsor slots, paid subscriptions, a job board, affiliate links, and spin-off products.",
    riskNotes: "Risk considerations: months of unpaid work before monetization, high consistency demands, and open-rate and deliverability dependence.",
    profitFactors: "Factors that influence profitability: list size and engagement, niche advertiser budgets, publishing consistency, and free-to-paid conversion.",
    required: ["writing"],
    helpful: ["seo", "social-media", "teaching"],
    interests: ["writing", "media", "marketing", "finance"],
    tools: [
      { name: "An email newsletter platform", note: "sending and subscriber management" },
      { name: "A simple landing page", note: "sign-ups" },
    ],
    steps: [
      { phase: "Week 1", title: "Define the reader and promise", detail: "'Who is this for' and 'what they get every week' in one sentence each." },
      { phase: "Week 2", title: "Publish 4 issues before promoting", detail: "Prove to yourself you can sustain the cadence and quality." },
      { phase: "Week 3", title: "Set up a sign-up page", detail: "Clear promise, sample issue, single call to action." },
      { phase: "Week 4+", title: "Grow deliberately", detail: "Cross-post, guest write, partner with adjacent newsletters, and ask readers to share." },
    ],
    examples: [
      { title: "Regional commercial real-estate brief", detail: "Weekly deals and trends for one metro area, sponsored by local brokers." },
      { title: "Tools digest for a profession", detail: "New software and workflows for a specific job, with a paid deep-dive tier." },
    ],
  },
  {
    slug: "virtual-assistant-services",
    name: "Virtual assistant services",
    category: "freelancing",
    summary: "Take recurring admin, inbox, scheduling, and research tasks off a busy business owner's plate.",
    description:
      "One of the fastest ways to a first online client. If you are organized, communicate well, and follow through, small business owners and solo founders will pay for reliable help.",
    difficulty: 1,
    learningCurve: 1,
    competitionLevel: 4,
    scalability: 2,
    demandScore: 3,
    startupCostBand: "lt_50",
    timeCommitment: "1_hr",
    isOnline: true,
    isServiceBased: true,
    beginnerFriendly: true,
    revenueModel: "Typical business model: hourly or monthly-hours packages (e.g. 20 hours/month) per client, two to three clients.",
    monetizationNotes: "Possible monetization: hourly retainers, monthly hour blocks, specialized add-ons (inbox management, CRM upkeep), and referrals.",
    riskNotes: "Risk considerations: income capped by your hours, price pressure at the entry level, and dependence on a small number of clients.",
    profitFactors: "Factors that influence profitability: specialization, rate per hour, retainer stability, and moving from generalist tasks to higher-value work.",
    required: ["organization"],
    helpful: ["customer-service", "writing", "spreadsheets", "ai-tools"],
    interests: ["small-business", "education"],
    tools: [
      { name: "A shared calendar and task tool", note: "coordinating with clients" },
      { name: "A password manager", note: "handling client access safely" },
    ],
    steps: [
      { phase: "Week 1", title: "List what you can do well", detail: "Scheduling, inbox triage, travel booking, data entry, light research, CRM updates." },
      { phase: "Week 2", title: "Set packages and rates", detail: "Offer a small monthly hours block so pricing is predictable for both sides." },
      { phase: "Week 3", title: "Reach out to busy solo operators", detail: "Coaches, agency owners, realtors, consultants. Lead with the tasks you remove." },
      { phase: "Week 4", title: "Onboard cleanly", detail: "Document how the client likes each task done so you can be trusted with more." },
    ],
    examples: [
      { title: "Inbox and calendar for a coach", detail: "Daily triage, scheduling, and reminders so the client only sees what matters." },
      { title: "Podcast production support", detail: "Guest scheduling, show notes drafting, and publishing checklist each week." },
    ],
  },
];

const FEATURE_FLAGS = [
  { key: "ai_assistant", description: "AI business coach chat (Phase 4)", state: "off" },
  { key: "semantic_search", description: "Pinecone-backed natural-language opportunity search (Phase 4)", state: "off" },
  { key: "generators", description: "Offer / outreach / content / action-plan generators (Phase 4)", state: "off" },
  { key: "crm", description: "Leads, deals, and pipeline (Phase 5)", state: "beta" },
  { key: "money_tracking", description: "Revenue / expense / profit tracking (Phase 5)", state: "beta" },
  { key: "billing", description: "Stripe subscriptions and entitlement upgrades (Phase 6)", state: "off" },
];

async function main() {
  for (const [i, c] of CATEGORIES.entries()) {
    await db.opportunityCategory.upsert({
      where: { slug: c.slug },
      update: { label: c.label, icon: c.icon, description: c.description, sortOrder: i },
      create: { ...c, sortOrder: i },
    });
  }

  for (const [slug, label, category] of SKILLS) {
    await db.skill.upsert({
      where: { slug },
      update: { label, category },
      create: { slug, label, category },
    });
  }

  for (const [slug, label] of INTERESTS) {
    await db.interest.upsert({ where: { slug }, update: { label }, create: { slug, label } });
  }

  const categoryIds = new Map(
    (await db.opportunityCategory.findMany()).map((c) => [c.slug, c.id]),
  );
  const skillIds = new Map((await db.skill.findMany()).map((s) => [s.slug, s.id]));
  const interestIds = new Map((await db.interest.findMany()).map((i) => [i.slug, i.id]));

  for (const o of OPPS) {
    const categoryId = categoryIds.get(o.category)!;
    const p2 = PHASE2[o.slug] ?? {};
    const common = {
      name: o.name,
      categoryId,
      summary: o.summary,
      description: o.description,
      difficulty: o.difficulty,
      learningCurve: o.learningCurve,
      competitionLevel: o.competitionLevel,
      scalability: o.scalability,
      demandScore: o.demandScore,
      startupCostBand: o.startupCostBand,
      timeCommitment: o.timeCommitment,
      isOnline: o.isOnline,
      isServiceBased: o.isServiceBased,
      beginnerFriendly: o.beginnerFriendly,
      featured: o.featured ?? false,
      ongoingCostBand: p2.ongoingCostBand ?? o.ongoingCostBand ?? "lt_50",
      geoDependence: p2.geoDependence ?? o.geoDependence ?? "none",
      repeatRevenuePotential: p2.repeatRevenuePotential ?? o.repeatRevenuePotential ?? 3,
      salesCycle: p2.salesCycle ?? o.salesCycle ?? "short",
      targetCustomer: p2.targetCustomer ?? o.targetCustomer ?? "",
      prerequisites: p2.prerequisites ?? o.prerequisites ?? "",
      failureModes: p2.failureModes ?? o.failureModes ?? "",
      revenueModel: o.revenueModel,
      monetizationNotes: o.monetizationNotes,
      riskNotes: o.riskNotes,
      profitFactors: o.profitFactors,
      status: "published",
    };
    const opp = await db.opportunity.upsert({
      where: { slug: o.slug },
      update: common,
      create: { slug: o.slug, ...common },
    });

    // Reset child rows for idempotency
    await db.opportunitySkill.deleteMany({ where: { opportunityId: opp.id } });
    await db.opportunityInterest.deleteMany({ where: { opportunityId: opp.id } });
    await db.opportunityTool.deleteMany({ where: { opportunityId: opp.id } });
    await db.opportunityStep.deleteMany({ where: { opportunityId: opp.id } });
    await db.opportunityExample.deleteMany({ where: { opportunityId: opp.id } });

    await db.opportunitySkill.createMany({
      data: [
        ...o.required.map((s) => ({ opportunityId: opp.id, skillId: skillIds.get(s)!, weight: "required" })),
        ...o.helpful.map((s) => ({ opportunityId: opp.id, skillId: skillIds.get(s)!, weight: "helpful" })),
      ],
    });
    await db.opportunityInterest.createMany({
      data: o.interests.map((s) => ({ opportunityId: opp.id, interestId: interestIds.get(s)! })),
    });
    await db.opportunityTool.createMany({
      data: o.tools.map((t) => ({ opportunityId: opp.id, name: t.name, note: t.note })),
    });
    await db.opportunityStep.createMany({
      data: o.steps.map((s, idx) => ({
        opportunityId: opp.id,
        sortOrder: idx,
        title: s.title,
        detail: s.detail,
        phaseLabel: s.phase,
      })),
    });
    await db.opportunityExample.createMany({
      data: o.examples.map((e) => ({ opportunityId: opp.id, title: e.title, detail: e.detail })),
    });
  }

  for (const f of FEATURE_FLAGS) {
    await db.featureFlag.upsert({
      where: { key: f.key },
      update: { description: f.description },
      create: f,
    });
  }

  console.log(
    `Seeded ${CATEGORIES.length} categories, ${SKILLS.length} skills, ${INTERESTS.length} interests, ${OPPS.length} opportunities, ${FEATURE_FLAGS.length} feature flags.`,
  );
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
