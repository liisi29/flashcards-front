export type Color = 'red' | 'yellow' | 'green' | null;

export interface CardSide {
  text: string;
  text2: string;
  photo: string;
}

export interface Card {
  _id: string;
  owner: string;
  viewers: string[];
  subjectId: string;
  topicId?: string;
  progress: Record<string, Color>;
  s1: CardSide;
  s2: CardSide;
}

export interface Subject {
  _id: string;
  label: string;
  parentId: string | null;
}

export interface Session {
  name: string;
  subjectId: string;
  topicId: string;
  viewers: string[];
}

export const USERS = ['Tahti', 'Hele', 'Saara', 'Liisi'] as const;
export type UserName = (typeof USERS)[number];
