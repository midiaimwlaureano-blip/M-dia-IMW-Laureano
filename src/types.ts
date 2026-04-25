export type UserRole = 'LIDER_I' | 'LIDER_II' | 'VOLUNTARIO';
export type EventType = 'CULTO' | 'ENSAIO' | 'REUNIAO';
export type CheckInStatus = 'PRESENTE' | 'AUSENTE' | 'ATRASADO';
export type EventStatus = 'AGENDADO' | 'CONCLUIDO';

export interface Announcement {
  id: string;
  title: string;
  date: string;
  time: string;
  description: string;
  pdfUrl?: string;
  createdAt: string;
}

export interface User {
  uid: string;
  displayName: string;
  email: string;
  role: UserRole;
  status?: 'pending' | 'approved';
  specialty?: string;
  color?: string; // legacy
  bg_color?: string;
  initials?: string;
  profile_emoji?: string;
  createdAt: string;
  photoURL?: string;
  birthDate?: string;
  phone?: string;
  maxScalesPerMonth?: number;
  availableDays?: number[]; // 0 for Sunday, 1 for Monday, etc.
  fcmToken?: string;
  fcmTokens?: string[];
  pushEnabled?: boolean;
}

export interface ChurchEvent {
  id: string;
  title: string;
  date: string; // ISO Date String
  description: string;
  type: EventType;
  createdBy: string;
  createdAt: string;
  isRecurring?: boolean;
  recurrenceId?: string;
  frequency?: 'WEEKLY' | 'MONTHLY';
  daysOfWeek?: number[];
  status?: EventStatus;
}

export interface Setlist {
  id: string;
  title: string;
  content: string;
  updatedBy: string;
  updatedAt: string;
}

export interface Cronograma {
  id: string;
  title: string;
  content: string;
  pdfUrl?: string;
  externalLink?: string;
  updatedBy: string;
  updatedAt: string;
}

export interface Assignment {
  userId: string;
  roles: string[];
}

export interface Scale {
  id: string;
  eventId: string;
  assignments: Assignment[];
  isTemplate?: boolean;
}

export interface CheckIn {
  id: string;
  eventId: string;
  userId: string;
  status: CheckInStatus;
  timestamp: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface Reaction {
  id: string;
  targetId: string; // eventId or scaleId
  userId: string;
  emoji: string;
  timestamp: string;
}
