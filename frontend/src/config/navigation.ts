import { Home, Users, Shield, QrCode, Rocket, Award, Terminal, Sparkles, Bell, FileCode2, Compass, Building2 } from 'lucide-react';
import React from 'react';

export interface NavItem {
  id: string;
  label: string;
  mobileLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const ALL_NAV_ITEMS: Record<string, NavItem> = {
  'hackathons': {
    id: 'hackathons',
    label: 'Arenas',
    mobileLabel: 'Explore',
    description: 'Explore and participate in apex hackathon arenas',
    icon: Compass
  },
  'org-portal': {
    id: 'org-portal',
    label: 'Host & Org',
    mobileLabel: 'Host',
    description: 'Host, register organization and manage arenas',
    icon: Building2
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
