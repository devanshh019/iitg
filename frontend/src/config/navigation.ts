import {
  Home, Users, Shield, QrCode, Rocket, Award, Terminal,
  Sparkles, Bell, FileCode2, Compass, Building2, Sliders,
  History, Layers, CheckCircle2
} from 'lucide-react';
import React from 'react';

export interface NavItem {
  id: string;
  label: string;
  mobileLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

// PARTICIPANT (HACKER) NAVIGATION ITEMS ONLY
export const HACKER_NAV_ITEMS: Record<string, NavItem> = {
  'hackathons': {
    id: 'hackathons',
    label: 'Arenas',
    mobileLabel: 'Arenas',
    description: 'Explore and participate in apex hackathon arenas',
    icon: Compass
  },
  'crew-portal': {
    id: 'crew-portal',
    label: 'Registered',
    mobileLabel: 'Registered',
    description: 'Registered status and digital pass',
    icon: Home
  },
  'squads': {
    id: 'squads',
    label: 'My Team',
    mobileLabel: 'Team',
    description: 'Create or join a team with invite code',
    icon: Users
  },
  'problems': {
    id: 'problems',
    label: 'Problem Statements',
    mobileLabel: 'PS Track',
    description: 'Select problem statement, rules and countdown',
    icon: FileCode2
  },
  'launch': {
    id: 'launch',
    label: 'Submit Project',
    mobileLabel: 'Submit',
    description: 'Stage-wise submission before strict deadline',
    icon: Rocket
  },
  'announcements': {
    id: 'announcements',
    label: 'Announcements',
    mobileLabel: 'Updates',
    description: 'Real-time hackathon notification center',
    icon: Bell
  },
  'passport': {
    id: 'passport',
    label: 'Food & Perks',
    mobileLabel: 'Perks',
    description: 'Meal tokens, accommodations and mentor help',
    icon: Sparkles
  }
};

// ORGANIZER NAVIGATION ITEMS ONLY (NO PARTICIPANT ACTIONS)
export const ORGANIZER_NAV_ITEMS: Record<string, NavItem> = {
  'org-overview': {
    id: 'org-overview',
    label: 'Hosted Arenas',
    mobileLabel: 'Arenas',
    description: 'Overview of all hosted hackathons, organizations, and stats',
    icon: Building2
  },
  'org-command': {
    id: 'org-command',
    label: 'Command Center',
    mobileLabel: 'Command',
    description: 'Gate QR scanner, dossiers, squad penalties & judge desk',
    icon: Sliders
  },
  'org-problems': {
    id: 'org-problems',
    label: 'Problem Statements',
    mobileLabel: 'Tracks',
    description: 'Curate, unseal and schedule problem statements & rubrics',
    icon: FileCode2
  },
  'org-announcements': {
    id: 'org-announcements',
    label: 'Broadcast Alerts',
    mobileLabel: 'Broadcast',
    description: 'Publish high-priority alerts and live updates to hackers',
    icon: Bell
  },
  'org-audit': {
    id: 'org-audit',
    label: 'Audit Vault',
    mobileLabel: 'Audit',
    description: 'Cryptographic SHA-256 ledger integrity and action feed',
    icon: History
  }
};

// Combined dictionary for lookup
export const ALL_NAV_ITEMS: Record<string, NavItem> = {
  ...HACKER_NAV_ITEMS,
  ...ORGANIZER_NAV_ITEMS,
  // Legacy alias
  'org-portal': ORGANIZER_NAV_ITEMS['org-overview']
};
