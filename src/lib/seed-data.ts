import type { EquipmentAddon, Listing } from "./fabrication";

export const workTypes = [
  "Assembly",
  "Packing",
  "Repair",
  "Light fabrication",
  "Metal fabrication",
  "Welding",
  "Grinding",
  "Woodworking",
  "Furniture work",
  "Signage work",
  "Electronics",
  "3D printing",
  "Laser cutting",
  "CNC work",
  "Storage + work area",
  "Spray painting, approval-only",
  "Chemical work, approval-only"
] as const;

export const humanServiceAddonSlugs = ["forklift-assistance", "operator-assistance", "cleaning-service"] as const;

export const seedEquipmentAddons: EquipmentAddon[] = [
  { slug: "hand-tools", name: "Hand tools", pricePerBooking: 15, category: "Tools" },
  { slug: "workbench", name: "Workbench", pricePerBooking: 10, category: "Workspace" },
  { slug: "lockable-cabinet", name: "Lockable cabinet", pricePerBooking: 25, category: "Storage" },
  { slug: "power-tools", name: "Power tools", pricePerBooking: 45, category: "Tools" },
  { slug: "grinder", name: "Grinder", pricePerBooking: 40, category: "Hot work" },
  { slug: "drill", name: "Drill", pricePerBooking: 20, category: "Tools" },
  { slug: "welding-set", name: "Welding set", pricePerBooking: 120, category: "Hot work" },
  { slug: "compressor", name: "Compressor", pricePerBooking: 55, category: "Tools" },
  { slug: "3d-printer", name: "3D printer", pricePerBooking: 75, category: "Machines" },
  { slug: "laser-cutter", name: "Laser cutter", pricePerBooking: 130, category: "Machines" },
  { slug: "cnc-machine", name: "CNC machine", pricePerBooking: 180, category: "Machines" },
  { slug: "material-storage", name: "Material storage", pricePerBooking: 60, category: "Storage" }
];

export const commonSafetyRules = [
  "PPE required",
  "No hot work unless approved",
  "No welding unless approved",
  "No spray painting unless approved",
  "No chemical work unless approved",
  "No overnight sleeping",
  "No illegal storage",
  "No blocking access",
  "User responsible for damage",
  "Waste must be cleared",
  "Check-in/out photos required"
];

export const seedListings: Listing[] = [
  {
    slug: "maker-bench-kallang",
    title: "45 sqft workbench with lockable tool cabinet",
    address: "Kallang Industrial Estate, Singapore",
    location: "Kallang",
    sizeSqft: 45,
    spaceType: "MAKER_BENCH",
    zoning: "B1",
    status: "APPROVED",
    accessHours: "8am-8pm daily",
    powerType: "SINGLE_PHASE",
    loadingAccess: ["ground floor", "lorry access"],
    equipmentSlugs: ["hand-tools", "workbench", "lockable-cabinet", "3d-printer"],
    includedAmenities: ["Shared wash-up sink", "Wi-Fi", "Task lighting", "Waste bins"],
    permittedWork: ["Assembly", "Packing", "Repair", "Electronics", "3D printing", "Storage + work area"],
    prohibitedWork: ["Welding", "Grinding", "Spray painting, approval-only", "Chemical work, approval-only"],
    safetyRules: commonSafetyRules,
    cancellationPolicy: "Cancel 24 hours before check-in for a 70% refund.",
    photoUrls: ["/assets/maker-bench.png"],
    floorPlanUrl: "/assets/floor-plan-maker-bench.png",
    prices: {
      day: 45,
      sevenDays: 280,
      thirtyDays: 650,
      sixtyDays: 1200
    },
    deposit: {
      standard: 200,
      highRiskExtra: 0
    },
    cleaningFee: 35
  },
  {
    slug: "small-bay-eunos",
    title: "135 sqft fabrication workspace near loading ramp",
    address: "Eunos Techpark, Singapore",
    location: "Eunos",
    sizeSqft: 135,
    spaceType: "SMALL_BAY",
    zoning: "B1",
    status: "APPROVED",
    accessHours: "7am-10pm daily",
    powerType: "SINGLE_PHASE",
    loadingAccess: ["ramp", "lorry access"],
    equipmentSlugs: ["hand-tools", "workbench", "power-tools", "drill", "material-storage"],
    includedAmenities: ["Dedicated bench", "Shared pallet area", "240V outlets", "CCTV common areas"],
    permittedWork: ["Assembly", "Packing", "Repair", "Light fabrication", "Electronics", "Storage + work area"],
    prohibitedWork: ["Welding", "Grinding", "Spray painting, approval-only", "Chemical work, approval-only"],
    safetyRules: commonSafetyRules,
    cancellationPolicy: "Cancel 72 hours before check-in for a 70% refund.",
    photoUrls: ["/assets/small-bay.png"],
    floorPlanUrl: "/assets/floor-plan-small-bay.png",
    prices: {
      day: 120,
      sevenDays: 720,
      thirtyDays: 1500,
      sixtyDays: 2850
    },
    deposit: {
      standard: 650,
      highRiskExtra: 0
    },
    cleaningFee: 100
  },
  {
    slug: "medium-bay-woodlands",
    title: "320 sqft B2 project workspace with cargo lift",
    address: "Woodlands Industrial Xchange, Singapore",
    location: "Woodlands",
    sizeSqft: 320,
    spaceType: "MEDIUM_BAY",
    zoning: "B2",
    status: "APPROVED",
    accessHours: "24-hour access with host approval",
    powerType: "THREE_PHASE",
    loadingAccess: ["cargo lift", "forklift", "lorry access"],
    equipmentSlugs: [
      "workbench",
      "power-tools",
      "grinder",
      "compressor",
      "cnc-machine",
      "material-storage"
    ],
    includedAmenities: ["Three-phase isolator", "Shared compressor line", "Pallet staging", "Fire extinguishers"],
    permittedWork: [
      "Assembly",
      "Light fabrication",
      "Metal fabrication",
      "Grinding",
      "Woodworking",
      "Furniture work",
      "Signage work",
      "CNC work",
      "Storage + work area"
    ],
    prohibitedWork: ["Spray painting, approval-only", "Chemical work, approval-only"],
    safetyRules: commonSafetyRules,
    cancellationPolicy: "Cancel 7 days before check-in for a 60% refund.",
    photoUrls: ["/assets/medium-bay.png"],
    floorPlanUrl: "/assets/floor-plan-medium-bay.png",
    prices: {
      day: 260,
      sevenDays: 1500,
      thirtyDays: 3400,
      sixtyDays: 5600
    },
    deposit: {
      standard: 1600,
      highRiskExtra: 700
    },
    cleaningFee: 300
  },
  {
    slug: "large-bay-tuas",
    title: "850 sqft Tuas B2 workspace with forklift and lorry access",
    address: "Tuas Avenue, Singapore",
    location: "Tuas",
    sizeSqft: 850,
    spaceType: "LARGE_BAY",
    zoning: "B2",
    status: "APPROVED",
    accessHours: "24-hour project access with induction",
    powerType: "THREE_PHASE",
    loadingAccess: ["ground floor", "forklift", "lorry access"],
    equipmentSlugs: [
      "workbench",
      "power-tools",
      "grinder",
      "welding-set",
      "compressor",
      "material-storage"
    ],
    includedAmenities: ["Ground-floor loading", "Three-phase power", "Marked work zone", "Spill kit", "Fire point"],
    permittedWork: [
      "Assembly",
      "Metal fabrication",
      "Welding",
      "Grinding",
      "Woodworking",
      "Furniture work",
      "Signage work",
      "Storage + work area"
    ],
    prohibitedWork: ["Spray painting, approval-only", "Chemical work, approval-only"],
    safetyRules: commonSafetyRules,
    cancellationPolicy: "Cancel 14 days before check-in for a 50% refund.",
    photoUrls: ["/assets/large-bay.png"],
    floorPlanUrl: "/assets/floor-plan-large-bay.png",
    prices: {
      day: 650,
      sevenDays: 3800,
      thirtyDays: 7800,
      sixtyDays: 14200
    },
    deposit: {
      standard: 3800,
      highRiskExtra: 1200
    },
    cleaningFee: 650
  }
];
