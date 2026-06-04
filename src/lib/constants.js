// Activity definitions with default targets
export const ACTIVITIES = [
  {
    id: 'online_validation',
    name: 'Online Validation Test',
    icon: '🖥️',
    fields: [
      { key: 'eligible_personnel', label: 'Eligible Personnel', type: 'number' },
      { key: 'completed_today', label: 'Completed Today', type: 'number' },
      { key: 'pending', label: 'Pending', type: 'number', computed: true },
    ],
    targets: [
      { key: 'completed_today', label: 'Tests Completed', defaultValue: 767 }
    ],
    achievementKey: 'completed_today',
    editableTarget: false,
  },
  {
    id: 'sdrf_training',
    name: 'SDRF Training',
    icon: '🛡️',
    fields: [
      { key: 'personnel_trained', label: 'Personnel Trained Today', type: 'number' },
      { key: 'mandays', label: 'Mandays Generated', type: 'number' },
    ],
    targets: [
      { key: 'personnel_trained', label: 'Personnel', defaultValue: 200 },
      { key: 'mandays', label: 'Mandays', defaultValue: 5000 },
    ],
    achievementKey: 'personnel_trained',
    editableTarget: false,
  },
  {
    id: 'inter_agency',
    name: 'Inter Agency Training',
    icon: '🤝',
    fields: [
      { key: 'personnel_trained', label: 'Personnel Trained Today', type: 'number' },
      { key: 'mandays', label: 'Mandays Generated', type: 'number' },
    ],
    targets: [
      { key: 'personnel_trained', label: 'Personnel', defaultValue: 550 },
      { key: 'mandays', label: 'Mandays', defaultValue: 1700 },
    ],
    achievementKey: 'personnel_trained',
    editableTarget: false,
  },
  {
    id: 'cap',
    name: 'Community Awareness Programme (CAP)',
    icon: '👥',
    fields: [
      { key: 'programmes_conducted', label: 'Programmes Conducted', type: 'number' },
      { key: 'participants_covered', label: 'Participants Covered', type: 'number' },
    ],
    targets: [
      { key: 'programmes_conducted', label: 'Programmes', defaultValue: 200 }
    ],
    achievementKey: 'programmes_conducted',
    editableTarget: false,
  },
  {
    id: 'ssp',
    name: 'School Safety Programme (SSP)',
    icon: '🏫',
    fields: [
      { key: 'programmes_conducted', label: 'Programmes Conducted', type: 'number' },
      { key: 'participants_covered', label: 'Participants Covered', type: 'number' },
    ],
    targets: [
      { key: 'programmes_conducted', label: 'Programmes', defaultValue: 200 }
    ],
    achievementKey: 'programmes_conducted',
    editableTarget: false,
  },
  {
    id: 'cyber_crime',
    name: 'Cyber Crime Awareness Programme',
    icon: '🔐',
    fields: [
      { key: 'programmes_conducted', label: 'Programmes Conducted', type: 'number' },
      { key: 'participants_covered', label: 'Participants Covered', type: 'number' },
    ],
    targets: [
      { key: 'programmes_conducted', label: 'Programmes', defaultValue: 10 }
    ],
    achievementKey: 'programmes_conducted',
    editableTarget: true,
  },
  {
    id: 'boatmen_training',
    name: 'Boatmen Training',
    icon: '⛵',
    fields: [
      { key: 'personnel_trained', label: 'Personnel Trained', type: 'number' },
    ],
    targets: [
      { key: 'personnel_trained', label: 'Personnel', defaultValue: 350 }
    ],
    achievementKey: 'personnel_trained',
    editableTarget: false,
  },
  {
    id: 'railway_disaster',
    name: 'Railway Disaster Team Availability',
    icon: '🚂',
    fields: [
      { key: 'available', label: 'Available', type: 'boolean' },
      { key: 'qualified_personnel', label: 'Qualified Personnel Available', type: 'number' },
    ],
    targets: [
      { key: 'qualified_personnel', label: 'Qualified Personnel', defaultValue: 30 }
    ],
    achievementKey: 'qualified_personnel',
    editableTarget: false,
  },
  {
    id: 'railway_mock',
    name: 'Railway Joint Mock Exercise',
    icon: '🏋️',
    fields: [
      { key: 'conducted', label: 'Conducted', type: 'boolean' },
    ],
    targets: [
      { key: 'conducted', label: 'Exercises', defaultValue: 8 }
    ],
    achievementKey: 'conducted',
    editableTarget: false,
    isMockExercise: true,
  },
  {
    id: 'district_mock',
    name: 'District Mock Exercise',
    icon: '🏙️',
    fields: [
      { key: 'conducted', label: 'Conducted', type: 'boolean' },
    ],
    targets: [
      { key: 'conducted', label: 'Exercises', defaultValue: 14 }
    ],
    achievementKey: 'conducted',
    editableTarget: false,
    isMockExercise: true,
  },
  {
    id: 'ropeway_mock',
    name: 'Ropeway Mock Exercise',
    icon: '🏔️',
    fields: [
      { key: 'conducted', label: 'Conducted', type: 'boolean' },
    ],
    targets: [
      { key: 'conducted', label: 'Exercises', defaultValue: 4 }
    ],
    achievementKey: 'conducted',
    editableTarget: false,
    isMockExercise: true,
  },
  {
    id: 'innovations',
    name: 'Innovations',
    icon: '💡',
    fields: [
      { key: 'innovation_title', label: 'Innovation Title', type: 'text' },
      { key: 'count', label: 'Count', type: 'number' },
    ],
    targets: [
      { key: 'count', label: 'Innovations', defaultValue: 2 }
    ],
    achievementKey: 'count',
    editableTarget: false,
  },
  {
    id: 'igot',
    name: 'iGOT Platform',
    icon: '📱',
    fields: [
      { key: 'registered_personnel', label: 'Registered Personnel', type: 'number' },
      { key: 'courses_completed', label: 'Courses Completed', type: 'number' },
    ],
    targets: [
      { key: 'registered_personnel', label: 'Registrations (100%)', defaultValue: 100 }
    ],
    achievementKey: 'registered_personnel',
    editableTarget: false,
    isPercentage: true,
  },
  {
    id: 'ncc_training',
    name: 'NCC Training',
    icon: '🎖️',
    fields: [
      { key: 'personnel_trained', label: 'Personnel Trained', type: 'number' },
    ],
    targets: [
      { key: 'personnel_trained', label: 'Personnel', defaultValue: 24 }
    ],
    achievementKey: 'personnel_trained',
    editableTarget: false,
  },
  {
    id: 'nss_training',
    name: 'NSS Training',
    icon: '🎗️',
    fields: [
      { key: 'personnel_trained', label: 'Personnel Trained', type: 'number' },
    ],
    targets: [
      { key: 'personnel_trained', label: 'Personnel', defaultValue: 24 }
    ],
    achievementKey: 'personnel_trained',
    editableTarget: false,
  },
  {
    id: 'bfrc',
    name: 'BFRC Status',
    icon: '📋',
    fields: [
      { key: 'completed', label: 'Completed', type: 'number' },
      { key: 'pending', label: 'Pending', type: 'number' },
      { key: 'undergoing', label: 'Undergoing', type: 'number' },
      { key: 'exempted', label: 'Exempted', type: 'number' },
    ],
    targets: [
      { key: 'completed', label: 'Completed', defaultValue: 100 }
    ],
    achievementKey: 'completed',
    editableTarget: true,
  },
]

export const FINANCIAL_YEARS = ['2024-2025', '2025-2026', '2026-2027']

export const MONTHS = [
  'April', 'May', 'June', 'July', 'August', 'September',
  'October', 'November', 'December', 'January', 'February', 'March'
]
