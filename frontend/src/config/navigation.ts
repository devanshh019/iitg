import { Home, Users, Shield, QrCode, Rocket, Award, Terminal, Sparkles, Bell, FileCode2 } from 'lucide-react';
import React from 'react';

export interface NavItem {
  id: string;
  label: string;
  mobileLabel: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const ALL_NAV_ITEMS: Record<string, NavItem> = {
  'crew-portal': {
    id: 'crew-portal',
    label: 'Home & Pass',
    mobileLabel: 'Home',
    description: 'Event status and digital QR passes',
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
