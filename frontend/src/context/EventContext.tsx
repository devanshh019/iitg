import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../api/client';

export interface EventFormatConfig {
  organization?: string;
  prize_pool?: string;
  venue_type?: string;
  mode?: string;
  tags?: string[];
  hero_badge?: string;
  [key: string]: any;
}

export interface EventItem {
  id: string;
  slug: string;
  title: string;
  description?: string;
  format_type: string;
  status: string;
  format_config: EventFormatConfig;
  starts_at?: string;
  ends_at?: string;
  submission_deadline?: string;
  grace_period_minutes: number;
  is_submissions_locked: boolean;
  is_teams_locked: boolean;
  created_at: string;
}

interface EventContextType {
  currentEvent: EventItem | null;
  events: EventItem[];
  isLoading: boolean;
  selectEvent: (event: EventItem) => void;
  participateInEvent: (eventId: string) => Promise<any>;
  refreshEvents: () => Promise<void>;
}

const EventContext = createContext<EventContextType | undefined>(undefined);

export const EventProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [currentEvent, setCurrentEvent] = useState<EventItem | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchEvents = async () => {
    try {
      setIsLoading(true);
      const list = await apiFetch<EventItem[]>('/events');
      setEvents(list || []);

      // Restore stored event slug or default to first ongoing or first event
      const storedSlug = localStorage.getItem('whycode4u_active_event_slug');
      if (storedSlug && list && list.length > 0) {
        const found = list.find(e => e.slug === storedSlug);
        if (found) {
          setCurrentEvent(found);
          return;
        }
      }

      // Default to ongoing or first
      if (list && list.length > 0) {
        const liveEvent = list.find(e => e.status === 'ongoing') || list[0];
        setCurrentEvent(liveEvent);
        localStorage.setItem('whycode4u_active_event_slug', liveEvent.slug);
      }
    } catch (err) {
      console.error('Failed to load events', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const selectEvent = (event: EventItem) => {
    setCurrentEvent(event);
    localStorage.setItem('whycode4u_active_event_slug', event.slug);
  };

  const participateInEvent = async (eventId: string) => {
    const res = await apiFetch<any>(`/events/${eventId}/participate`, {
      method: 'POST'
    });
    // Set active event if matched
    const target = events.find(e => e.id === eventId);
    if (target) {
      selectEvent(target);
    }
    return res;
  };

  return (
    <EventContext.Provider
      value={{
        currentEvent,
        events,
        isLoading,
        selectEvent,
        participateInEvent,
        refreshEvents: fetchEvents
      }}
    >
      {children}
    </EventContext.Provider>
  );
};

export const useEvent = () => {
  const ctx = useContext(EventContext);
  if (!ctx) {
    throw new Error('useEvent must be used within an EventProvider');
  }
  return ctx;
};
