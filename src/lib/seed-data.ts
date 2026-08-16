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
  "Chemical work, approval-only",
  "Others"
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

export const sampleWorkshopPhotos = [
  {
    src: "/assets/sample-workshop-photo-bench.png",
    label: "Bench workspace",
    detail: "Compact bench layout with hand tools, task lighting, and lockable storage."
  },
  {
    src: "/assets/sample-workshop-photo-small-bay.png",
    label: "Small fabrication bay",
    detail: "Short-project bay with workbench, staging area, and single-phase power."
  },
  {
    src: "/assets/sample-workshop-photo-medium-bay.png",
    label: "Medium project bay",
    detail: "Open workshop floor with machine access, storage racks, and stronger power."
  },
  {
    src: "/assets/sample-workshop-photo-large-bay.png",
    label: "Large industrial bay",
    detail: "Wide loading-friendly workspace for bigger fabrication and assembly jobs."
  }
] as const;

export const dummyListingSlugs = [
  "maker-bench-kallang",
  "small-bay-eunos",
  "medium-bay-woodlands",
  "large-bay-tuas",
  "electronics-bench-ubi",
  "woodworking-bay-bedok",
  "signage-bay-jurong",
  "ecommerce-packing-changi",
  "metalwork-bay-bukit-batok",
  "project-hall-tuas-west"
] as const;

export const dummyListingImages: Record<(typeof dummyListingSlugs)[number], string> = {
  "maker-bench-kallang": "/assets/sample-workshop-photo-bench.png",
  "small-bay-eunos": "/assets/sample-workshop-photo-small-bay.png",
  "medium-bay-woodlands": "/assets/sample-workshop-photo-medium-bay.png",
  "large-bay-tuas": "/assets/sample-workshop-photo-large-bay.png",
  "electronics-bench-ubi": "/assets/maker-bench.png",
  "woodworking-bay-bedok": "/assets/medium-bay.png",
  "signage-bay-jurong": "/assets/large-bay.png",
  "ecommerce-packing-changi": "/assets/small-bay.png",
  "metalwork-bay-bukit-batok": "/assets/spaceoncall-fabrication-bay.webp",
  "project-hall-tuas-west": "/assets/spaceoncall-warehouse.webp"
};

export function isDummyListingSlug(slug: string): boolean {
  return dummyListingSlugs.includes(slug as (typeof dummyListingSlugs)[number]);
}

export function getDummyListingImage(slug: string): string | null {
  return isDummyListingSlug(slug) ? dummyListingImages[slug as (typeof dummyListingSlugs)[number]] : null;
}

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
    photoUrls: [sampleWorkshopPhotos[1].src],
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
    title: "320 sqft project workspace with cargo lift",
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
    title: "850 sqft Tuas workspace with forklift and lorry access",
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
  },
  {
    slug: "electronics-bench-ubi",
    title: "95 sqft electronics bench with storage cabinet",
    address: "Ubi Techpark, Singapore",
    location: "Ubi",
    sizeSqft: 95,
    spaceType: "SMALL_BAY",
    zoning: "B1",
    status: "APPROVED",
    accessHours: "9am-9pm daily",
    powerType: "SINGLE_PHASE",
    loadingAccess: ["cargo lift", "lorry access"],
    equipmentSlugs: ["hand-tools", "workbench", "lockable-cabinet", "drill", "3d-printer"],
    includedAmenities: ["ESD-safe bench option", "Shared test table", "Wi-Fi", "Label printer access"],
    permittedWork: ["Assembly", "Repair", "Electronics", "3D printing", "Packing"],
    prohibitedWork: ["Welding", "Grinding", "Spray painting, approval-only", "Chemical work, approval-only"],
    safetyRules: commonSafetyRules,
    cancellationPolicy: "Cancel 24 hours before check-in for a 70% refund.",
    photoUrls: [sampleWorkshopPhotos[0].src],
    floorPlanUrl: "/assets/floor-plan-maker-bench.png",
    prices: {
      day: 70,
      sevenDays: 420,
      thirtyDays: 900,
      sixtyDays: 1650
    },
    deposit: {
      standard: 250,
      highRiskExtra: 0
    },
    cleaningFee: 60
  },
  {
    slug: "woodworking-bay-bedok",
    title: "520 sqft woodworking and furniture project bay",
    address: "Bedok Industrial Park E, Singapore",
    location: "Bedok",
    sizeSqft: 520,
    spaceType: "LARGE_BAY",
    zoning: "B2",
    status: "APPROVED",
    accessHours: "8am-10pm daily with host induction",
    powerType: "THREE_PHASE",
    loadingAccess: ["ramp", "cargo lift", "lorry access"],
    equipmentSlugs: ["workbench", "power-tools", "drill", "compressor", "material-storage"],
    includedAmenities: ["Dust extraction point", "Assembly tables", "Material rack", "Shared wash-up bay"],
    permittedWork: ["Assembly", "Woodworking", "Furniture work", "Light fabrication", "Storage + work area"],
    prohibitedWork: ["Welding", "Spray painting, approval-only", "Chemical work, approval-only"],
    safetyRules: commonSafetyRules,
    cancellationPolicy: "Cancel 7 days before check-in for a 60% refund.",
    photoUrls: [sampleWorkshopPhotos[2].src],
    floorPlanUrl: "/assets/floor-plan-medium-bay.png",
    prices: {
      day: 380,
      sevenDays: 2200,
      thirtyDays: 5200,
      sixtyDays: 9600
    },
    deposit: {
      standard: 2200,
      highRiskExtra: 500
    },
    cleaningFee: 420
  },
  {
    slug: "signage-bay-jurong",
    title: "740 sqft signage bay with laser cutter access",
    address: "Jurong Innovation District, Singapore",
    location: "Jurong",
    sizeSqft: 740,
    spaceType: "LARGE_BAY",
    zoning: "B2",
    status: "APPROVED",
    accessHours: "7am-11pm daily",
    powerType: "THREE_PHASE",
    loadingAccess: ["ground floor", "lorry access"],
    equipmentSlugs: ["workbench", "power-tools", "laser-cutter", "drill", "material-storage"],
    includedAmenities: ["Flat-pack staging zone", "Wall-mounted power reels", "Shared packing bench", "Fire extinguishers"],
    permittedWork: ["Assembly", "Signage work", "Laser cutting", "Light fabrication", "Packing", "Storage + work area"],
    prohibitedWork: ["Welding", "Spray painting, approval-only", "Chemical work, approval-only"],
    safetyRules: commonSafetyRules,
    cancellationPolicy: "Cancel 7 days before check-in for a 60% refund.",
    photoUrls: [sampleWorkshopPhotos[3].src],
    floorPlanUrl: "/assets/floor-plan-large-bay.png",
    prices: {
      day: 430,
      sevenDays: 2500,
      thirtyDays: 6200,
      sixtyDays: 11200
    },
    deposit: {
      standard: 2600,
      highRiskExtra: 600
    },
    cleaningFee: 500
  },
  {
    slug: "ecommerce-packing-changi",
    title: "1,800 sqft packing and project staging workspace",
    address: "Changi South Logistics Hub, Singapore",
    location: "Changi",
    sizeSqft: 1800,
    spaceType: "LARGE_BAY",
    zoning: "B1",
    status: "APPROVED",
    accessHours: "6am-10pm daily",
    powerType: "SINGLE_PHASE",
    loadingAccess: ["ground floor", "ramp", "lorry access"],
    equipmentSlugs: ["workbench", "lockable-cabinet", "material-storage", "hand-tools"],
    includedAmenities: ["Packing tables", "Pallet staging", "Barcode desk", "Shared waste collection"],
    permittedWork: ["Assembly", "Packing", "Repair", "Light fabrication", "Storage + work area"],
    prohibitedWork: ["Metal fabrication", "Welding", "Grinding", "Spray painting, approval-only", "Chemical work, approval-only"],
    safetyRules: commonSafetyRules,
    cancellationPolicy: "Cancel 7 days before check-in for a 65% refund.",
    photoUrls: ["/assets/small-bay.png"],
    floorPlanUrl: "/assets/floor-plan-large-bay.png",
    prices: {
      day: 520,
      sevenDays: 3100,
      thirtyDays: 7600,
      sixtyDays: 14000
    },
    deposit: {
      standard: 3000,
      highRiskExtra: 0
    },
    cleaningFee: 520
  },
  {
    slug: "metalwork-bay-bukit-batok",
    title: "3,200 sqft metalwork bay with three-phase power",
    address: "Bukit Batok Industrial Park A, Singapore",
    location: "Bukit Batok",
    sizeSqft: 3200,
    spaceType: "LARGE_BAY",
    zoning: "B2",
    status: "APPROVED",
    accessHours: "24-hour project access with host approval",
    powerType: "THREE_PHASE",
    loadingAccess: ["ground floor", "forklift", "lorry access"],
    equipmentSlugs: ["workbench", "power-tools", "grinder", "welding-set", "compressor", "material-storage"],
    includedAmenities: ["Marked hot-work zone", "Three-phase isolator", "Pallet staging", "Spill kit", "Fire point"],
    permittedWork: ["Assembly", "Metal fabrication", "Welding", "Grinding", "CNC work", "Storage + work area"],
    prohibitedWork: ["Spray painting, approval-only", "Chemical work, approval-only"],
    safetyRules: commonSafetyRules,
    cancellationPolicy: "Cancel 14 days before check-in for a 50% refund.",
    photoUrls: ["/assets/spaceoncall-fabrication-bay.webp"],
    floorPlanUrl: "/assets/floor-plan-large-bay.png",
    prices: {
      day: 760,
      sevenDays: 4500,
      thirtyDays: 11800,
      sixtyDays: 21800
    },
    deposit: {
      standard: 4200,
      highRiskExtra: 1600
    },
    cleaningFee: 850
  },
  {
    slug: "project-hall-tuas-west",
    title: "9,200 sqft Tuas project hall with lorry access",
    address: "Tuas West Road, Singapore",
    location: "Tuas West",
    sizeSqft: 9200,
    spaceType: "LARGE_BAY",
    zoning: "B2",
    status: "APPROVED",
    accessHours: "24-hour access by approved project schedule",
    powerType: "THREE_PHASE",
    loadingAccess: ["ground floor", "forklift", "lorry access"],
    equipmentSlugs: ["workbench", "power-tools", "compressor", "material-storage", "drill"],
    includedAmenities: ["Wide turning access", "Project office corner", "Marked work zones", "Fire point", "Shared wash bay"],
    permittedWork: ["Assembly", "Metal fabrication", "Woodworking", "Furniture work", "Signage work", "Storage + work area"],
    prohibitedWork: ["Spray painting, approval-only", "Chemical work, approval-only"],
    safetyRules: commonSafetyRules,
    cancellationPolicy: "Cancel 14 days before check-in for a 50% refund.",
    photoUrls: ["/assets/spaceoncall-warehouse.webp"],
    floorPlanUrl: "/assets/floor-plan-large-bay.png",
    prices: {
      day: 980,
      sevenDays: 5900,
      thirtyDays: 16800,
      sixtyDays: 31800
    },
    deposit: {
      standard: 5000,
      highRiskExtra: 1800
    },
    cleaningFee: 1200
  }
];
